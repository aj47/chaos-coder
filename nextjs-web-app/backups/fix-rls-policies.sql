-- Fix RLS policies for profiles table to prevent credit manipulation
-- This script addresses a critical security vulnerability where users could directly modify their credit balances

-- NOTE: EXECUTE THIS SCRIPT USING A SERVICE ROLE ACCOUNT

-- Backup profiles table schema and data (optional - run manually before applying fixes)
-- CREATE TABLE public.profiles_backup AS SELECT * FROM public.profiles;

-- ============================================
-- FIX ROW LEVEL SECURITY FOR PROFILES TABLE
-- ============================================

-- 1. Drop the existing vulnerable UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Create a more restrictive UPDATE policy that excludes sensitive fields
CREATE POLICY "Users can update own non-sensitive profile fields" 
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND 
           -- Explicitly prevent modification of sensitive fields
           -- by checking if the new values match the old values
           credits = (SELECT credits FROM public.profiles WHERE id = auth.uid()) AND
           subscription_tier = (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()) AND
           subscription_status = (SELECT subscription_status FROM public.profiles WHERE id = auth.uid()) AND
           max_monthly_credits = (SELECT max_monthly_credits FROM public.profiles WHERE id = auth.uid()) AND
           stripe_customer_id = (SELECT stripe_customer_id FROM public.profiles WHERE id = auth.uid()) AND
           stripe_subscription_id = (SELECT stripe_subscription_id FROM public.profiles WHERE id = auth.uid()) AND
           subscription_period_start = (SELECT subscription_period_start FROM public.profiles WHERE id = auth.uid()) AND
           subscription_period_end = (SELECT subscription_period_end FROM public.profiles WHERE id = auth.uid()) AND
           last_credit_refresh = (SELECT last_credit_refresh FROM public.profiles WHERE id = auth.uid()) AND
           last_credited_at = (SELECT last_credited_at FROM public.profiles WHERE id = auth.uid())
           );

-- 3. Create a Service Role policy to allow admins to manage all profiles
CREATE POLICY "Service role can manage all profiles" 
ON public.profiles
USING (auth.role() = 'service_role');

-- 4. Add an INSERT policy for the service role
CREATE POLICY "Service role can insert profiles" 
ON public.profiles
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- ============================================
-- CREATE AUDIT LOG TABLE FOR SECURITY TRACKING
-- ============================================

-- Create an audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log only visible to service role
CREATE POLICY "Service role can view audit log" 
ON public.audit_log
FOR SELECT
TO service_role
USING (true);

-- Allow service role to manage the audit log
CREATE POLICY "Service role can manage audit log" 
ON public.audit_log
FOR ALL
TO service_role
USING (true);

-- ============================================
-- IMPROVE SECURITY OF CREDIT MANAGEMENT FUNCTIONS
-- ============================================

-- Update add_user_credits function to enforce stricter rules on where credits can be added from
-- while allowing the service role unrestricted access
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
  v_is_service_role BOOLEAN;
BEGIN
  -- Check if the caller is a service role
  v_is_service_role := (SELECT auth.role() = 'service_role');
  
  -- Check if the amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;
  
  -- SECURITY: Only allow specific types of credit additions
  -- Skip this check if the caller is a service role
  IF NOT v_is_service_role AND p_type NOT IN ('purchase', 'subscription', 'daily_reset', 'monthly_reset', 'admin_adjustment') THEN
    RAISE EXCEPTION 'Invalid credit addition type: %. Credits can only be added via authorized channels.', p_type;
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
  VALUES (p_user_id, p_amount, CASE WHEN v_is_service_role AND p_type NOT IN ('purchase', 'subscription', 'daily_reset', 'monthly_reset', 'admin_adjustment') THEN 'admin_adjustment' ELSE p_type END, 
          CASE WHEN v_is_service_role AND p_description IS NULL THEN 'Service role credit adjustment' ELSE p_description END);
  
  RETURN v_new_credits;
END;
$$;

-- ============================================
-- TRIGGER TO PREVENT DIRECT CREDITS UPDATES
-- ============================================

-- Create a trigger function to prevent direct credit updates
-- but allow service role to make changes
CREATE OR REPLACE FUNCTION prevent_direct_credits_update()
RETURNS TRIGGER AS $$
DECLARE
    v_is_service_role BOOLEAN;
BEGIN
    -- Check if the caller is a service role
    v_is_service_role := (SELECT auth.role() = 'service_role');
    
    -- Skip all checks if the caller is a service role
    IF v_is_service_role THEN
        RETURN NEW;
    END IF;
    
    -- If credits are being updated directly (not through our functions)
    IF OLD.credits IS DISTINCT FROM NEW.credits AND 
       pg_trigger_depth() <= 1 -- Only check for direct updates, not those triggered by our stored procedures
    THEN
        -- Reset to old value if someone tries to bypass RLS
        NEW.credits := OLD.credits;
        
        -- Log the attempt
        INSERT INTO audit_log (event_type, user_id, details) 
        VALUES ('unauthorized_credits_update', auth.uid(), 
                format('Attempted to update credits from %s to %s', OLD.credits, NEW.credits));
                
        RAISE WARNING 'Unauthorized attempt to update credits detected and prevented. This incident has been logged.';
    END IF;
    
    -- Prevent modification of subscription tier directly
    IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier AND 
       pg_trigger_depth() <= 1
    THEN
        NEW.subscription_tier := OLD.subscription_tier;
        
        INSERT INTO audit_log (event_type, user_id, details) 
        VALUES ('unauthorized_subscription_update', auth.uid(), 
                format('Attempted to change subscription tier from %s to %s', OLD.subscription_tier, NEW.subscription_tier));
                
        RAISE WARNING 'Unauthorized attempt to update subscription tier detected and prevented. This incident has been logged.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_direct_credits_update_trigger ON public.profiles;

-- Create the trigger
CREATE TRIGGER prevent_direct_credits_update_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_direct_credits_update();

-- ============================================
-- UPDATE PERMISSIONS
-- ============================================

-- Revoke all permissions and reapply correctly
REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Apply appropriate privileges
GRANT ALL ON public.profiles TO service_role;

-- Ensure credit_history table has proper permissions
GRANT SELECT ON public.credit_history TO authenticated;
GRANT SELECT, INSERT ON public.credit_history TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify RLS policies after applying fixes
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check for any unauthorized attempt to modify credits
-- SELECT * FROM audit_log WHERE event_type = 'unauthorized_credits_update' ORDER BY created_at DESC;

-- ============================================
-- CREATE DOCUMENTATION REFERENCE
-- ============================================

-- Add a comment to remind about credit system documentation
DO $$
BEGIN
    RAISE NOTICE 'IMPORTANT: The credit system rules and restrictions are documented in nextjs-web-app/docs/CREDIT_SYSTEM.md';
    RAISE NOTICE 'Security fixes have been applied successfully.';
END $$;

-- Update deduct_user_credits function to allow service role to bypass restrictions
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
  v_is_service_role BOOLEAN;
BEGIN
  -- Check if the caller is a service role
  v_is_service_role := (SELECT auth.role() = 'service_role');
  
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
  -- Skip this check if the caller is a service role
  IF NOT v_is_service_role AND v_current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- For service role, if current credits are less than amount,
  -- set new_credits to 0 to prevent negative values
  IF v_is_service_role AND v_current_credits < p_amount THEN
    v_new_credits := 0;
  ELSE
    -- Regular case - subtract the amount
    v_new_credits := v_current_credits - p_amount;
  END IF;
  
  UPDATE profiles
  SET credits = v_new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record the credit change in history
  INSERT INTO credit_history (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 
          CASE WHEN v_is_service_role THEN 'admin_deduction' ELSE 'usage' END,
          CASE WHEN v_is_service_role AND p_description IS NULL THEN 'Service role credit deduction' ELSE p_description END);
  
  RETURN v_new_credits;
END;
$$;

-- Add a dedicated function for admin credit adjustments
CREATE OR REPLACE FUNCTION admin_adjust_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Admin credit adjustment'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
  v_is_service_role BOOLEAN;
BEGIN
  -- This function can only be called by service role
  v_is_service_role := (SELECT auth.role() = 'service_role');
  
  IF NOT v_is_service_role THEN
    RAISE EXCEPTION 'This function can only be called by administrators';
  END IF;
  
  -- Get the current credits
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id;
  
  -- If no profile exists, raise an exception
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Calculate new credits (can be negative or positive adjustment)
  v_new_credits := v_current_credits + p_amount;
  
  -- Ensure credits don't go negative
  IF v_new_credits < 0 THEN
    v_new_credits := 0;
  END IF;
  
  -- Update the credits
  UPDATE profiles
  SET credits = v_new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record the credit change in history
  INSERT INTO credit_history (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'admin_adjustment', p_description);
  
  RETURN v_new_credits;
END;
$$;

-- Grant permission to execute the admin function
GRANT EXECUTE ON FUNCTION admin_adjust_credits TO service_role; 