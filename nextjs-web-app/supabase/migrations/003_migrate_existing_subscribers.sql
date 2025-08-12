-- Migration to handle existing subscribers transition to token system
-- This migration provides tokens to existing Pro subscribers based on their subscription status

-- Function to migrate existing Pro subscribers to token system
CREATE OR REPLACE FUNCTION migrate_existing_subscribers()
RETURNS void AS $$
DECLARE
  subscriber_record RECORD;
  tokens_to_grant INTEGER;
BEGIN
  -- Loop through all active Pro subscribers
  FOR subscriber_record IN 
    SELECT up.id, up.email, up.subscription_status, up.subscription_plan, s.current_period_end
    FROM user_profiles up
    LEFT JOIN subscriptions s ON up.id = s.user_id AND s.status = 'active'
    WHERE up.subscription_plan = 'pro' AND up.subscription_status = 'active'
  LOOP
    -- Calculate tokens based on remaining subscription time
    -- Pro subscribers get tokens equivalent to their remaining subscription value
    -- Assuming Pro subscription is $20/month and tokens are roughly $0.10 each (average)
    -- This gives them 200 tokens per month remaining
    
    IF subscriber_record.current_period_end IS NOT NULL THEN
      -- Calculate days remaining in current period
      tokens_to_grant := GREATEST(
        200, -- Minimum 200 tokens (1 month equivalent)
        LEAST(
          1000, -- Maximum 1000 tokens (5 months equivalent)
          200 * CEIL(EXTRACT(DAYS FROM (subscriber_record.current_period_end::timestamp - NOW())) / 30.0)
        )
      );
    ELSE
      -- If no subscription end date, give them 200 tokens (1 month equivalent)
      tokens_to_grant := 200;
    END IF;

    -- Add tokens to user balance
    PERFORM add_tokens_to_user(subscriber_record.id, tokens_to_grant);
    
    -- Log the migration
    INSERT INTO usage_tracking (user_id, action_type, metadata)
    VALUES (
      subscriber_record.id,
      'generation',
      jsonb_build_object(
        'migration_type', 'subscriber_to_tokens',
        'tokens_granted', tokens_to_grant,
        'original_plan', subscriber_record.subscription_plan,
        'original_status', subscriber_record.subscription_status,
        'migration_date', NOW()
      )
    );

    RAISE NOTICE 'Migrated user % (%): granted % tokens', 
      subscriber_record.id, subscriber_record.email, tokens_to_grant;
  END LOOP;

  -- Update all Pro subscribers to free plan but keep their subscription status for reference
  -- This allows them to still access Stripe customer portal if needed
  UPDATE user_profiles 
  SET subscription_plan = 'free'
  WHERE subscription_plan = 'pro';

  RAISE NOTICE 'Migration completed. All Pro subscribers have been migrated to token system.';
END;
$$ LANGUAGE plpgsql;

-- Function to handle graceful subscription cancellation for migrated users
CREATE OR REPLACE FUNCTION cancel_migrated_subscriptions()
RETURNS void AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  -- This function should be called after confirming all users are happy with their token allocation
  -- It will cancel their Stripe subscriptions to prevent future billing
  
  FOR subscription_record IN 
    SELECT s.stripe_subscription_id, up.email
    FROM subscriptions s
    JOIN user_profiles up ON s.user_id = up.id
    WHERE s.status = 'active' AND up.subscription_plan = 'free' -- Migrated users
  LOOP
    -- Log the cancellation intent
    INSERT INTO usage_tracking (user_id, action_type, metadata)
    SELECT up.id, 'generation', jsonb_build_object(
      'migration_type', 'subscription_cancellation_scheduled',
      'stripe_subscription_id', subscription_record.stripe_subscription_id,
      'cancellation_date', NOW()
    )
    FROM user_profiles up
    JOIN subscriptions s ON up.id = s.user_id
    WHERE s.stripe_subscription_id = subscription_record.stripe_subscription_id;

    RAISE NOTICE 'Scheduled cancellation for subscription % (user: %)', 
      subscription_record.stripe_subscription_id, subscription_record.email;
  END LOOP;

  RAISE NOTICE 'Subscription cancellations scheduled. Use Stripe dashboard or API to actually cancel subscriptions.';
END;
$$ LANGUAGE plpgsql;

-- Create a view to track migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT 
  up.id,
  up.email,
  up.subscription_plan,
  up.subscription_status,
  up.token_balance,
  s.stripe_subscription_id,
  s.status as stripe_status,
  s.current_period_end,
  CASE 
    WHEN up.subscription_plan = 'free' AND up.token_balance > 0 AND s.status = 'active' THEN 'migrated'
    WHEN up.subscription_plan = 'pro' AND up.subscription_status = 'active' THEN 'pending_migration'
    WHEN up.subscription_plan = 'free' AND up.token_balance = 0 THEN 'free_user'
    ELSE 'unknown'
  END as migration_status
FROM user_profiles up
LEFT JOIN subscriptions s ON up.id = s.user_id AND s.status = 'active';

-- Grant permissions
GRANT SELECT ON migration_status TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION migrate_existing_subscribers() IS 'Migrates existing Pro subscribers to token system by granting tokens based on remaining subscription time';
COMMENT ON FUNCTION cancel_migrated_subscriptions() IS 'Schedules cancellation of Stripe subscriptions for users who have been migrated to tokens';
COMMENT ON VIEW migration_status IS 'Shows the migration status of all users from subscription to token system';

-- Instructions for running the migration:
-- 1. First, run: SELECT migrate_existing_subscribers();
-- 2. Verify results with: SELECT * FROM migration_status WHERE migration_status = 'migrated';
-- 3. Communicate with users about the change
-- 4. After user confirmation, optionally run: SELECT cancel_migrated_subscriptions();
-- 5. Use Stripe dashboard to actually cancel the subscriptions if desired
