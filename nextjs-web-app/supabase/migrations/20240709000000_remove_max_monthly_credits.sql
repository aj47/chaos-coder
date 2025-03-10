-- Remove max_monthly_credits column from profiles table
-- This change is needed because users can keep buying credits without any monthly maximum

ALTER TABLE public.profiles DROP COLUMN IF EXISTS max_monthly_credits; 