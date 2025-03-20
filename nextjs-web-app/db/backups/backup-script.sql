-- Backup Script for Chaos Coder Production Database
-- This script creates backups of tables and functions related to the credit system
-- Run this script with the service role credentials to ensure full access

-- Backup of profiles table data
COPY (
  SELECT * FROM public.profiles
) TO '/tmp/profiles_data_backup.csv' WITH CSV HEADER;

-- Backup of credit_history table data
COPY (
  SELECT * FROM public.credit_history
) TO '/tmp/credit_history_backup.csv' WITH CSV HEADER;

-- Backup of subscription_history table data
COPY (
  SELECT * FROM public.subscription_history
) TO '/tmp/subscription_history_backup.csv' WITH CSV HEADER;

-- Backup of credit_purchases table data
COPY (
  SELECT * FROM public.credit_purchases
) TO '/tmp/credit_purchases_backup.csv' WITH CSV HEADER;

-- Create SQL backup of profiles table schema
COPY (
  SELECT 'CREATE TABLE IF NOT EXISTS public.profiles_backup (' || string_agg(column_definition, ', ') || ');'
  FROM (
    SELECT 
      column_name || ' ' || 
      data_type || 
      CASE 
        WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
        WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL THEN '(' || numeric_precision || ',' || numeric_scale || ')'
        ELSE ''
      END ||
      CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
      CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
      as column_definition
    FROM 
      information_schema.columns
    WHERE 
      table_schema = 'public' AND table_name = 'profiles'
    ORDER BY 
      ordinal_position
  ) t
) TO '/tmp/profiles_schema_backup.sql';

-- Create a backup of all RLS policies on profiles table
COPY (
  SELECT 'DROP POLICY IF EXISTS "' || policyname || '" ON public.profiles;' ||
         'CREATE POLICY "' || policyname || '" ON public.profiles FOR ' || 
         cmd || ' ' ||
         CASE WHEN cmd = 'ALL' THEN 'USING (' || qual || ') WITH CHECK (' || with_check || ')'
              WHEN cmd != 'ALL' AND with_check IS NOT NULL THEN 'USING (' || qual || ') WITH CHECK (' || with_check || ')'
              ELSE 'USING (' || qual || ')'
         END || ';'
  FROM pg_policies
  WHERE tablename = 'profiles'
) TO '/tmp/profiles_policies_backup.sql';

-- Backup of add_user_credits function
COPY (
  SELECT 'CREATE OR REPLACE FUNCTION ' || 
         proname || '(' || 
         pg_get_function_arguments(pg_proc.oid) || ')' ||
         ' RETURNS ' || pg_get_function_result(pg_proc.oid) || ' AS $BODY$' ||
         pg_get_functiondef(pg_proc.oid) ||
         '$BODY$ LANGUAGE ' || l.lanname || 
         CASE WHEN prosecdef THEN ' SECURITY DEFINER' ELSE ' SECURITY INVOKER' END || ';'
  FROM pg_proc
  INNER JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
  INNER JOIN pg_language l ON l.oid = pg_proc.prolang
  WHERE ns.nspname = 'public' AND proname = 'add_user_credits'
) TO '/tmp/add_user_credits_function_backup.sql';

-- Backup of deduct_user_credits function
COPY (
  SELECT 'CREATE OR REPLACE FUNCTION ' || 
         proname || '(' || 
         pg_get_function_arguments(pg_proc.oid) || ')' ||
         ' RETURNS ' || pg_get_function_result(pg_proc.oid) || ' AS $BODY$' ||
         pg_get_functiondef(pg_proc.oid) ||
         '$BODY$ LANGUAGE ' || l.lanname || 
         CASE WHEN prosecdef THEN ' SECURITY DEFINER' ELSE ' SECURITY INVOKER' END || ';'
  FROM pg_proc
  INNER JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
  INNER JOIN pg_language l ON l.oid = pg_proc.prolang
  WHERE ns.nspname = 'public' AND proname = 'deduct_user_credits'
) TO '/tmp/deduct_user_credits_function_backup.sql';

-- Backup of reset_daily_credits function
COPY (
  SELECT 'CREATE OR REPLACE FUNCTION ' || 
         proname || '(' || 
         pg_get_function_arguments(pg_proc.oid) || ')' ||
         ' RETURNS ' || pg_get_function_result(pg_proc.oid) || ' AS $BODY$' ||
         pg_get_functiondef(pg_proc.oid) ||
         '$BODY$ LANGUAGE ' || l.lanname || 
         CASE WHEN prosecdef THEN ' SECURITY DEFINER' ELSE ' SECURITY INVOKER' END || ';'
  FROM pg_proc
  INNER JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
  INNER JOIN pg_language l ON l.oid = pg_proc.prolang
  WHERE ns.nspname = 'public' AND proname = 'reset_daily_credits'
) TO '/tmp/reset_daily_credits_function_backup.sql';

-- Backup of initialize_user_credits function and trigger
COPY (
  SELECT 'CREATE OR REPLACE FUNCTION ' || 
         proname || '(' || 
         pg_get_function_arguments(pg_proc.oid) || ')' ||
         ' RETURNS ' || pg_get_function_result(pg_proc.oid) || ' AS $BODY$' ||
         pg_get_functiondef(pg_proc.oid) ||
         '$BODY$ LANGUAGE ' || l.lanname || 
         CASE WHEN prosecdef THEN ' SECURITY DEFINER' ELSE ' SECURITY INVOKER' END || ';'
  FROM pg_proc
  INNER JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
  INNER JOIN pg_language l ON l.oid = pg_proc.prolang
  WHERE ns.nspname = 'public' AND proname = 'initialize_user_credits'
) TO '/tmp/initialize_user_credits_function_backup.sql';

-- Backup of deduct_generation_credit function
COPY (
  SELECT 'CREATE OR REPLACE FUNCTION ' || 
         proname || '(' || 
         pg_get_function_arguments(pg_proc.oid) || ')' ||
         ' RETURNS ' || pg_get_function_result(pg_proc.oid) || ' AS $BODY$' ||
         pg_get_functiondef(pg_proc.oid) ||
         '$BODY$ LANGUAGE ' || l.lanname || 
         CASE WHEN prosecdef THEN ' SECURITY DEFINER' ELSE ' SECURITY INVOKER' END || ';'
  FROM pg_proc
  INNER JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
  INNER JOIN pg_language l ON l.oid = pg_proc.prolang
  WHERE ns.nspname = 'public' AND proname = 'deduct_generation_credit'
) TO '/tmp/deduct_generation_credit_function_backup.sql';

-- Backup of triggers on profiles table
COPY (
  SELECT 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON public.profiles;' ||
         'CREATE TRIGGER ' || trigger_name || 
         ' ' || action_timing || ' ' || event_manipulation ||  
         ' ON public.profiles FOR EACH ' || action_orientation || 
         ' EXECUTE FUNCTION ' || action_statement || ';'
  FROM information_schema.triggers
  WHERE event_object_table = 'profiles' AND event_object_schema = 'public'
) TO '/tmp/profiles_triggers_backup.sql';

-- Create a complete table backup as an INSERT statement
COPY (
  SELECT 'CREATE TABLE public.profiles_backup AS SELECT * FROM public.profiles;'
) TO '/tmp/create_profiles_backup_table.sql'; 