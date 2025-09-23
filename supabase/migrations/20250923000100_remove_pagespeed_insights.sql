-- Remove PageSpeed Insights / Performance Monitoring Tables and References
-- This removes all PageSpeed Insights functionality from the app

-- Drop performance_logs table and all related objects
DROP TABLE IF EXISTS performance_logs CASCADE;

-- Note: core_web_vitals table is kept as it's for PingBuoy's internal monitoring only
-- (not user-facing PageSpeed Insights)

-- Remove any references to performance_logs from RLS policies if they exist
-- (These may have been created in other migrations)
DO $$
BEGIN
    -- Clean up any stray policies that might reference performance_logs
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'performance_logs') THEN
        DROP TABLE performance_logs CASCADE;
    END IF;
END
$$;