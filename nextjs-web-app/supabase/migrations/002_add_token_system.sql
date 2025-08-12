-- Migration to add token-based system
-- This migration adds token balance tracking and token purchase records

-- Add token balance to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;

-- Create token_purchases table to track token purchases
CREATE TABLE IF NOT EXISTS public.token_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('starter', 'popular', 'premium')),
  tokens_purchased INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_token_purchases_user_id ON public.token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_stripe_payment_intent_id ON public.token_purchases(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_token_purchases_status ON public.token_purchases(status);
CREATE INDEX IF NOT EXISTS idx_token_purchases_created_at ON public.token_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_token_balance ON public.user_profiles(token_balance);

-- Add updated_at trigger for token_purchases
CREATE TRIGGER trigger_token_purchases_updated_at
  BEFORE UPDATE ON public.token_purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS) for token_purchases
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for token_purchases
CREATE POLICY "Users can view own token purchases" ON public.token_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token purchases" ON public.token_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to add tokens to user balance
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(
  user_id_param UUID,
  tokens_to_add INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_profiles 
  SET token_balance = token_balance + tokens_to_add
  WHERE id = user_id_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct tokens from user balance
CREATE OR REPLACE FUNCTION public.deduct_tokens_from_user(
  user_id_param UUID,
  tokens_to_deduct INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT token_balance INTO current_balance
  FROM public.user_profiles
  WHERE id = user_id_param;
  
  -- Check if user has enough tokens
  IF current_balance IS NULL OR current_balance < tokens_to_deduct THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct tokens
  UPDATE public.user_profiles 
  SET token_balance = token_balance - tokens_to_deduct
  WHERE id = user_id_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has enough tokens
CREATE OR REPLACE FUNCTION public.user_has_tokens(
  user_id_param UUID,
  tokens_required INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT token_balance INTO current_balance
  FROM public.user_profiles
  WHERE id = user_id_param;
  
  RETURN current_balance IS NOT NULL AND current_balance >= tokens_required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Give existing users some free tokens (100 tokens) to start with
UPDATE public.user_profiles 
SET token_balance = 100 
WHERE token_balance = 0;

-- Add comment to document the token system
COMMENT ON COLUMN public.user_profiles.token_balance IS 'Number of tokens available for app generation. Each generation costs 1 token.';
COMMENT ON TABLE public.token_purchases IS 'Records of token package purchases by users';
