-- Create a table for user profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  credits INTEGER DEFAULT 30 NOT NULL,
  subscription_tier TEXT DEFAULT 'free' NOT NULL,
  subscription_status TEXT,
  max_daily_credits INTEGER DEFAULT 30 NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  last_credit_refresh TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create a function to handle new user signup
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

-- Create a trigger to call the function when a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to reset user credits daily according to their plan
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void AS $$
BEGIN
  -- Update credits for free tier users
  UPDATE public.profiles
  SET credits = 30
  WHERE subscription_tier = 'free' AND credits < 30;
  
  -- Update credits for pro tier users
  UPDATE public.profiles
  SET credits = 25
  WHERE subscription_tier = 'pro' AND credits < 25;
  
  -- Update credits for ultra tier users
  UPDATE public.profiles
  SET credits = 200
  WHERE subscription_tier = 'ultra' AND credits < 200;
  
  -- Update last_credit_refresh timestamp
  UPDATE public.profiles
  SET last_credit_refresh = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to log credit resets
CREATE TABLE IF NOT EXISTS public.credit_reset_logs (
  id SERIAL PRIMARY KEY,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  success BOOLEAN NOT NULL
);

-- Add RLS to the log table
ALTER TABLE public.credit_reset_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow authenticated users to view logs
CREATE POLICY "Authenticated users can view credit reset logs" 
  ON public.credit_reset_logs 
  FOR SELECT 
  TO authenticated;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column(); 