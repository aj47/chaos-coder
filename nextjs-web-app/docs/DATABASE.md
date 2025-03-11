# Database Schema Documentation

## Overview

This document outlines the database schema for the Chaos Coder application. The application uses Supabase (PostgreSQL) for data storage and authentication.

## Tables

### `auth.users` (Managed by Supabase Auth)

This table is automatically managed by Supabase Auth and contains user authentication information.

Key fields:
- `id` (UUID, Primary Key)
- `email` (TEXT)
- `email_verified` (BOOLEAN)
- `raw_user_meta_data` (JSONB)
- `created_at` (TIMESTAMP)

### `profiles`

User profiles table that extends the auth.users table with application-specific data.

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  credits INTEGER DEFAULT 30
);
```

#### Columns
- `id`: UUID (Primary Key)
  - References `auth.users(id)`
  - Automatically created when a user signs up
  - Cascading delete with auth.users
- `stripe_customer_id`: TEXT
  - Nullable
  - Stores the Stripe customer ID for payment processing
  - Created during the first checkout process
- `credits`: INTEGER
  - Default: 30
  - Stores the user's available credits for AI generations

#### Relationships
- One-to-one relationship with `auth.users` through the `id` foreign key

#### Access Patterns
1. Get user profile:
   ```sql
   SELECT * FROM profiles WHERE id = :user_id;
   ```

2. Update credits:
   ```sql
   UPDATE profiles SET credits = credits + :amount WHERE id = :user_id;
   ```

3. Update Stripe customer:
   ```sql
   UPDATE profiles SET stripe_customer_id = :customer_id WHERE id = :user_id;
   ```

## Security

### Row Level Security (RLS)

The profiles table has RLS enabled to ensure users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Only service role can insert profiles
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

## Migrations

The schema is managed through SQL migrations in the `db/migrations` directory. The latest schema update (`20240311_simplify_profiles.sql`) simplified the profiles table to its essential columns.

## Usage Examples

### Creating a Profile

```typescript
const { data, error } = await supabase
  .from('profiles')
  .insert([{ id: user.id }])
  .single();
```

### Updating Credits

```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({ credits: credits + amount })
  .eq('id', user.id)
  .single();
```

### Getting User Profile with Stripe Info

```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('stripe_customer_id, credits')
  .eq('id', user.id)
  .single();
```

## Notes

1. The schema is intentionally minimal to reduce complexity and improve maintainability
2. Stripe subscription status is managed by Stripe, not stored in the database
3. User metadata (name, avatar, etc.) is stored in auth.users, not duplicated in profiles
4. Credits are managed locally for faster access and updates 