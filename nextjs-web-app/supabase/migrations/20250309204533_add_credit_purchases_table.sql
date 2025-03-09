-- Create credit_purchases table
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  cost DECIMAL(10, 2) NOT NULL CHECK (cost > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS credit_purchases_user_id_idx ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS credit_purchases_created_at_idx ON credit_purchases(created_at);

-- Add role column to profiles if it doesn't exist
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Set up Row Level Security and policies
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own credit purchases
CREATE POLICY view_own_credit_purchases ON credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow administrators to manage credit purchases
CREATE POLICY admin_manage_credit_purchases ON credit_purchases
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Grant permissions
GRANT SELECT ON credit_purchases TO authenticated;
GRANT ALL ON credit_purchases TO service_role;
