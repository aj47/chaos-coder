-- Add subscription-related columns to profiles table
ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT;
ALTER TABLE public.profiles ADD COLUMN max_monthly_credits INTEGER DEFAULT 100 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN subscription_period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN subscription_period_end TIMESTAMP WITH TIME ZONE;

-- Create a table for subscription history
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subscription_tier TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_paid INTEGER,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Policy to allow individuals to view their own subscription history
CREATE POLICY "Users can view own subscription history" 
  ON public.subscription_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy to allow the service role to insert into subscription history
CREATE POLICY "Service can insert subscription history" 
  ON public.subscription_history 
  FOR INSERT 
  WITH CHECK (true); 