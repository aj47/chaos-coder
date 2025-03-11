-- Update the initialize_user_credits function to use last_credit_refresh instead of last_credited_at
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
    
  -- Set the last credit refresh time
  IF NEW.last_credit_refresh IS NULL THEN
    NEW.last_credit_refresh := NOW();
  END IF;
    
  RETURN NEW;
END;
$$;

-- Make sure the trigger is correctly set up
DROP TRIGGER IF EXISTS initialize_user_credits_trigger ON profiles;
CREATE TRIGGER initialize_user_credits_trigger
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_user_credits(); 