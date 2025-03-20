-- SUPABASE SECURITY VULNERABILITY ANALYSIS AND FIXES
-- Date: CURRENT_DATE

-- ====================================
-- BACKUP OF CURRENT PROFILES TABLE RLS
-- ====================================

-- Current RLS Policies on the profiles table:
/*
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "Users can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "Users can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  }
*/

-- ====================================
-- VULNERABILITY ANALYSIS
-- ====================================

/*
CRITICAL VULNERABILITY: Unrestricted Credits Self-Modification

The current RLS policy "Users can update own profile" allows authenticated users to update ANY field
in their profile, including the 'credits' field. This means users can set their credit balance to
any value they want, bypassing payment requirements and the credit management system.

SPECIFIC ISSUES:

1. The "Users can update own profile" policy allows users to directly modify their own credits
   without any restrictions or validations.

2. There is no 'USING' clause on the UPDATE policy to restrict which fields users can update.

3. Credits should ONLY be modified through secure stored procedures like 'add_user_credits',
   'deduct_user_credits', and 'reset_daily_credits', not through direct updates.

4. There is no Service Role policy to manage all profiles, which would be needed for admin functions.

RISK LEVEL: CRITICAL
*/

-- ====================================
-- SECURITY FIXES
-- ====================================

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

-- 5. Add additional security layer by adding a trigger to prevent direct credits updates
CREATE OR REPLACE FUNCTION prevent_direct_credits_update()
RETURNS TRIGGER AS $$
BEGIN
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an audit log table to track unauthorized attempts
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_direct_credits_update_trigger ON public.profiles;

-- Create the trigger
CREATE TRIGGER prevent_direct_credits_update_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_direct_credits_update();

-- 6. Ensure proper permissions are granted for the profiles table
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (id) ON public.profiles TO authenticated; -- Only id can be explicitly updated by users
GRANT ALL ON public.profiles TO service_role;

-- ====================================
-- ADD CLIENT-SIDE VALIDATION
-- ====================================

-- Note to Developer: Ensure that all credit-related operations in the application code use 
-- the secure database functions (add_user_credits, deduct_user_credits) ONLY, and never 
-- perform direct updates to the credits field. Review all client-side code for compliance.

-- ====================================
-- VERIFICATION QUERY
-- ====================================

-- Run this after implementation to verify policies:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles'; 