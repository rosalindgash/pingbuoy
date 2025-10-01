-- Update Founder plan monitoring interval to 3 minutes (same as Pro)

-- Update the monitoring frequency function
CREATE OR REPLACE FUNCTION get_user_monitoring_frequency(user_plan TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE user_plan
        WHEN 'founder' THEN
            RETURN INTERVAL '3 minutes'; -- Founder: 3 minutes (same as Pro)
        WHEN 'pro' THEN
            RETURN INTERVAL '3 minutes'; -- Pro: 3 minutes
        ELSE
            RETURN INTERVAL '10 minutes'; -- Free: 10 minutes
    END CASE;
END;
$$;

-- Update the user monitoring info view
CREATE OR REPLACE VIEW user_monitoring_info AS
SELECT
    u.id,
    u.email,
    u.plan,
    get_user_monitoring_frequency(u.plan) as monitoring_frequency,
    CASE
        WHEN u.plan = 'founder' THEN '3 minutes'
        WHEN u.plan = 'pro' THEN '3 minutes'
        ELSE '10 minutes'
    END as frequency_display,
    CASE
        WHEN u.plan = 'founder' THEN 999  -- Unlimited
        WHEN u.plan = 'pro' THEN 15
        ELSE 2
    END as site_limit
FROM users u;