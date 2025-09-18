# 🚀 Go-Live Checklist (PingBuoy)

## 1. Environment & Secrets
- [ ] All **Vercel env vars** set for Development, Preview, Production  
- [ ] All **Supabase Function secrets** set (`SERVICE_JWT_SECRET`, `ALLOWED_ORIGINS`, `API_BASE_URL`)  
- [ ] Stripe **test keys** in Preview, **live keys** in Production  
- [ ] Redis/Upstash connection vars set  
- [ ] Sentry DSN set in all environments  
- [ ] No `.env.local` or sensitive files in repo or build artifacts  

## 2. Webhooks
- [ ] Stripe test webhook points to Preview URL  
- [ ] Stripe live webhook points to Production URL  
- [ ] Verified webhook signing secrets stored in Vercel  

## 3. Smoke Tests
- [ ] Homepage and dashboard load without console errors  
- [ ] Test Stripe checkout works with `4242 4242 4242 4242` (Preview)  
- [ ] Webhook triggers once, no duplicates (Redis dedupe works)  
- [ ] Contact form enforces rate limit (429 after N requests)  
- [ ] Adding monitor with blocked URL (e.g., `http://127.0.0.1:22`) is rejected  
- [ ] Security headers grade **A/A+** (securityheaders.com)  
- [ ] TLS grade **A** (SSL Labs)  

## 4. Database & RLS
- [ ] Every multi-tenant table has **RLS enabled**  
- [ ] Verified `auth.uid()` scoping works in Supabase SQL editor  
- [ ] Email logs accessible only by service role  

## 5. Monitoring
- [ ] Sentry release created on deploy, no error spikes  
- [ ] Supabase Function logs clean after test invocations  
- [ ] Redis dashboard shows webhook dedupe keys expiring properly  

## 6. Rollback Readiness
- [ ] Know how to **promote previous deployment** in Vercel  
- [ ] Supabase secrets documented so they can be reset quickly  
- [ ] Stripe webhooks can be disabled in dashboard if needed  
