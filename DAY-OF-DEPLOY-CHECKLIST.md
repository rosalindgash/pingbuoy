# 🚀 Day-of-Deploy Quick Checklist (PingBuoy)

## 1. Env & Secrets
- [ ] Vercel: All env vars set (Supabase URL + anon, Stripe live keys, Redis, Sentry, API_BASE_URL).  
- [ ] Supabase Functions: `SERVICE_JWT_SECRET`, `ALLOWED_ORIGINS`, `API_BASE_URL` set.  
- [ ] Stripe live webhook signing secret in Vercel.  
- [ ] `.env.local` NOT in repo or artifacts.  

## 2. Stripe Webhooks
- [ ] Live webhook points to `https://yourdomain.com/api/webhooks/stripe`.  
- [ ] Signing secret matches what’s in Vercel.  

## 3. Smoke Tests (Prod URL)
- [ ] Homepage + login load, no console errors.  
- [ ] Stripe live checkout completes with a real card/test $0 plan.  
- [ ] Webhook processes once, no duplicates.  
- [ ] Contact form works and rate-limits after spam attempts.  
- [ ] Adding a bad URL (`http://127.0.0.1:22`) is blocked.  
- [ ] Security headers grade A/A+ (securityheaders.com).  
- [ ] TLS grade A (SSL Labs).  

## 4. Monitoring
- [ ] Sentry shows new release, no error spikes.  
- [ ] Supabase function logs clean.  
- [ ] Redis dedupe keys appear for webhooks.  

## 5. Rollback Plan
- [ ] Know where the **“Promote previous deploy”** button is in Vercel.  
- [ ] Stripe Dashboard bookmarked to disable webhook if needed.  
- [ ] Supabase secrets doc handy if something needs resetting.  
