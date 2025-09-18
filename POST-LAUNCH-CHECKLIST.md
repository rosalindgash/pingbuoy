# 🕵🏽‍♀️ Post-Launch Monitoring Checklist (PingBuoy)

Monitor PingBuoy closely in the first 48 hours after go-live to catch any issues early.

---

## 🕛 Immediate (First Few Hours)
- [ ] Watch **Sentry dashboard** → confirm no error spikes.  
- [ ] Check **Stripe live webhooks** → verify events marked *success* (no retries/failures).  
- [ ] Confirm **rate limiting** still works with live Redis (spam contact form).  
- [ ] Test one small **live payment** yourself ($1 test product or coupon).  
- [ ] Monitor **Supabase logs** for unexpected 401/403 errors.  

---

## 🕐 First 24 Hours
- [ ] Review **Sentry performance traces** → look for slow API routes.  
- [ ] Monitor **Redis dashboard** → confirm webhook dedupe keys appear and expire.  
- [ ] Check **Supabase database** → ensure RLS rules block access between users (try querying from a different account).  
- [ ] Check **email logs** → verify emails are being sent at normal rate, no spikes.  

---

## 🕓 First 48 Hours
- [ ] Run your domain through [securityheaders.com](https://securityheaders.com) (expect A/A+).  
- [ ] Run SSL/TLS test on [SSL Labs](https://www.ssllabs.com/ssltest) (expect A).  
- [ ] Spot-check backups (Supabase → create temp DB → restore snapshot).  
- [ ] Run one external vuln scan (PentestTools/ImmuniWeb) to get a clean report.  
- [ ] Double-check billing in Stripe → no duplicate charges, refunds, or webhook misfires.  

---

## 🔄 Ongoing Maintenance
- **Weekly**: glance at Sentry → errors/perf spikes.  
- **Monthly**: run external vuln scan, review access logs, rotate low-priority secrets (like Redis).  
- **Quarterly**: tabletop exercise (simulate incident + rollback), restore DB backup to a temp project.  
- **Annually**: audit your `SECURITY.md`, update policies, review dependency licenses.  

---

Keep this file in your repo as `POST-LAUNCH-CHECKLIST.md` and run through it during the critical first days and on your maintenance cadence.
