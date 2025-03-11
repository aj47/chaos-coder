-- Migration to remove first_name column and document all tables

-- 1. Remove first_name column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS first_name;

-- 2. Update handle_new_user function to not reference first_name
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    subscription_tier,
    credits,
    max_monthly_credits,
    last_credited_at
  )
  VALUES (
    NEW.id,
    'free'::subscription_tier_type,
    30,
    30,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Documentation of current schema:

/* 
==== DATABASE SCHEMA DOCUMENTATION ====

1. profiles
   - Purpose: Stores user profile information with subscription and credit data
   - Schema:
     * id (UUID): Primary key, linked to auth.users
     * credits (INTEGER): Current credit balance for user
     * max_monthly_credits (INTEGER): Monthly credit limit based on subscription tier
     * stripe_customer_id (TEXT): Stripe customer reference
     * stripe_subscription_id (TEXT): Stripe subscription reference
     * subscription_period_start (TIMESTAMP): Start of current subscription period
     * subscription_period_end (TIMESTAMP): End of current subscription period
     * last_credited_at (TIMESTAMP): When credits were last refreshed
     * subscription_tier (ENUM): 'free', 'pro', or 'ultra'
     * subscription_status (ENUM): Status from Stripe (active, past_due, etc.)
     * updated_at (TIMESTAMP): Last update timestamp

2. subscription_history
   - Purpose: Tracks changes to user subscriptions
   - Schema:
     * id (UUID): Primary key
     * user_id (UUID): Reference to auth.users
     * subscription_tier (TEXT): Tier of subscription
     * status (TEXT): Status of subscription
     * amount_paid (DECIMAL): Amount paid
     * currency (TEXT): Currency of payment
     * stripe_subscription_id (TEXT): Stripe subscription reference
     * stripe_customer_id (TEXT): Stripe customer reference
     * description (TEXT): Additional details
     * created_at (TIMESTAMP): When record was created

3. credit_purchases
   - Purpose: Records one-time credit purchases
   - Schema:
     * id (UUID): Primary key
     * user_id (UUID): Reference to auth.users
     * amount (INTEGER): Number of credits purchased
     * cost (DECIMAL): Amount paid
     * currency (TEXT): Currency of payment
     * stripe_session_id (TEXT): Stripe checkout session ID
     * stripe_payment_intent_id (TEXT): Stripe payment intent ID
     * created_at (TIMESTAMP): When purchase was made

4. credit_history
   - Purpose: Audit trail of all credit transactions
   - Schema:
     * id (UUID): Primary key
     * user_id (UUID): Reference to auth.users
     * amount (INTEGER): Number of credits added/removed
     * type (TEXT): Transaction type (purchase, usage, reset, etc.)
     * description (TEXT): Additional details
     * created_at (TIMESTAMP): When transaction occurred

5. credit_reset_logs
   - Purpose: Logs when the credit reset function runs
   - Schema:
     * id (UUID): Primary key
     * executed_at (TIMESTAMP): When reset was executed
     * success (BOOLEAN): Whether reset was successful
     * error_message (TEXT): Any error details if failed
*/ 