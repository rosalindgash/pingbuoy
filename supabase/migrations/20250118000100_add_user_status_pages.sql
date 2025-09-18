-- Add user status page functionality
-- This migration adds fields to support individual user status pages

-- Add status page fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status_page_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status_page_enabled BOOLEAN DEFAULT false; -- Security: Default to disabled for privacy

-- Create index for status page lookups
CREATE INDEX IF NOT EXISTS users_status_page_slug_idx ON public.users(status_page_slug) WHERE status_page_slug IS NOT NULL;

-- Function to generate unique status page slug (privacy-focused)
CREATE OR REPLACE FUNCTION generate_status_page_slug(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
    slug_exists BOOLEAN;
    random_suffix TEXT;
BEGIN
    -- Security: Generate random-based slug to prevent email enumeration
    -- Use first 3 chars of email + random string for privacy
    base_slug := left(split_part(user_email, '@', 1), 3);

    -- Clean the slug: lowercase, alphanumeric only
    base_slug := lower(regexp_replace(base_slug, '[^a-zA-Z0-9]', '', 'g'));

    -- Ensure we have at least something to work with
    IF LENGTH(base_slug) < 2 THEN
        base_slug := 'user';
    END IF;

    -- Generate random suffix for privacy (8 chars)
    random_suffix := encode(gen_random_bytes(4), 'hex');
    final_slug := base_slug || '-' || random_suffix;

    -- Ensure uniqueness (highly unlikely collision with random bytes)
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.users
            WHERE status_page_slug = final_slug
        ) INTO slug_exists;

        IF NOT slug_exists THEN
            EXIT;
        END IF;

        -- Generate new random suffix if collision occurs
        random_suffix := encode(gen_random_bytes(4), 'hex');
        final_slug := base_slug || '-' || random_suffix;

        counter := counter + 1;
        IF counter > 10 THEN
            -- Fallback to timestamp if too many collisions
            final_slug := base_slug || '-' || extract(epoch from now())::bigint;
            EXIT;
        END IF;
    END LOOP;

    RETURN final_slug;
END;
$$;

-- Function to auto-generate slug for existing users
CREATE OR REPLACE FUNCTION auto_generate_status_page_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only generate if slug is null
    IF NEW.status_page_slug IS NULL THEN
        NEW.status_page_slug := generate_status_page_slug(NEW.email);
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE OR REPLACE TRIGGER trigger_auto_generate_status_page_slug
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_status_page_slug();

-- Add site-level privacy controls
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS show_on_status_page BOOLEAN DEFAULT true; -- Allow hiding specific sites

-- Create index for status page site filtering
CREATE INDEX IF NOT EXISTS sites_status_page_visibility_idx ON public.sites(user_id, show_on_status_page, is_active) WHERE show_on_status_page = true AND is_active = true;

-- Generate slugs for existing users who don't have them
UPDATE public.users
SET status_page_slug = generate_status_page_slug(email)
WHERE status_page_slug IS NULL;

-- Add constraint to ensure slug format
ALTER TABLE public.users
ADD CONSTRAINT users_status_page_slug_format
CHECK (
    status_page_slug IS NULL OR
    (LENGTH(status_page_slug) >= 3 AND
     LENGTH(status_page_slug) <= 50 AND
     status_page_slug ~ '^[a-z0-9-]+$' AND
     status_page_slug NOT LIKE '-%' AND
     status_page_slug NOT LIKE '%-')
);

-- Function to get user status page data (with security constraints)
CREATE OR REPLACE FUNCTION get_user_status_page_data(slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER -- Changed from DEFINER for better security
AS $$
DECLARE
    user_data RECORD;
    sites_data JSON;
    result JSON;
    validated_slug TEXT;
BEGIN
    -- Input validation and sanitization
    IF slug IS NULL OR LENGTH(TRIM(slug)) = 0 THEN
        RETURN NULL;
    END IF;

    -- Validate slug format (security: prevent injection)
    validated_slug := TRIM(LOWER(slug));
    IF NOT (validated_slug ~ '^[a-z0-9-]+$' AND
            LENGTH(validated_slug) >= 3 AND
            LENGTH(validated_slug) <= 50 AND
            validated_slug NOT LIKE '-%' AND
            validated_slug NOT LIKE '%-') THEN
        RETURN NULL;
    END IF;

    -- Get user by slug with additional security checks
    SELECT id, email, status_page_enabled, created_at
    INTO user_data
    FROM public.users
    WHERE status_page_slug = validated_slug
    AND status_page_enabled = true;

    -- Return null if user not found or status page disabled
    IF user_data.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get sites with recent uptime data (security: limit data exposure)
    WITH site_stats AS (
        SELECT
            s.id,
            -- Sanitize output (security: prevent XSS in JSON)
            REPLACE(REPLACE(s.name, '<', '&lt;'), '>', '&gt;') as name,
            -- Privacy: Only show domain, not full URL with paths/params
            CASE
                WHEN s.url ~ '^https?://' THEN
                    regexp_replace(s.url, '^(https?://[^/]+).*', '\1', 'g')
                ELSE
                    s.url
            END as url,
            s.status,
            s.last_checked,
            -- Calculate uptime percentage (last 30 days, limited precision)
            COALESCE(
                ROUND(
                    (COUNT(ul.id) FILTER (WHERE ul.status = 'up')::DECIMAL /
                     NULLIF(COUNT(ul.id), 0) * 100), 2
                ), 100.00
            ) as uptime_30d,
            -- Get average response time (last 30 days, capped for security)
            LEAST(
                COALESCE(
                    ROUND(AVG(ul.response_time) FILTER (WHERE ul.status = 'up')), 0
                ), 300000 -- Cap at 5 minutes max
            ) as avg_response_time
        FROM public.sites s
        LEFT JOIN public.uptime_logs ul ON s.id = ul.site_id
            AND ul.checked_at >= NOW() - INTERVAL '30 days'
        WHERE s.user_id = user_data.id
        AND s.is_active = true
        AND s.show_on_status_page = true -- Security: Only show sites user wants public
        GROUP BY s.id, s.name, s.url, s.status, s.last_checked
        ORDER BY s.name
        LIMIT 50 -- Security: limit number of sites exposed
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'url', url,
            'status', status,
            'last_checked', last_checked,
            'uptime_30d', uptime_30d,
            'avg_response_time', avg_response_time
        )
    ) INTO sites_data
    FROM site_stats;

    -- Build final result
    result := json_build_object(
        'user', json_build_object(
            'email', user_data.email,
            'created_at', user_data.created_at
        ),
        'sites', COALESCE(sites_data, '[]'::json),
        'updated_at', NOW()
    );

    RETURN result;
END;
$$;

-- Grant permissions for status page access
GRANT EXECUTE ON FUNCTION get_user_status_page_data(TEXT) TO anon, authenticated;

-- Add comments
COMMENT ON COLUMN public.users.status_page_slug IS 'Unique URL slug for user public status page';
COMMENT ON COLUMN public.users.status_page_enabled IS 'Whether the user status page is publicly accessible';
COMMENT ON FUNCTION generate_status_page_slug IS 'Generate unique status page slug from email';
COMMENT ON FUNCTION get_user_status_page_data IS 'Get public status page data for a user by slug';