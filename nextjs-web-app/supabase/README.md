# Supabase Configuration

This directory contains the configuration files for Supabase, including database migrations and seed data.

## Database Schema

The database schema includes the following tables:

### Profiles

The `profiles` table stores user profile information and is linked to the Supabase Auth users table.

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

## Row Level Security (RLS)

Row Level Security is enabled on all tables to ensure that users can only access their own data.

## Migrations

The `migrations` directory contains SQL files that define the database schema and are applied in order based on their timestamp prefix.

To apply migrations manually:

1. Connect to your Supabase project
2. Go to the SQL Editor
3. Copy and paste the contents of the migration file
4. Run the SQL commands

## Automatic Profile Creation

When a new user signs up, a trigger automatically creates a profile record for them, using the `first_name` from their user metadata.

## Local Development

For local development with Supabase:

1. Install the Supabase CLI: `npm install -g supabase`
2. Start a local Supabase instance: `supabase start`
3. Apply migrations: `supabase db reset`
4. Connect your application to the local instance

## Environment Variables

Make sure to set the following environment variables in your `.env` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For local development, these will be provided by the Supabase CLI when you run `supabase start`. 