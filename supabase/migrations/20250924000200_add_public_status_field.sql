-- Add public_status field to sites table for public status page access control
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sites'
        AND column_name = 'public_status'
    ) THEN
        ALTER TABLE public.sites
        ADD COLUMN public_status BOOLEAN NOT NULL DEFAULT true;

        -- Add comment explaining the field
        COMMENT ON COLUMN public.sites.public_status IS 'Whether this site has a publicly accessible status page';
    END IF;
END
$$;