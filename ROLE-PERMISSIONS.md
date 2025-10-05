# Role-Based Permissions - PingBuoy

## Role Hierarchy

| Role | Description | Plan |
|------|-------------|------|
| **`owner`** | Founder/Owner (you) - Ultimate access | Any |
| **`admin`** | Senior staff - Full admin panel except financials | Any |
| **`support`** | Customer support team | Any |
| **`user`** | Regular customers | free/pro/founder |

---

## Permission Matrix

### Business Analytics (`/api/admin/analytics`)
**Contains**: MRR, ARR, revenue data, subscriber counts, churn metrics

| Role | Access |
|------|--------|
| `owner` | ✅ Full access |
| `admin` | ❌ No access |
| `support` | ❌ No access |
| `user` | ❌ No access |

**Why**: Business financial data should only be visible to the owner.

---

### Data Retention Management (`/api/admin/data-retention`)
**Contains**: GDPR compliance, data cleanup, account deletions

| Role | Access |
|------|--------|
| `owner` | ✅ Full access |
| `admin` | ✅ Full access |
| `support` | ❌ No access |
| `user` | ❌ No access |

**Why**: Admin staff need this for operational data management.

---

### Incident Management (`/api/admin/incidents`)
**Contains**: Status page incidents, public communications

| Role | Access |
|------|--------|
| `owner` | ✅ Full access |
| `admin` | ✅ Full access (planned) |
| `support` | ⚠️ Read-only (planned) |
| `user` | ❌ No access |

**Why**: Admin manages incidents, support can view status.

---

### User Management (Future)
**Contains**: View/edit customer accounts, reset passwords, view usage

| Role | Access |
|------|--------|
| `owner` | ✅ Full access |
| `admin` | ✅ Full access |
| `support` | ✅ View + limited actions |
| `user` | ❌ No access |

**Why**: Support needs to help customers without full admin privileges.

---

## Implementation Notes

### Current Status:
- ✅ `role` field added to database via migration `20251005000100_add_user_role.sql`
- ✅ TypeScript types updated in `src/lib/supabase.ts`
- ✅ Analytics route restricted to `owner` only
- ✅ Data retention allows `admin` and `owner`

### Next Steps (when hiring staff):
1. Create admin user: `UPDATE users SET role='admin' WHERE email='staff@example.com'`
2. Create support user: `UPDATE users SET role='support' WHERE email='support@example.com'`
3. Implement permission helpers for granular access control

### Security Notes:
- `role` is stored in the database, not JWT (server-side verification)
- All admin routes verify role via database query
- `FOUNDER_EMAIL` env var provides additional owner verification
- Support role currently has same restrictions as regular users (needs implementation)

---

## Example: Adding a Staff Member

```sql
-- Add new admin staff member
INSERT INTO auth.users (email, ...) VALUES ('admin@pingbuoy.com', ...);
UPDATE public.users SET role = 'admin' WHERE email = 'admin@pingbuoy.com';

-- Add customer support member
INSERT INTO auth.users (email, ...) VALUES ('support@pingbuoy.com', ...);
UPDATE public.users SET role = 'support' WHERE email = 'support@pingbuoy.com';
```

**Important**: Staff accounts should have `plan = 'pro'` or `plan = 'free'` (they don't pay), but `role = 'admin'` or `role = 'support'` for permissions.
