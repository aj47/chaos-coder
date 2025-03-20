-- Full Database Backup Script for Chaos Coder
-- This script creates a complete backup of all tables and functions

-- Create a schema for backups if it doesn't exist
CREATE SCHEMA IF NOT EXISTS backup;

-- Function to generate table backups
CREATE OR REPLACE FUNCTION backup.backup_all_tables() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE 'backup_%'
    LOOP
        EXECUTE format('CREATE TABLE IF NOT EXISTS backup.%I_backup AS SELECT * FROM public.%I', 
                       table_rec.tablename, table_rec.tablename);
        
        RAISE NOTICE 'Created backup of table: %', table_rec.tablename;
    END LOOP;
END;
$$;

-- Function to backup all functions
CREATE OR REPLACE FUNCTION backup.backup_all_functions() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    func_rec RECORD;
    func_def TEXT;
    backup_def TEXT;
BEGIN
    FOR func_rec IN 
        SELECT n.nspname AS schema_name, p.proname AS function_name, p.oid AS function_id,
               l.lanname AS language_name, p.prosecdef AS security_definer
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_language l ON p.prolang = l.oid
        WHERE n.nspname = 'public'
    LOOP
        -- Get the original function definition
        func_def := pg_get_functiondef(func_rec.function_id);
        
        -- Create a backup function in the backup schema
        backup_def := regexp_replace(
            func_def, 
            'CREATE( OR REPLACE)? FUNCTION public\.', 
            'CREATE OR REPLACE FUNCTION backup.', 
            1, 1, 'i'
        );
        
        -- Execute the creation of the backup function
        BEGIN
            EXECUTE backup_def;
            RAISE NOTICE 'Created backup of function: %', func_rec.function_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error backing up function %: %', func_rec.function_name, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Function to backup all triggers
CREATE OR REPLACE FUNCTION backup.backup_all_triggers() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    trigger_rec RECORD;
    trigger_def TEXT;
BEGIN
    CREATE TABLE IF NOT EXISTS backup.triggers_backup (
        id SERIAL PRIMARY KEY,
        table_name TEXT,
        trigger_name TEXT,
        trigger_definition TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    FOR trigger_rec IN 
        SELECT 
            event_object_table AS table_name,
            trigger_name,
            action_timing AS timing,
            event_manipulation AS event,
            action_orientation AS orientation,
            action_statement AS function_call
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    LOOP
        trigger_def := format(
            'CREATE TRIGGER %I %s %s ON public.%I FOR EACH %s %s',
            trigger_rec.trigger_name,
            trigger_rec.timing,
            trigger_rec.event,
            trigger_rec.table_name,
            trigger_rec.orientation,
            trigger_rec.function_call
        );
        
        INSERT INTO backup.triggers_backup (table_name, trigger_name, trigger_definition)
        VALUES (trigger_rec.table_name, trigger_rec.trigger_name, trigger_def);
        
        RAISE NOTICE 'Saved trigger definition: %', trigger_rec.trigger_name;
    END LOOP;
END;
$$;

-- Function to backup all RLS policies
CREATE OR REPLACE FUNCTION backup.backup_all_policies() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    policy_rec RECORD;
    policy_def TEXT;
BEGIN
    CREATE TABLE IF NOT EXISTS backup.policies_backup (
        id SERIAL PRIMARY KEY,
        table_name TEXT,
        policy_name TEXT,
        policy_definition TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    FOR policy_rec IN 
        SELECT 
            tablename AS table_name,
            policyname AS policy_name,
            cmd AS command,
            qual AS using_expression,
            with_check AS check_expression,
            roles
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        policy_def := format(
            'CREATE POLICY %I ON public.%I FOR %s %s',
            policy_rec.policy_name,
            policy_rec.table_name,
            policy_rec.command,
            CASE 
                WHEN policy_rec.command = 'ALL' AND policy_rec.check_expression IS NOT NULL 
                    THEN format('USING (%s) WITH CHECK (%s)', policy_rec.using_expression, policy_rec.check_expression)
                WHEN policy_rec.command != 'ALL' AND policy_rec.check_expression IS NOT NULL 
                    THEN format('USING (%s) WITH CHECK (%s)', policy_rec.using_expression, policy_rec.check_expression)
                ELSE format('USING (%s)', policy_rec.using_expression)
            END
        );
        
        INSERT INTO backup.policies_backup (table_name, policy_name, policy_definition)
        VALUES (policy_rec.table_name, policy_rec.policy_name, policy_def);
        
        RAISE NOTICE 'Saved policy definition: %', policy_rec.policy_name;
    END LOOP;
END;
$$;

-- Create timestamp to mark this backup
CREATE TABLE IF NOT EXISTS backup.backup_info (
    id SERIAL PRIMARY KEY,
    backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Execute the backup functions
DO $$
BEGIN
    -- Record start of backup
    INSERT INTO backup.backup_info (description) 
    VALUES ('Full database backup before security fixes');
    
    -- Backup tables
    PERFORM backup.backup_all_tables();
    
    -- Backup functions
    PERFORM backup.backup_all_functions();
    
    -- Backup triggers
    PERFORM backup.backup_all_triggers();
    
    -- Backup policies
    PERFORM backup.backup_all_policies();
    
    RAISE NOTICE 'Database backup completed successfully';
END $$; 