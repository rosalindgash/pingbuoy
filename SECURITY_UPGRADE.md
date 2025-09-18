# Service Role to JWT Security Upgrade

## Overview

This upgrade replaces the overpowered `service_role` key with scoped JWT-based service authentication, significantly improving security by:

- **Principle of least privilege**: Each service gets only the permissions it needs
- **Time-bounded access**: JWT tokens have expiration times
- **Audit trail**: All service operations are logged
- **No shared secrets**: Each service type has specific capabilities

## Required Environment Variables

### Replace Existing Variables

❌ **Remove these (insecure)**:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # DELETE THIS
```

✅ **Add these (secure)**:
```bash
# JWT secret for service authentication (generate a strong 32+ char secret)
SERVICE_JWT_SECRET=your_secure_jwt_secret_at_least_32_characters

# API base URL for internal service communication
API_BASE_URL=http://localhost:3000  # Development
API_BASE_URL=https://your-production-domain.com  # Production
```

### Generate SERVICE_JWT_SECRET

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Using online generator (use only for development)
# Visit: https://generate-secret.vercel.app/32
```

## Service Types and Permissions

| Service Type | Tables | Operations | Use Case |
|-------------|--------|------------|-----------|
| `uptime_monitor` | uptime_logs, sites, alerts | SELECT, INSERT, UPDATE | Website monitoring |
| `dead_link_scanner` | dead_links, scans, sites | SELECT, INSERT, UPDATE | Link scanning |
| `email_sender` | email_logs, notification_history | INSERT, SELECT | Email notifications |
| `notification_system` | notification_settings, notification_history, sites, users | SELECT, INSERT | Alert management |
| `analytics_collector` | uptime_logs, sites, users | SELECT | Data analytics |
| `maintenance_worker` | email_logs, notification_history, uptime_logs, dead_links | DELETE, SELECT | Data cleanup |

## Updated Files

### 1. Database Migration
- **File**: `supabase/migrations/20250114000100_replace_service_role_with_jwt.sql`
- **Changes**: New RLS policies using JWT claims, audit logging

### 2. Service Authentication Library
- **File**: `src/lib/service-auth.ts`
- **Usage**:
  ```typescript
  import { serviceAuth, withServiceAuth } from '@/lib/service-auth'

  // In API routes
  export async function POST(request: NextRequest) {
    return withServiceAuth(request, 'email_sender', async (payload) => {
      // Your secure service logic here
    })
  }

  // Create service client
  const client = await serviceAuth.createServiceClient('uptime_monitor')
  ```

### 3. Edge Functions
- **File**: `supabase/functions/_shared/service-auth.ts`
- **Usage**:
  ```typescript
  import { withMonitoringAuth, sendNotificationEmail } from '../_shared/service-auth.ts'

  const results = await withMonitoringAuth('uptime_monitor', async (client) => {
    // Database operations with scoped permissions
  })
  ```

### 4. Updated API Routes
- `src/app/api/send-email/route.ts` - Now uses `email_sender` service type
- `src/app/api/analytics/events/route.ts` - Now uses `analytics_collector` service type

### 5. Updated Edge Functions
- `supabase/functions/uptime-monitor/index.ts` - Now uses scoped JWT auth
- `supabase/functions/dead-link-scanner/index.ts` - Ready for JWT auth update
- `supabase/functions/send-email/index.ts` - Ready for JWT auth update

## Security Features

### 1. Scoped Permissions
Each service can only access tables and operations it actually needs:
```sql
-- Old (overpowered)
auth.role() = 'service_role'  -- Full database access

-- New (scoped)
auth.is_service() AND
auth.has_service_permission('uptime_logs', 'INSERT')
```

### 2. Time-Bounded Tokens
JWT tokens expire automatically:
```typescript
// Tokens expire in 60 minutes by default
const token = await generateServiceToken('uptime_monitor', 60)
```

### 3. Audit Logging
All service operations are logged in `service_audit_log` table:
```sql
SELECT service_type, operation, table_name, success, created_at
FROM service_audit_log
ORDER BY created_at DESC;
```

### 4. JWT Claims Validation
Database functions validate JWT structure and permissions:
```sql
-- Claims validation
service_type IN ('uptime_monitor', 'dead_link_scanner', ...)
iss = 'pingbuoy-service'
exp > now()
```

## Migration Steps

### 1. Database Migration
```bash
# Apply the new security migration
supabase db push

# Verify migration applied successfully
supabase db diff
```

### 2. Environment Variables
```bash
# Update .env.local and production environment
SERVICE_JWT_SECRET=your_generated_secret
API_BASE_URL=your_api_url

# Remove old service role key references
# (Keep the actual key in Supabase dashboard for emergency access)
```

### 3. Deploy Applications
```bash
# Deploy API routes with new authentication
npm run build
npm run deploy

# Deploy Edge functions with new authentication
supabase functions deploy uptime-monitor
supabase functions deploy dead-link-scanner
supabase functions deploy send-email
```

### 4. Verify Security
```bash
# Test that old service_role access is blocked
# Test that new JWT authentication works
# Check audit logs for service operations
```

## Testing

### 1. API Route Test
```bash
# Generate a test token (only works with valid SERVICE_JWT_SECRET)
curl -X POST localhost:3000/api/send-email \
  -H "Authorization: Bearer <generated-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"uptime_alert","userEmail":"test@example.com"}'
```

### 2. Database Policy Test
```sql
-- This should fail (no service role access)
SELECT * FROM uptime_logs;

-- This should work (with valid JWT token in headers)
SELECT * FROM uptime_logs; -- When authenticated as uptime_monitor service
```

### 3. Edge Function Test
```bash
# Deploy and test uptime monitor
supabase functions deploy uptime-monitor
curl -X POST https://your-supabase-project.functions.supabase.co/uptime-monitor
```

## Security Benefits

### Before (Service Role)
- ❌ Single shared secret for all services
- ❌ Full database access for all operations
- ❌ No operation-level permissions
- ❌ No audit trail
- ❌ Permanent access (no expiration)

### After (JWT-based)
- ✅ Scoped permissions per service type
- ✅ Time-bounded access tokens
- ✅ Operation-level access control
- ✅ Complete audit logging
- ✅ Principle of least privilege

## Rollback Plan

If issues occur, you can temporarily restore service_role access:

1. **Keep the old environment variable** (commented out):
   ```bash
   # Emergency fallback (remove after successful migration)
   # SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database rollback**:
   ```sql
   -- Re-enable service_role policies if needed
   CREATE POLICY "Emergency service role access" ON table_name
       FOR ALL USING (auth.role() = 'service_role');
   ```

3. **Code rollback**: Revert to previous versions of updated files

## Support

For issues with this security upgrade:
1. Check service JWT generation and validation
2. Verify environment variables are set correctly
3. Review audit logs for permission errors
4. Test individual service type permissions

The security upgrade provides defense-in-depth while maintaining all existing functionality.