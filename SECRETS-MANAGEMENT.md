# Secrets Management Documentation

## Overview

This document explains PingBuoy's secrets management strategy, current implementation, and future upgrade path.

## What is a Secrets Manager?

A **secrets manager** is a secure vault for storing, accessing, and managing sensitive credentials like:
- API keys (Stripe, Supabase, SendGrid, Slack)
- Database passwords
- Webhook URLs
- Session secrets
- OAuth tokens

Instead of storing these in plaintext `.env` files or hardcoding them, secrets managers provide:
- **Encryption at rest and in transit**
- **Access controls** (who can view/edit which secrets)
- **Audit logging** (track who accessed what and when)
- **Automatic rotation** (update credentials periodically)
- **Version history** (rollback to previous values)

## Current Implementation ✅

**Status: SUFFICIENT FOR CURRENT STAGE**

PingBuoy currently uses **Vercel Environment Variables** for secrets management:

### What We Have
- All secrets stored in Vercel project settings
- Encrypted at rest by Vercel
- Available to deployed functions via `process.env`
- Separated by environment (Production, Preview, Development)
- Version control exclusion (`.env.local` in `.gitignore`)

### Current Secrets
```
# Authentication & Database
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Payments
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

# Email
SENDGRID_API_KEY
FROM_EMAIL

# Slack Webhooks
SLACK_WEBHOOK_SECURITY
SLACK_WEBHOOK_MONITORING
SLACK_WEBHOOK_PAYMENTS
SLACK_WEBHOOK_USERS
SLACK_WEBHOOK_FEEDBACK

# Rate Limiting & Caching
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Admin & Security
NEXT_PUBLIC_APP_URL
FOUNDER_EMAIL
LOG_SECURITY_WEBHOOK_URL
```

### Why This Works Now
1. **Solo founder** - Only one person needs access
2. **Vercel-hosted** - Platform provides basic encryption and access control
3. **No compliance requirements** - Not handling healthcare/financial data requiring SOC 2
4. **Small team** - No need for granular role-based access control

## When to Upgrade

### Trigger Events for Upgrading to Dedicated Secrets Manager

**UPGRADE IMMEDIATELY WHEN:**
1. **Hiring first employee** - Need role-based access controls
2. **Adding contractors** - Need temporary, revocable access
3. **Multi-cloud deployment** - Secrets needed across AWS/GCP/Azure
4. **Compliance requirements** - SOC 2, ISO 27001, HIPAA, PCI-DSS
5. **Regulatory audit** - GDPR, CCPA enforcement action

**CONSIDER UPGRADING WHEN:**
1. More than 50 secrets to manage
2. Need automatic credential rotation
3. Want detailed audit logs (who accessed what, when)
4. Deploying to non-Vercel infrastructure
5. Integrating with CI/CD pipelines beyond Vercel

## Recommended Upgrade Path

### Stage 1: Current → Mid-Tier (When hiring first employee)

**Recommended Tools:**
- **Doppler** - $10/user/month
- **1Password Secrets Automation** - $7.99/user/month

**Why:**
- Easy migration from Vercel env vars
- Good UI for team collaboration
- Reasonable pricing for small teams
- Vercel integration available

**Migration Steps:**
1. Sign up for Doppler or 1Password
2. Import existing Vercel environment variables
3. Install Doppler/1Password CLI locally
4. Update Vercel integration to sync from secrets manager
5. Remove secrets from Vercel UI (now synced automatically)
6. Set up access controls for team members

### Stage 2: Mid-Tier → Enterprise (When reaching 10+ employees or compliance needs)

**Recommended Tools:**
- **AWS Secrets Manager** - $0.40/secret/month + $0.05/10k API calls
- **HashiCorp Vault** - Open source (self-hosted) or $0.03/hour cloud

**Why:**
- Required for SOC 2 / ISO 27001 compliance
- Automatic rotation for database credentials
- Fine-grained access policies
- Audit logging meets regulatory requirements
- Integration with cloud infrastructure (EC2, Lambda, RDS)

**Migration Steps:**
1. Set up AWS Secrets Manager or Vault instance
2. Import secrets from Doppler/1Password via CLI
3. Update application code to use AWS SDK or Vault client
4. Configure automatic rotation policies
5. Set up CloudWatch/Vault audit logging
6. Implement least-privilege IAM policies

## Cost Comparison

### Current: $0/month
- Vercel environment variables (included in hosting plan)

### Stage 1: ~$10-20/month
- Doppler Pro: $10/user/month (2 users = $20)
- 1Password Teams: $7.99/user/month (2 users = $16)

### Stage 2: ~$50-200/month
- AWS Secrets Manager: ~$20-50/month (50 secrets, moderate API calls)
- HashiCorp Vault Cloud: ~$100-200/month (starter cluster)

## Security Benefits of Upgrading

| Feature | Vercel Env Vars | Doppler/1Password | AWS/Vault |
|---------|----------------|-------------------|-----------|
| Encryption at rest | ✅ | ✅ | ✅ |
| Encryption in transit | ✅ | ✅ | ✅ |
| Access control | ⚠️ (Vercel team only) | ✅ (Role-based) | ✅ (Fine-grained) |
| Audit logging | ❌ | ✅ | ✅ |
| Automatic rotation | ❌ | ⚠️ (Limited) | ✅ |
| Version history | ⚠️ (Git deployments) | ✅ | ✅ |
| Secret scanning | ❌ | ✅ | ✅ |
| Compliance certifications | ⚠️ (Vercel SOC 2) | ✅ | ✅ |

## Implementation Checklist for Future Upgrade

**When ready to upgrade (hiring first employee):**

- [ ] Choose secrets manager (Doppler recommended)
- [ ] Sign up and create organization
- [ ] Import all Vercel environment variables
- [ ] Install CLI tool locally (`npm install -g @dopplerhq/cli`)
- [ ] Set up Vercel integration (automatic sync)
- [ ] Create access policy for new employee
- [ ] Test in Preview environment first
- [ ] Update deployment documentation
- [ ] Train team on secrets access workflow
- [ ] Remove secrets from Vercel UI (use sync only)
- [ ] Document rotation procedures

## Current Best Practices (No Secrets Manager)

Since we're not using a dedicated secrets manager yet, follow these rules:

1. **NEVER commit `.env.local` to Git** (already in `.gitignore` ✅)
2. **Use Vercel env vars for all environments** (Production, Preview, Development) ✅
3. **Rotate Stripe webhook secret quarterly** (set calendar reminder)
4. **Rotate Supabase service role key quarterly** (set calendar reminder)
5. **Use `NEXT_PUBLIC_` prefix only for non-sensitive vars** ✅
6. **Document all secrets in this file** (list above ✅)
7. **Use strong, unique values** (minimum 32 characters for secrets)
8. **Separate production and development secrets** (different Stripe accounts ✅)

## Emergency Procedures

### If Secrets Are Leaked

1. **Immediately rotate compromised secrets:**
   - Stripe: Dashboard → Developers → API Keys → Roll key
   - Supabase: Dashboard → Settings → API → Create new service role key
   - Slack: Workspace Settings → Apps → Regenerate webhook URL
   - SendGrid: Email API → API Keys → Create new key

2. **Update Vercel environment variables** with new values

3. **Redeploy application** to pick up new secrets

4. **Revoke old secrets** after verifying new ones work

5. **Investigate leak source:**
   - Check Git history (`git log -p -S "STRIPE_SECRET_KEY"`)
   - Review recent commits for `.env` files
   - Check if logged to error tracking services
   - Review team member access

6. **Document incident** in security log

## References

- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [Doppler Documentation](https://docs.doppler.com/)
- [1Password Secrets Automation](https://developer.1password.com/docs/secrets-automation)
- [AWS Secrets Manager User Guide](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)

## Decision

**Current decision: Continue using Vercel environment variables until hiring first employee.**

**Rationale:**
- Solo founder, no team access needed
- No compliance requirements (SOC 2, ISO 27001, etc.)
- All infrastructure on Vercel platform
- Vercel provides adequate encryption and access control
- Cost-effective ($0 vs $10-20/month)
- Simple workflow (no additional CLI tools needed)

**Review date: When hiring first employee or contractor**

---

*Last updated: 2025-10-05*
*Author: Claude (via security audit findings)*
*Status: Active*
