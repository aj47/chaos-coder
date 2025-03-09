-- Create a function to reset user credits daily according to their plan
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void AS $$
BEGIN
  -- Update credits for free tier users
  UPDATE public.profiles
  SET credits = 5
  WHERE subscription_tier = 'free' AND credits < 5;
  
  -- Update credits for pro tier users
  UPDATE public.profiles
  SET credits = 25
  WHERE subscription_tier = 'pro' AND credits < 25;
  
  -- Update credits for ultra tier users
  UPDATE public.profiles
  SET credits = 200
  WHERE subscription_tier = 'ultra' AND credits < 200;
  
  -- Update last_credit_refresh timestamp if the column exists
  BEGIN
    UPDATE public.profiles
    SET last_credit_refresh = now();
    EXCEPTION WHEN undefined_column THEN
      -- Column doesn't exist yet, will be added in another migration
      NULL;
  END;
  
  -- Check if the log table exists before inserting
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'credit_reset_logs'
  ) THEN
    -- Log the update 
    INSERT INTO public.credit_reset_logs (executed_at, success)
    VALUES (now(), true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to log credit resets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'credit_reset_logs'
  ) THEN
    CREATE TABLE public.credit_reset_logs (
      id SERIAL PRIMARY KEY,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      success BOOLEAN NOT NULL
    );
    
    -- Add RLS to the log table
    ALTER TABLE public.credit_reset_logs ENABLE ROW LEVEL SECURITY;
    
    -- Create a policy to allow authenticated users to view logs (can be restricted to admins in production)
    CREATE POLICY "Authenticated users can view credit reset logs" 
      ON public.credit_reset_logs 
      FOR SELECT 
      TO authenticated;
  END IF;
END $$;

-- Set up a cron job to run the function daily at midnight UTC
-- Note: This requires pgcron extension to be enabled
DO $$
BEGIN
  -- First check if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Check if the job already exists before creating it
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-credits'
    ) THEN
      PERFORM cron.schedule(
        'reset-daily-credits', -- job name
        '0 0 * * *',           -- cron schedule (midnight every day)
        'SELECT public.reset_daily_credits();' -- SQL to execute
      );
    END IF;
  ELSE
    -- Output a notice if pg_cron extension is not available
    RAISE NOTICE 'pg_cron extension is not installed. Scheduled job will not be created.';
  END IF;
END $$; 