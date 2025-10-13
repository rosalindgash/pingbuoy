# Supabase Linter Fixes

This document explains the fixes applied to resolve Supabase database linter warnings.

## Summary of Fixes

### 1. Security Definer Views (ERRORS - Fixed)
**Issue**: Views `user_monitoring_info` and `monitoring_dashboard` were using `SECURITY DEFINER` by default.

**Fix**: Migration `20251013000100_fix_security_definer_views.sql`
- Recreated views with `WITH (security_invoker = true)`
- Views now respect RLS policies on underlying tables
- Users only see their own data through these views

### 2. Function Search Path Mutable (WARNINGS - Fixed)
**Issue**: 22 functions lacked explicit `search_path` setting, making them vulnerable to search path hijacking attacks.

**Affected Functions**:
- get_performance_summary
- cleanup_old_data
- get_site_monitoring_summary
- update_user_last_sign_in
- get_website_limit
- get_api_endpoint_limit
- get_user_monitoring_frequency
- get_next_check_time
- get_edge_function_url
- call_edge_function
- get_current_user_monitoring_info
- check_site_limit
- real_tiered_uptime_monitoring_with_ssl
- run_analytics_backfill
- run_analytics_quality_check
- debug_http_response
- real_tiered_uptime_monitoring
- real_uptime_monitoring
- normalize_to_monthly_cents
- check_daily_metrics_quality
- recompute_daily_facts
- update_facts_daily_updated_at

**Fix**: Migration `20251013000200_fix_function_search_paths.sql`
- Added `SET search_path = public, pg_catalog` to all 22 functions
- Prevents malicious users from creating functions/tables that hijack the search path

### 3. Extensions in Public Schema (WARNINGS - Fixed)
**Issue**: Extensions `pg_net` and `http` were installed in the `public` schema, which is not recommended.

**Fix**: Migration `20251013000300_fix_extensions_in_public.sql`
- Created dedicated `extensions` schema
- Moved both extensions to the `extensions` schema
- Added `extensions` to database search_path for backward compatibility
- Granted necessary permissions on extensions schema

### 4. Leaked Password Protection (WARNING - Requires Manual Action)
**Issue**: HaveIBeenPwned password protection is disabled in Supabase Auth.

**Recommendation**: Enable in Supabase Dashboard
1. Go to Authentication > Policies in your Supabase dashboard
2. Enable "Password Security" > "Check for compromised passwords"
3. This prevents users from using passwords that have been leaked in data breaches

**Why Not Fixed in Migration**: This is a Supabase Auth configuration setting, not a database setting. It must be enabled through the Supabase dashboard UI or API.

## Deployment

Apply all migrations in order:

```bash
# Apply migrations to remote database
supabase db push --remote

# Or apply locally first for testing
supabase db push
```

## Security Benefits

1. **RLS Enforcement**: Views now properly enforce Row Level Security policies
2. **Search Path Security**: Functions are protected from search path hijacking
3. **Schema Isolation**: Extensions are isolated from public schema
4. **Password Security**: When enabled, prevents use of compromised passwords

## Testing

After applying migrations, verify:
- Users can still view their own monitoring data
- Functions execute without errors
- Extensions (pg_net, http) still work in functions
- No new linter warnings appear in Supabase dashboard

## References

- [Security Definer Views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [Function Search Path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Extensions in Public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)
- [Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
