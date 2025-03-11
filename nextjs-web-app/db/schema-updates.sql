-- Comprehensive schema updates for auth and payment systems
-- This script updates the database schema to better support the overhauled auth and payment systems

-- Ensure we have the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================
-- PROFILES TABLE ENHANCEMENTS
-- ==============================

-- Add subscription-related columns to profiles table if they don't exist
DO $$
BEGIN
    -- Update stripe_customer_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    -- Create enum type for subscription tiers if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier_type') THEN
        CREATE TYPE subscription_tier_type AS ENUM ('free', 'pro', 'ultra');
    END IF;
    
    -- Update subscription_tier to use the enum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier' AND data_type != 'USER-DEFINED') THEN
        -- Convert any existing values to lowercase for consistency
        UPDATE public.profiles 
        SET subscription_tier = LOWER(subscription_tier)
        WHERE subscription_tier IS NOT NULL;
        
        -- Create a temp column with the new type
        ALTER TABLE public.profiles ADD COLUMN subscription_tier_new subscription_tier_type DEFAULT 'free'::subscription_tier_type;
        
        -- Copy data from old to new
        UPDATE public.profiles 
        SET subscription_tier_new = 
            CASE 
                WHEN LOWER(subscription_tier) = 'pro' THEN 'pro'::subscription_tier_type
                WHEN LOWER(subscription_tier) = 'ultra' THEN 'ultra'::subscription_tier_type
                ELSE 'free'::subscription_tier_type
            END
        WHERE 1=1; -- Ensure WHERE clause exists
        
        -- Drop old column and rename new one
        ALTER TABLE public.profiles DROP COLUMN subscription_tier;
        ALTER TABLE public.profiles RENAME COLUMN subscription_tier_new TO subscription_tier;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_tier subscription_tier_type DEFAULT 'free'::subscription_tier_type;
    END IF;
    
    -- Create enum type for subscription status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_type') THEN
        CREATE TYPE subscription_status_type AS ENUM ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid');
    END IF;
    
    -- Update subscription_status to use the enum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status' AND data_type != 'USER-DEFINED') THEN
        -- Create a temp column with the new type
        ALTER TABLE public.profiles ADD COLUMN subscription_status_new subscription_status_type;
        
        -- Copy data from old to new with validation
        UPDATE public.profiles 
        SET subscription_status_new = 
            CASE LOWER(subscription_status)
                WHEN 'active' THEN 'active'::subscription_status_type
                WHEN 'past_due' THEN 'past_due'::subscription_status_type
                WHEN 'canceled' THEN 'canceled'::subscription_status_type
                WHEN 'incomplete' THEN 'incomplete'::subscription_status_type
                WHEN 'incomplete_expired' THEN 'incomplete_expired'::subscription_status_type
                WHEN 'trialing' THEN 'trialing'::subscription_status_type
                WHEN 'unpaid' THEN 'unpaid'::subscription_status_type
                ELSE NULL
            END
        WHERE subscription_status IS NOT NULL;
        
        -- Drop old column and rename new one
        ALTER TABLE public.profiles DROP COLUMN subscription_status;
        ALTER TABLE public.profiles RENAME COLUMN subscription_status_new TO subscription_status;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status subscription_status_type;
    END IF;
    
    -- Add max_monthly_credits column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_monthly_credits') THEN
        ALTER TABLE public.profiles ADD COLUMN max_monthly_credits INTEGER;
    END IF;
    
    -- Set default max_monthly_credits based on subscription tier
    UPDATE public.profiles 
    SET max_monthly_credits = 
        CASE CAST(subscription_tier AS TEXT)
            WHEN 'ultra' THEN 1000
            WHEN 'pro' THEN 100
            ELSE 30
        END
    WHERE max_monthly_credits IS NULL;
    
    -- Make max_monthly_credits NOT NULL with default value
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_monthly_credits') THEN
        ALTER TABLE public.profiles ALTER COLUMN max_monthly_credits SET DEFAULT 30;
        
        -- First ensure no NULL values
        UPDATE public.profiles SET max_monthly_credits = 30 WHERE max_monthly_credits IS NULL;
        
        -- Now set NOT NULL constraint
        ALTER TABLE public.profiles ALTER COLUMN max_monthly_credits SET NOT NULL;
    END IF;
    
    -- Add subscription period columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_period_start') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_period_start TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_period_end') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_period_end TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add last_credited_at column to track when daily/monthly credits were last reset
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_credited_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_credited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add stripe subscription ID column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
    END IF;
    
    -- Ensure 'credits' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'credits') THEN
        ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 30 NOT NULL;
    END IF;
END
$$;

-- ==============================
-- CREDIT PURCHASES TABLE
-- ==============================

-- Create credit_purchases table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT cost_positive CHECK (cost > 0)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS credit_purchases_user_id_idx ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS credit_purchases_created_at_idx ON public.credit_purchases(created_at);
CREATE INDEX IF NOT EXISTS credit_purchases_stripe_session_id_idx ON public.credit_purchases(stripe_session_id);

-- Set up RLS (Row Level Security)
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own credit purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "Service role can manage all credit purchases" ON public.credit_purchases;

-- Create policies
CREATE POLICY "Users can view own credit purchases" 
ON public.credit_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all credit purchases" 
ON public.credit_purchases
USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;

-- ==============================
-- SUBSCRIPTION HISTORY TABLE
-- ==============================

-- Create subscription_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_paid DECIMAL(10, 2),
  currency TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS subscription_history_user_id_idx ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS subscription_history_created_at_idx ON public.subscription_history(created_at);
CREATE INDEX IF NOT EXISTS subscription_history_stripe_subscription_id_idx ON public.subscription_history(stripe_subscription_id);

-- Set up Row Level Security (RLS)
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Service role can manage all subscription history" ON public.subscription_history;

-- Create policies
CREATE POLICY "Users can view own subscription history" 
ON public.subscription_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscription history" 
ON public.subscription_history
USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.subscription_history TO authenticated;
GRANT ALL ON public.subscription_history TO service_role;

-- ==============================
-- CREDIT HISTORY TABLE
-- ==============================

-- Create credit_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'purchase', 'usage', 'monthly_reset', 'daily_reset', 'refund', 'admin_adjustment'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS credit_history_user_id_idx ON public.credit_history(user_id);
CREATE INDEX IF NOT EXISTS credit_history_created_at_idx ON public.credit_history(created_at);
CREATE INDEX IF NOT EXISTS credit_history_type_idx ON public.credit_history(type);

-- Set up Row Level Security (RLS)
ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own credit history" ON public.credit_history;
DROP POLICY IF EXISTS "Service role can manage all credit history" ON public.credit_history;

-- Create policies
CREATE POLICY "Users can view own credit history" 
ON public.credit_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all credit history" 
ON public.credit_history
USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.credit_history TO authenticated;
GRANT ALL ON public.credit_history TO service_role;

-- ==============================
-- STORED PROCEDURES
-- ==============================

-- Function to add credits to a user
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- Check if the amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;
  
  -- Get the current credits
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id;
  
  -- If no profile exists, raise an exception
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Update credits
  v_new_credits := v_current_credits + p_amount;
  
  UPDATE profiles
  SET credits = v_new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record the credit change in history
  INSERT INTO credit_history (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);
  
  RETURN v_new_credits;
END;
$$;

-- Function to deduct credits from a user
CREATE OR REPLACE FUNCTION deduct_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- Check if the amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;
  
  -- Get the current credits
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id;
  
  -- If no profile exists, raise an exception
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Check if the user has enough credits
  IF v_current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Update credits
  v_new_credits := v_current_credits - p_amount;
  
  UPDATE profiles
  SET credits = v_new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record the credit change in history
  INSERT INTO credit_history (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'usage', p_description);
  
  RETURN v_new_credits;
END;
$$;

-- Function to reset daily credits
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Find users who haven't been credited in 24 hours
  FOR v_user IN
    SELECT id, max_monthly_credits, subscription_tier
    FROM profiles
    WHERE last_credited_at IS NULL OR last_credited_at < NOW() - INTERVAL '24 hours'
  LOOP
    -- Determine daily credit amount based on subscription tier
    DECLARE
      v_credit_amount INTEGER;
    BEGIN
      CASE CAST(v_user.subscription_tier AS TEXT)
        WHEN 'ultra' THEN v_credit_amount := 1000;
        WHEN 'pro' THEN v_credit_amount := 100;
        ELSE v_credit_amount := 30;
      END CASE;
      
      -- Reset to the daily amount
      UPDATE profiles
      SET credits = v_credit_amount,
          last_credited_at = NOW(),
          updated_at = NOW()
      WHERE id = v_user.id;
      
      -- Record the reset in history
      INSERT INTO credit_history (user_id, amount, type, description)
      VALUES (v_user.id, v_credit_amount, 'daily_reset', 'Daily credit reset');
    END;
  END LOOP;
END;
$$;

-- Create a trigger to initialize credits on profile creation
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set default credits based on subscription tier
  IF NEW.credits IS NULL THEN
    NEW.credits := 
      CASE CAST(NEW.subscription_tier AS TEXT)
        WHEN 'ultra' THEN 1000
        WHEN 'pro' THEN 100
        ELSE 30
      END;
  END IF;
    
  -- Set the last credited time
  IF NEW.last_credited_at IS NULL THEN
    NEW.last_credited_at := NOW();
  END IF;
    
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS initialize_user_credits_trigger ON profiles;
CREATE TRIGGER initialize_user_credits_trigger
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_user_credits(); -- Migration to clean up schema issues as per recommendations
-- 1. Consolidate timestamp fields
-- 2. Remove max_daily_credits and max_monthly_credits fields
-- 3. Update credit reset function for consistency
-- 4. Ensure proper credit history tracking

-- ==============================
-- 1. CONSOLIDATE TIMESTAMP FIELDS
-- ==============================

-- We'll standardize on last_credit_refresh and remove last_credited_at
DO $$
BEGIN
  -- First transfer data from last_credited_at to last_credit_refresh if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'last_credited_at'
  ) THEN
    -- Update last_credit_refresh with data from last_credited_at where applicable
    UPDATE public.profiles
    SET last_credit_refresh = last_credited_at
    WHERE last_credit_refresh IS NULL AND last_credited_at IS NOT NULL;
    
    -- Now drop the duplicate column
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_credited_at;
  END IF;
  
  -- Ensure last_credit_refresh exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'last_credit_refresh'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_credit_refresh TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END
$$;

-- ==============================
-- 2. REMOVE MAX CREDITS FIELDS
-- ==============================

-- Remove max_daily_credits and max_monthly_credits as they're not needed
ALTER TABLE public.profiles DROP COLUMN IF EXISTS max_daily_credits;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS max_monthly_credits;

-- ==============================
-- 3. UPDATE CREDIT RESET FUNCTION
-- ==============================

-- Update the reset_daily_credits function to be consistent with our schema changes
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void AS $$
DECLARE
  reset_count INTEGER := 0;
BEGIN
  -- Update credits for free tier users
  UPDATE public.profiles
  SET 
    credits = 30,
    last_credit_refresh = now()
  WHERE 
    subscription_tier = 'free' 
    AND (credits < 30 OR last_credit_refresh < now() - INTERVAL '24 hours')
  RETURNING 1 INTO reset_count;
  
  -- Update credits for pro tier users
  UPDATE public.profiles
  SET 
    credits = 100,
    last_credit_refresh = now()
  WHERE 
    subscription_tier = 'pro' 
    AND (credits < 100 OR last_credit_refresh < now() - INTERVAL '24 hours');
  
  -- Update credits for ultra tier users
  UPDATE public.profiles
  SET 
    credits = 1000,
    last_credit_refresh = now()
  WHERE 
    subscription_tier = 'ultra' 
    AND (credits < 1000 OR last_credit_refresh < now() - INTERVAL '24 hours');
  
  -- Log the reset
  INSERT INTO public.credit_reset_logs (executed_at, success)
  VALUES (now(), true);
  
  -- Also record the credit changes in credit_history for audit trail
  -- Free tier
  INSERT INTO public.credit_history (
    user_id, 
    amount, 
    type, 
    description
  )
  SELECT 
    id, 
    30, 
    'daily_reset', 
    'Daily credit reset for free tier'
  FROM 
    public.profiles
  WHERE 
    subscription_tier = 'free' 
    AND (credits < 30 OR last_credit_refresh < now() - INTERVAL '24 hours');
  
  -- Pro tier
  INSERT INTO public.credit_history (
    user_id, 
    amount, 
    type, 
    description
  )
  SELECT 
    id, 
    100, 
    'daily_reset', 
    'Daily credit reset for pro tier'
  FROM 
    public.profiles
  WHERE 
    subscription_tier = 'pro' 
    AND (credits < 100 OR last_credit_refresh < now() - INTERVAL '24 hours');
  
  -- Ultra tier
  INSERT INTO public.credit_history (
    user_id, 
    amount, 
    type, 
    description
  )
  SELECT 
    id, 
    1000, 
    'daily_reset', 
    'Daily credit reset for ultra tier'
  FROM 
    public.profiles
  WHERE 
    subscription_tier = 'ultra' 
    AND (credits < 1000 OR last_credit_refresh < now() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 