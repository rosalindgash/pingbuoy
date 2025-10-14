-- Fix duplicate indexes by dropping redundant ones
-- Keeps indexes with 'idx_' prefix naming convention

DO $$
DECLARE
    index_record RECORD;
    indexes_to_drop TEXT[];
    index_to_keep TEXT;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'REMOVING DUPLICATE INDEXES';
    RAISE NOTICE '==========================================';

    -- Find duplicate indexes (same table and same columns)
    FOR index_record IN
        SELECT
            schemaname,
            tablename,
            array_agg(indexname ORDER BY
                CASE
                    WHEN indexname LIKE 'idx_%' THEN 1  -- Prefer idx_ prefix
                    ELSE 2
                END,
                length(indexname),  -- Prefer shorter names
                indexname
            ) as index_names,
            array_agg(indexdef ORDER BY
                CASE
                    WHEN indexname LIKE 'idx_%' THEN 1
                    ELSE 2
                END,
                length(indexname),
                indexname
            ) as index_defs
        FROM pg_indexes
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename, regexp_replace(indexdef, 'INDEX \w+ ON', 'INDEX ON')
        HAVING COUNT(*) > 1
    LOOP
        -- First index in array is the one to keep (already sorted by preference)
        index_to_keep := index_record.index_names[1];
        indexes_to_drop := index_record.index_names[2:array_length(index_record.index_names, 1)];

        -- Drop duplicate indexes
        FOREACH index_to_keep IN ARRAY indexes_to_drop
        LOOP
            BEGIN
                EXECUTE format('DROP INDEX IF EXISTS public.%I', index_to_keep);
                dropped_count := dropped_count + 1;
                RAISE NOTICE 'Dropped duplicate index: % on table %',
                    index_to_keep,
                    index_record.tablename;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to drop index %: %',
                    index_to_keep,
                    SQLERRM;
            END;
        END LOOP;

        RAISE NOTICE 'Kept index: % on table %',
            index_record.index_names[1],
            index_record.tablename;
    END LOOP;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TOTAL DUPLICATE INDEXES DROPPED: %', dropped_count;
    RAISE NOTICE '==========================================';
END $$;
