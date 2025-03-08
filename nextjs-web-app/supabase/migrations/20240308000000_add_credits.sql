-- Add credits column to profiles table
ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 100 NOT NULL;

-- Update the handle_new_user function to initialize credits
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, credits)
  VALUES (new.id, new.raw_user_meta_data->>'first_name', 100);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 