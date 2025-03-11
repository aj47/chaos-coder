-- Function to execute arbitrary SQL (for admin use only)
-- This should be run once manually before using the schema update script

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Restrict access to this function
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

COMMENT ON FUNCTION public.exec_sql(text) IS 'WARNING: This function can execute arbitrary SQL. It should only be callable by the service_role or admin users.'; 