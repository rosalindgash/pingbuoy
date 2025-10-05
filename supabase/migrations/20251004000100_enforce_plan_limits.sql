-- Enforce plan limits at database level to prevent bypassing application-level checks
-- This prevents users from exceeding their plan limits through any code path

-- Function to get site limit based on user plan
CREATE OR REPLACE FUNCTION public.get_site_limit(user_plan TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE user_plan
        WHEN 'free' THEN 2
        WHEN 'pro' THEN 15
        WHEN 'founder' THEN 999
        ELSE 999 -- Default to highest limit for unknown plans
    END CASE;
END;
$$;

-- Function to check if user can add more sites
CREATE OR REPLACE FUNCTION public.check_site_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plan TEXT;
    v_site_count INTEGER;
    v_site_limit INTEGER;
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

    -- Get current site count for this user
    SELECT COUNT(*) INTO v_site_count
    FROM public.sites
    WHERE user_id = NEW.user_id;

    -- Get limit for this plan
    v_site_limit := public.get_site_limit(v_user_plan);

    -- Check if limit would be exceeded
    IF v_site_count >= v_site_limit THEN
        RAISE EXCEPTION 'Site limit exceeded for % plan (limit: %, current: %)',
            v_user_plan, v_site_limit, v_site_count
            USING ERRCODE = 'check_violation',
                  HINT = 'Upgrade your plan to add more sites';
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger to enforce site limits on INSERT
DROP TRIGGER IF EXISTS enforce_site_limit ON public.sites;
CREATE TRIGGER enforce_site_limit
    BEFORE INSERT ON public.sites
    FOR EACH ROW
    EXECUTE FUNCTION public.check_site_limit();

-- Add comment for documentation
COMMENT ON FUNCTION public.get_site_limit(TEXT) IS 'Returns the site limit for a given plan type (free: 2, pro: 15, founder: 999)';
COMMENT ON FUNCTION public.check_site_limit() IS 'Trigger function to enforce plan-based site limits at database level';
COMMENT ON TRIGGER enforce_site_limit ON public.sites IS 'Prevents users from exceeding their plan site limits regardless of code path';
