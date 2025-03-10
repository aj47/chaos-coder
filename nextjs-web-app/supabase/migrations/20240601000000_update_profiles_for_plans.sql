-- Check if credits column exists first to avoid errors
DO $$ 
BEGIN
  -- We will only alter tables if the column doesn't exist
  -- This prevents errors when columns have already been added

  -- Add credits column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 30 NOT NULL;
  ELSE
    -- If the column exists, we might want to update the default value
    ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 30;
  END IF;

  -- Add subscription_tier column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' NOT NULL;
  ELSE
    -- Update default value if the column exists
    ALTER TABLE public.profiles ALTER COLUMN subscription_tier SET DEFAULT 'free';
  END IF;

  -- Add subscription_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT;
  END IF;

  -- Add max_daily_credits column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'max_daily_credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN max_daily_credits INTEGER DEFAULT 5 NOT NULL;
  ELSE
    -- Update default value if the column exists
    ALTER TABLE public.profiles ALTER COLUMN max_daily_credits SET DEFAULT 5;
  END IF;

  -- Add stripe_customer_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- Add stripe_subscription_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
  END IF;

  -- Add last_credit_refresh column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_credit_refresh'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_credit_refresh TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Update the handle_new_user function to set the default credits
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    credits,
    subscription_tier,
    max_daily_credits,
    last_credit_refresh
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'first_name',
    30, -- Default free credits
    'free', -- Default plan
    30, -- Default daily credit limit
    now() -- Set initial refresh timestamp to now
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 