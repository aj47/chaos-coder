# Credits System Setup

This document provides instructions on how to set up the credits system with Stripe integration.

## Database Setup

1. Log in to your Supabase dashboard and navigate to the SQL Editor.
2. Run the following SQL to update the `profiles` table:

```sql
ALTER TABLE profiles
ADD COLUMN credits INTEGER DEFAULT 0,
ADD COLUMN subscription_tier TEXT DEFAULT 'free',
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT;
```

3. Create the `subscription_plans` table:

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL NOT NULL,
  credits_per_month INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, description, price, credits_per_month, stripe_price_id)
VALUES 
  ('Free', 'Basic access with limited features', 0, 25, ''),
  ('Pro', 'Advanced features with more credits', 19.99, 100, ''),
  ('Ultra', 'Premium access with unlimited features', 49.99, 500, '');
```

4. Create the `credit_transactions` table:

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX credit_transactions_user_id_idx ON credit_transactions(user_id);
```

## Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com) if you don't have one.
2. In the Stripe Dashboard, navigate to Products and create two products:
   - Pro Plan: $19.99/month
   - Ultra Plan: $49.99/month
3. For each product, create a recurring price and note the Price IDs.
4. In the Developers section, get your API keys (Publishable Key and Secret Key).
5. Set up a webhook endpoint in Stripe:
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
6. Note the Webhook Signing Secret.

## Environment Variables

1. Copy the `.env.local.example` file to `.env.local`:
   ```
   cp .env.local.example .env.local
   ```
2. Fill in the Stripe environment variables:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Your webhook signing secret
   - `STRIPE_PRO_PRICE_ID`: The price ID for the Pro plan
   - `STRIPE_ULTRA_PRICE_ID`: The price ID for the Ultra plan
   - `NEXT_PUBLIC_APP_URL`: Your application URL (e.g., http://localhost:3000 for development)

## Testing the Integration

1. Start your development server:
   ```
   npm run dev
   ```
2. Navigate to the dashboard page and try to upgrade to a paid plan.
3. Use Stripe test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
4. For testing webhooks locally, use the Stripe CLI:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

## Usage in Your Application

To check if a user has enough credits before performing an action:

```typescript
import { deductCredits } from '@/services/stripe';

// In your API route or server component
const result = await deductCredits(userId, 1, 'Used for generation');

if (!result.success) {
  // Handle insufficient credits
  return {
    error: 'Not enough credits. Please upgrade your plan.'
  };
}

// Proceed with the action
// ...
```

## Monitoring and Management

- Monitor credit usage in the Supabase dashboard by querying the `credit_transactions` table.
- Monitor Stripe subscriptions in the Stripe Dashboard.
- You can add an admin panel to manage user credits and subscriptions if needed. 