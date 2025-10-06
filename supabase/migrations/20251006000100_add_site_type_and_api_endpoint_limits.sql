-- Add site type to distinguish between websites and API endpoints
-- Update plan limits to enforce separate counts for websites and API endpoints
-- Free: 2 websites + 1 API endpoint
-- Pro: 15 websites + 3 API endpoints
-- Founder: Unlimited

-- Add type column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'website' CHECK (type IN ('website', 'api_endpoint'));

-- Update existing sites to be 'website' type
UPDATE sites SET type = 'website' WHERE type IS NULL;

-- Add comment
COMMENT ON COLUMN sites.type IS 'Type of monitoring: website or api_endpoint';

-- Drop the old trigger
DROP TRIGGER IF EXISTS enforce_site_limit ON public.sites;

-- Update the get_site_limit function to return both website and API endpoint limits
DROP FUNCTION IF EXISTS public.get_site_limit(TEXT);

CREATE OR REPLACE FUNCTION public.get_website_limit(user_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE user_plan
        WHEN 'free' THEN 2
        WHEN 'pro' THEN 15
        WHEN 'founder' THEN 999
        ELSE 999
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_api_endpoint_limit(user_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE user_plan
        WHEN 'free' THEN 1
        WHEN 'pro' THEN 3
        WHEN 'founder' THEN 999
        ELSE 999
    END CASE;
END;
$$;

-- Update the check_site_limit function to enforce separate limits
CREATE OR REPLACE FUNCTION public.check_site_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plan TEXT;
    v_website_count INTEGER;
    v_api_endpoint_count INTEGER;
    v_website_limit INTEGER;
    v_api_endpoint_limit INTEGER;
BEGIN
    -- Get user's plan
    SELECT plan INTO v_user_plan
    FROM public.users
    WHERE id = NEW.user_id;

    -- If user not found, prevent insert
    IF v_user_plan IS NULL THEN
        RAISE EXCEPTION 'User not found'
            USING ERRCODE = 'check_violation',
                  HINT = 'User profile must exist before creating sites';
    END IF;

    -- Get current counts for this user by type
    SELECT COUNT(*) INTO v_website_count
    FROM public.sites
    WHERE user_id = NEW.user_id AND type = 'website';

    SELECT COUNT(*) INTO v_api_endpoint_count
    FROM public.sites
    WHERE user_id = NEW.user_id AND type = 'api_endpoint';

    -- Get limits for this plan
    v_website_limit := public.get_website_limit(v_user_plan);
    v_api_endpoint_limit := public.get_api_endpoint_limit(v_user_plan);

    -- Check if limit would be exceeded based on type
    IF NEW.type = 'website' AND v_website_count >= v_website_limit THEN
        RAISE EXCEPTION 'Website limit exceeded for % plan (limit: %, current: %)',
            v_user_plan, v_website_limit, v_website_count
            USING ERRCODE = 'check_violation',
                  HINT = 'Upgrade your plan to add more websites';
    END IF;

    IF NEW.type = 'api_endpoint' AND v_api_endpoint_count >= v_api_endpoint_limit THEN
        RAISE EXCEPTION 'API endpoint limit exceeded for % plan (limit: %, current: %)',
            v_user_plan, v_api_endpoint_limit, v_api_endpoint_count
            USING ERRCODE = 'check_violation',
                  HINT = 'Upgrade your plan to add more API endpoints';
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger to enforce site limits on INSERT
CREATE TRIGGER enforce_site_limit
    BEFORE INSERT ON public.sites
    FOR EACH ROW
    EXECUTE FUNCTION public.check_site_limit();

-- Add comments for documentation
COMMENT ON FUNCTION public.get_website_limit(TEXT) IS 'Returns the website limit for a given plan type (free: 2, pro: 15, founder: 999)';
COMMENT ON FUNCTION public.get_api_endpoint_limit(TEXT) IS 'Returns the API endpoint limit for a given plan type (free: 1, pro: 3, founder: 999)';
COMMENT ON FUNCTION public.check_site_limit() IS 'Trigger function to enforce plan-based limits for both websites and API endpoints at database level';
COMMENT ON TRIGGER enforce_site_limit ON public.sites IS 'Prevents users from exceeding their plan limits for websites and API endpoints';
