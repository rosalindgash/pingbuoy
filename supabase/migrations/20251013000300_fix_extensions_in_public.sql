-- Fix extensions in public schema warning
-- Move pg_net and http extensions to the extensions schema
-- https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension from public to extensions schema
-- Note: We need to drop and recreate because ALTER EXTENSION SET SCHEMA might not work for all extensions
DO $$
BEGIN
    -- Check if pg_net exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_extension
        WHERE extname = 'pg_net'
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        -- Drop from public and recreate in extensions schema
        DROP EXTENSION IF EXISTS pg_net CASCADE;
        CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
        RAISE NOTICE 'Moved pg_net extension to extensions schema';
    ELSE
        -- Just ensure it exists in extensions schema
        CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
        RAISE NOTICE 'Created pg_net extension in extensions schema';
    END IF;
END $$;

-- Move http extension from public to extensions schema
DO $$
BEGIN
    -- Check if http exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_extension
        WHERE extname = 'http'
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        -- Drop from public and recreate in extensions schema
        DROP EXTENSION IF EXISTS http CASCADE;
        CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
        RAISE NOTICE 'Moved http extension to extensions schema';
    ELSE
        -- Just ensure it exists in extensions schema
        CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
        RAISE NOTICE 'Created http extension in extensions schema';
    END IF;
END $$;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Add extensions to search_path for convenience
-- This ensures functions can still find the extensions
ALTER DATABASE postgres SET search_path = public, extensions, pg_catalog;

COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions (pg_net, http, etc.)';
