-- Migration to clean up schema issues as per recommendations
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