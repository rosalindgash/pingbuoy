# 🔄 Rollback Playbook (PingBuoy)

Use this guide if something goes wrong after a deploy. It outlines step-by-step how to quickly revert, stabilize, and recover.

---

## 1. Rollback Vercel Deployment
- [ ] Go to **Vercel → Project → Deployments**.  
- [ ] Find the **last known good deploy**.  
- [ ] Click **Promote to Production**.  
- [ ] Verify your domain now serves the older stable version.  

⏱️ Expected time: 2–3 minutes.

---

## 2. Supabase Functions & Secrets
- [ ] If the issue is caused by a bad function update, redeploy the **previous function version** with:  
  ```bash
  supabase functions deploy FUNCTION_NAME --project-ref your-project-ref --import-map old-build
  ```
- [ ] If secrets were misconfigured, go to **Supabase → Functions → Secrets**, fix values, and **redeploy functions**.  

⏱️ Expected time: 5 minutes.

---

## 3. Stripe Webhooks
- [ ] If webhook events are failing, temporarily **disable the webhook endpoint** in the Stripe Dashboard.  
- [ ] Investigate logs, fix env vars or signature mismatch.  
- [ ] Re-enable once confirmed stable.  

⏱️ Expected time: 1–2 minutes.

---

## 4. Redis / Rate Limiting Issues
- [ ] If Redis misconfiguration causes failures, switch env var to fallback (if available).  
- [ ] Otherwise, set `RATE_LIMIT_DISABLED=true` temporarily in Vercel env vars, redeploy.  
- [ ] Investigate Redis connectivity after stabilization.  

⏱️ Expected time: 5 minutes.

---

## 5. Database & RLS Issues
- [ ] If RLS policies are blocking legitimate queries:  
  - In **Supabase Dashboard**, temporarily toggle *Disable RLS* for the affected table.  
  - Fix policy rules and re-enable RLS once patched.  
- [ ] Always document what was changed for audit trail.  

⏱️ Expected time: 5–10 minutes.

---

## 6. Emergency Fallback Plan
- [ ] If none of the above restores stability:  
  - Put up a **maintenance page** in Vercel (simple static HTML).  
  - Communicate outage on status page/Twitter.  
  - Resume investigation safely without user traffic hitting broken code.  

---

## 7. Post-Rollback Actions
- [ ] Document the root cause and timeline of the issue.  
- [ ] Patch code/config in staging environment.  
- [ ] Test fixes against staging smoke tests.  
- [ ] Redeploy to production only after staging is ✅ green.  

---

## Contacts
- **Vercel Support**: https://vercel.com/support  
- **Supabase Support**: https://supabase.com/support  
- **Stripe Support**: https://support.stripe.com/  
- **Redis/Upstash Support**: https://upstash.com/support  

---

Keep this file in your repo as `ROLLBACK.md` and review it quarterly during tabletop exercises.
