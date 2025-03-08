-- Add subscription-related columns to profiles table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_monthly_credits') THEN
        ALTER TABLE public.profiles ADD COLUMN max_monthly_credits INTEGER DEFAULT 100 NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_period_start') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_period_start TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_period_end') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_period_end TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- Create subscription_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subscription_tier TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_paid INTEGER,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) if the table was just created
DO $$
BEGIN
    -- Enable RLS on subscription_history table
    ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
    
    -- Create policies if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_history' AND policyname = 'Users can view own subscription history') THEN
        CREATE POLICY "Users can view own subscription history" 
        ON public.subscription_history 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_history' AND policyname = 'Service can insert subscription history') THEN
        CREATE POLICY "Service can insert subscription history" 
        ON public.subscription_history 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END
$$; 