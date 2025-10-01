-- Fix RLS issues for user_monitoring_info view
-- Views inherit RLS from underlying tables, so we need to ensure the users table RLS is working correctly

-- The issue is that views can't have their own RLS policies
-- Instead, we need to make sure the underlying users table policies work correctly
-- and create a security definer function if needed

-- Create a security definer function to get user monitoring info
-- This bypasses RLS and allows the authenticated user to see their own data
CREATE OR REPLACE FUNCTION get_current_user_monitoring_info()
RETURNS TABLE (
    plan text,
    frequency_display text,
    monitoring_frequency interval
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.plan::text,
        CASE
            WHEN u.plan IN ('pro', 'founder') THEN '1 minute'
            ELSE '5 minutes'
        END as frequency_display,
        get_user_monitoring_frequency(u.plan) as monitoring_frequency
    FROM users u
    WHERE u.id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_monitoring_info() TO authenticated;