# 🧪 Staging Deployment Guide (PingBuoy)

Use this guide as a **dress rehearsal** before going live. It’s a lighter version of the main deployment guide, focused on staging with test keys and preview domains.

---

## 1. Set Up Staging Environment
- [ ] Create a **Preview** or **Staging** environment in Vercel (separate from Production).
- [ ] Connect it to the same GitHub repo/branch or use a dedicated `staging` branch.

---

## 2. Environment Variables (Staging/Test)
Set these in **Vercel → Environment Variables** for Staging/Preview:

- `NEXT_PUBLIC_SUPABASE_URL` (same as prod)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same as prod)
- `STRIPE_SECRET_KEY` = **Test key** from Stripe
- `STRIPE_WEBHOOK_SECRET` = **Test signing secret**
- `REDIS_URL` = staging/test Redis instance
- `SENTRY_DSN` = staging DSN (or same DSN with staging env tag)
- `API_BASE_URL` = staging/preview domain

In **Supabase → Functions → Secrets**:
- `SERVICE_JWT_SECRET` = staging version of your JWT secret
- `ALLOWED_ORIGINS` = staging domain (comma‑separated if multiple)
- `API_BASE_URL` = staging/preview domain

---

## 3. Deploy Staging Build
- Push branch → Vercel builds Preview/Staging deployment.
- Verify build succeeds without env errors.

---

## 4. Run Staging Smoke Tests
- [ ] **Homepage & Dashboard** load with no console errors.
- [ ] **Stripe Checkout**: use `4242 4242 4242 4242` test card → payment succeeds.
- [ ] **Stripe Webhook**: trigger via Stripe CLI (`stripe trigger checkout.session.completed`) → webhook processes once (no duplicates).
- [ ] **Rate Limit**: spam contact form → expect 429 after N attempts.
- [ ] **SSRF Guard**: try adding monitor with `http://127.0.0.1:22` → should be blocked.
- [ ] **Security Headers**: check staging URL on [securityheaders.com](https://securityheaders.com).
- [ ] **TLS**: check staging URL on [SSL Labs](https://www.ssllabs.com/ssltest/).

---

## 5. Fix & Retest
- Patch any issues found.
- Redeploy staging build until all checks pass.

---

## 6. Ready for Production?
When staging tests are ✅ green:
- Merge code to `main` branch.
- Switch environment variables in Vercel to **live Stripe keys** for Production.
- Point Supabase `ALLOWED_ORIGINS` to production domain(s).
- Promote to Production and run the **Day‑of‑Deploy Checklist**.

---

Keep this guide in your repo as `STAGING-GUIDE.md` and use it before every major release.
