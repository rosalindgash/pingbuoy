-- Add logo URL support for Pro members
-- Add logo_url column to sites table

ALTER TABLE sites
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment to document this field
COMMENT ON COLUMN sites.logo_url IS 'External URL to logo image for Pro/Founder members (user-hosted)';