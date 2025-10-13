# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PingBuoy is a production-ready website monitoring SaaS application built with Next.js 15, Supabase, and Stripe. It provides uptime monitoring, page speed tracking, SSL certificate monitoring, dead link detection, and real-time alerting capabilities.

**Tech Stack:**
- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- Backend: Supabase (PostgreSQL with Row Level Security), Supabase Edge Functions (Deno)
- Payments: Stripe with webhooks
- Infrastructure: Vercel (hosting), Upstash Redis (rate limiting), Resend (email)
- Security: GDPR compliant, 2FA/TOTP, comprehensive input validation with Zod

## Development Commands

### Running the Application
```bash
npm run dev           # Start dev server on port 4000
npm run build         # Production build with Turbopack
npm start             # Start production server
```

### Code Quality & Security
```bash
npm run lint                # Run ESLint on src/ and middleware.ts
npm run lint:security       # Run security-focused ESLint checks
npm run security-check      # Run comprehensive security validation
npm run pre-deploy          # Full pre-deployment check (security + lint + audit)
npm run build:secure        # Pre-deploy checks + production build
```

### Testing & Health Checks
```bash
npm run test:redis          # Test Redis connection
npm run health:redis        # Check Redis health endpoint
```

### Dependency Management
```bash
npm audit                   # Check for vulnerabilities
npm run deps:audit          # Audit with moderate level threshold
npm run deps:audit-fix      # Auto-fix vulnerabilities
npm run deps:outdated       # List outdated packages
npm run deps:update         # Update dependencies
```

### Supabase Edge Functions
```bash
supabase functions deploy <function-name>    # Deploy specific function
supabase db pull                             # Pull database schema changes
supabase db diff                             # Show database schema differences
```

Available edge functions (in `supabase/functions/`):
- `uptime-monitor` - Monitors website uptime with SSRF protection
- `page-speed-monitor` - Tracks page performance metrics
- `ssl-check` - Monitors SSL certificate expiration
- `dead-link-scanner` - Scans for broken links
- `dead-link-batch-scanner` - Batch scanning for dead links
- `data-cleanup` - Cleans up old monitoring data
- `send-email` - Email notification service
- `core-web-vitals` - Tracks Core Web Vitals metrics

## Architecture Overview

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (all require auth unless in PUBLIC_API_ROUTES)
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── billing/              # Stripe billing and portal
│   │   ├── checkout/             # Stripe checkout
│   │   ├── sites/                # Site CRUD and monitoring
│   │   ├── webhooks/             # Stripe webhooks
│   │   ├── dead-links/           # Dead link scanning
│   │   ├── privacy/              # GDPR data export/deletion
│   │   └── ...
│   ├── dashboard/                # Protected dashboard pages
│   ├── admin/                    # Admin-only pages
│   └── (public pages)            # Login, signup, pricing, etc.
├── components/                   # React components
│   ├── auth/                     # Authentication components (2FA, login, etc.)
│   ├── dashboard/                # Dashboard-specific components
│   ├── billing/                  # Stripe/billing components
│   ├── monitoring/               # Monitoring UI components
│   ├── layout/                   # Layout components (nav, footer)
│   └── ui/                       # Reusable UI components
├── lib/                          # Shared utilities and services
│   ├── supabase/                 # Supabase client/server setup
│   ├── auth.ts                   # Authentication helpers
│   ├── validation.ts             # Zod schemas for input validation
│   ├── stripe.ts                 # Stripe configuration and pricing
│   ├── email*.ts                 # Email sending and templates
│   ├── security-*.ts             # Security headers and configurations
│   ├── rate-limit.ts             # Rate limiting with Upstash Redis
│   ├── ssrf-*.ts                 # SSRF protection utilities
│   └── ...
└── middleware.ts                 # Global auth and security middleware

supabase/
├── functions/                    # Edge functions (Deno runtime)
│   ├── _shared/                  # Shared utilities for edge functions
│   └── [function-name]/          # Individual edge functions
└── migrations/                   # Database migration files
```

### Authentication & Authorization

**Authentication Flow:**
- Uses Supabase Auth with email/password
- Optional 2FA/TOTP enforcement with server-side validation
- Session-based authentication with HTTP-only cookies
- Middleware enforces auth on ALL API routes except those in `PUBLIC_API_ROUTES` (see middleware.ts:18-43)

**Key Auth Functions (src/lib/auth.ts):**
- `getUser()` - Get current authenticated user
- `requireAuth()` - Redirect to login if not authenticated
- `getUserProfile(userId)` - Fetch user profile from database

**Protected Routes:**
- All `/api/*` routes require authentication UNLESS explicitly listed in middleware.ts `PUBLIC_API_ROUTES`
- Dashboard pages (`/dashboard/*`) use client-side auth checks
- Admin routes (`/admin/*`) check user role

### Database Architecture

**Key Tables:**
- `users` - User profiles with plan, role, 2FA settings
- `sites` - Monitored websites (user-owned, plan limits enforced)
- `uptime_logs` - Historical uptime check results
- `page_speed_logs` - Historical performance metrics
- `ssl_certificates` - SSL certificate monitoring data
- `alerts` - Alert history (uptime, SSL, etc.)
- `dead_link_scans` - Dead link scan results
- `notification_settings` - User notification preferences
- `api_keys` - API authentication keys

**Row Level Security (RLS):**
- All tables use RLS policies to ensure users only access their own data
- Service role used in Edge Functions bypasses RLS for system operations
- Admin role has elevated permissions for management operations

### Security Architecture

**IMPORTANT:** This codebase has been hardened for production with extensive security measures:

1. **Input Validation** - All user inputs validated with Zod schemas (src/lib/validation.ts)
   - UUID validation for all IDs
   - URL validation with protocol enforcement
   - Email validation with proper RFC compliance
   - Password validation (NIST-aligned, 8+ chars, 3/4 character types)

2. **XSS Protection**
   - DOMPurify sanitization on user-generated content
   - Strict Content Security Policy (CSP) in next.config.js
   - Server-side output encoding

3. **SSRF Protection** - See `supabase/functions/_shared/` and `src/lib/ssrf-*.ts`
   - DNS validation to prevent private IP access
   - Port allowlisting (80, 443, 8080, 8443)
   - Redirect validation with manual redirect handling
   - Metadata service blocking (169.254.169.254, etc.)

4. **Rate Limiting** - Upstash Redis with sliding window algorithm
   - API endpoints: 100 requests/15min per IP
   - Auth endpoints: 5 requests/15min per IP
   - Contact form: 3 requests/hour per IP

5. **Security Headers** (src/lib/security-2025.ts, next.config.js)
   - Strict CSP with nonce-based script execution
   - HSTS with preload
   - X-Frame-Options: DENY
   - Comprehensive Permissions-Policy

6. **API Security**
   - Middleware enforces auth on all non-public API routes
   - CSRF protection via SameSite cookies
   - Service-to-service auth for Edge Functions (src/lib/service-auth.ts)

### Monitoring System

**Uptime Monitoring:**
- Edge Function (`uptime-monitor`) checks all active sites
- Stores results in `uptime_logs` table
- Creates alerts in `alerts` table when sites go down
- Sends email notifications via Resend
- Automatically resolves alerts and sends recovery notifications

**Monitoring Flow:**
1. Edge Function triggered (cron or manual via `/api/monitoring/trigger`)
2. Fetches all active sites from database
3. Performs HEAD request with SSRF protection
4. Logs result (status, response time, status code)
5. Creates/resolves alerts as needed
6. Sends notifications (email, Slack, Discord, webhooks)

**Performance Monitoring:**
- Page speed checks track response times and metrics
- SSL certificate monitoring alerts before expiration
- Dead link scanning with configurable schedules

### Payment Integration

**Stripe Setup:**
- Configuration in `src/lib/stripe.ts`
- Plans: Free (3 sites) and Pro (25 sites, $29/mo)
- Webhook handling at `/api/webhooks/stripe`
- Customer portal for subscription management

**Plan Enforcement:**
- Site limits checked before creating new sites
- Database triggers maintain consistency
- Middleware can enforce plan-based feature access

### Email System

**Email Service:** Resend (production) with fallback to nodemailer (dev)

**Email Templates (src/lib/email-templates.ts):**
- Welcome email
- Uptime alerts and recovery
- SSL expiration warnings
- Dead link reports
- Weekly/monthly summaries (Pro plan)

**Sending:** All emails sent via `src/lib/email-sender.ts` with validation

### Rate Limiting Strategy

**Implementation:** Upstash Redis with @upstash/ratelimit

**Limits (see src/lib/rate-limit.ts):**
- Standard API: 100 req/15min per IP
- Auth endpoints: 5 req/15min per IP
- Contact form: 3 req/hour per IP
- Public status pages: 60 req/min per IP

**Usage:**
```typescript
import { rateLimitConfig } from '@/lib/rate-limit'
const { success, remaining } = await rateLimitConfig.api.limit(identifier)
```

## Important Development Patterns

### API Route Pattern

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { rateLimitConfig } from '@/lib/rate-limit'
import { validateAndSanitize, exampleSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const { success } = await rateLimitConfig.api.limit(
      request.headers.get('x-forwarded-for') || 'anonymous'
    )
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // 2. Get authenticated user (middleware ensures auth)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Parse and validate input
    const body = await request.json()
    const validated = validateAndSanitize(exampleSchema, body)

    // 4. Perform database operations
    const { data, error } = await supabase
      .from('table_name')
      .insert({ ...validated, user_id: user.id })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Edge Function Pattern

```typescript
// supabase/functions/example/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { withMonitoringAuth } from '../_shared/service-auth.ts'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger } from '../_shared/logger.ts'

serve(withSecureCORS(async (req) => {
  const logger = createLogger('example-function')

  try {
    return await withMonitoringAuth('function_name', async (supabaseClient) => {
      // Use supabaseClient with service role access
      const { data, error } = await supabaseClient
        .from('table')
        .select('*')

      if (error) throw error

      return new Response(JSON.stringify({ data }), {
        headers: { 'Content-Type': 'application/json' }
      })
    })
  } catch (error) {
    logger.error('Function failed', { error: error.message })
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}))
```

### Validation Pattern

Always validate inputs using Zod schemas from `src/lib/validation.ts`:

```typescript
import { validateAndSanitize, siteSchema, uuidSchema } from '@/lib/validation'

// Validate request body
const validatedData = validateAndSanitize(siteSchema, requestBody)

// Validate UUID parameters
const validatedId = validateAndSanitize(uuidSchema, params.siteId)
```

## Security Checklist for New Features

When adding new features, ensure:

- [ ] Input validation with Zod schemas
- [ ] Rate limiting applied to endpoints
- [ ] Authentication check (unless explicitly public)
- [ ] RLS policies updated if new tables added
- [ ] SSRF protection for any external requests
- [ ] XSS protection via DOMPurify for user content
- [ ] Plan limits enforced for paid features
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't include PII or secrets

## Common Tasks

### Adding a New Monitored Site Type
1. Update `sites` table with new type enum value (migration)
2. Create monitoring logic in new/existing Edge Function
3. Update `src/lib/validation.ts` with validation schema
4. Add UI components in `src/components/dashboard/`
5. Update plan limits if needed in `src/lib/stripe.ts`

### Adding a New Email Template
1. Add template function to `src/lib/email-templates.ts`
2. Export from email-templates and import in email-sender
3. Use via `sendEmail(recipient, template, data)` in `src/lib/email-sender.ts`

### Adding a New API Endpoint
1. Create route file in `src/app/api/[endpoint]/route.ts`
2. Add to `PUBLIC_API_ROUTES` in middleware.ts if public
3. Implement with validation, rate limiting, and auth
4. Test with security checks enabled

### Modifying Authentication
1. Update Supabase Auth configuration
2. Modify `src/lib/auth.ts` if helper functions needed
3. Update middleware.ts if route protection changes
4. Test 2FA flow if affected

## Environment Variables

Required for local development:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
MONITORING_SERVICE_KEY=         # For Edge Function auth
```

## GDPR Compliance Features

- Data export: `/api/privacy/export` - exports all user data as JSON
- Data deletion: `/api/privacy/delete` - schedules account deletion (30-day grace period)
- Cookie consent: Managed via CookieBanner component
- Privacy controls: User can control notification settings, status page visibility

## Performance Considerations

- Next.js 15 with Turbopack for fast builds
- Server Components used by default for reduced client bundle
- Edge Functions for global low-latency monitoring
- Database queries optimized with proper indexes
- Redis caching for rate limiting and status checks

## Deployment

**Platform:** Vercel

**Pre-deployment:**
```bash
npm run build:secure  # Runs security checks + lint + audit + build
```

**Environment:** Ensure all production environment variables are set in Vercel dashboard

**Database:** Supabase migrations deployed via `supabase db push` or auto-applied

**Edge Functions:** Deploy via `supabase functions deploy [name]`
