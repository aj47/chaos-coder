-- Fix migration to handle existing profiles table and policies
-- This migration ensures we have a clean state before applying the full schema

-- First, drop any existing policies on the profiles table
DO $$
BEGIN
    -- Check if profiles table exists before trying to modify it
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Drop policies if they exist
        BEGIN
            DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error dropping policy "Users can view own profile": %', SQLERRM;
        END;

        BEGIN
            DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error dropping policy "Users can update own profile": %', SQLERRM;
        END;

        -- Disable RLS on the profiles table (if it's enabled)
        BEGIN
            ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error disabling RLS on profiles: %', SQLERRM;
        END;

        -- Re-enable RLS on the profiles table
        BEGIN
            ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error enabling RLS on profiles: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Profiles table does not exist yet, skipping RLS fixes';
    END IF;
END $$;

-- Now we can recreate the policies in the subsequent migrations
