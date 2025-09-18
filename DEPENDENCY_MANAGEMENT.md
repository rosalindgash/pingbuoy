# 🔄 Automated Dependency Management

## Overview

This project uses **Dependabot** and **Renovate** for automated dependency updates with a focus on security patches for critical packages including **Next.js**, **Supabase**, and **Stripe**.

## 🛡️ Security-First Strategy

### Critical Packages (Auto-update enabled)
- **Next.js** (`next`) - Framework updates
- **Supabase** (`@supabase/*`) - Database and authentication
- **Stripe** (`stripe`, `@stripe/*`) - Payment processing
- **Security Libraries** (`jose`, `bcryptjs`, etc.)

### Update Priorities
1. **🚨 Critical Security Patches** - Immediate (any time)
2. **⚡ High Priority** - Next.js, Supabase, Stripe patches
3. **📦 Regular Updates** - Other dependencies (weekly)
4. **🔧 Dev Dependencies** - Development tools (weekly)

## 🤖 Dependabot Configuration

### Schedule
- **Security updates**: Immediate
- **Regular updates**: Mondays at 9:00 AM EST
- **GitHub Actions**: Mondays at 10:00 AM EST

### Auto-merge Criteria
- ✅ Security patches (all)
- ✅ Patch updates for production dependencies
- ✅ Minor updates for critical packages (Next.js, Supabase, Stripe)
- ❌ Major updates (manual review required)

### Files
- `.github/dependabot.yml` - Main configuration
- `.github/workflows/dependency-security-check.yml` - Security validation
- `audit-ci.json` - Security audit policies

## 🔧 Renovate Configuration (Alternative)

Renovate provides more advanced dependency management:

### Key Features
- **OSF Scorecard integration** for security scoring
- **Vulnerability alerts** with immediate updates
- **Lock file maintenance** (Mondays at 5:00 AM)
- **Docker digest pinning** for container security

### Auto-merge Rules
```json
{
  "Critical security": "Always auto-merge",
  "Supabase/Stripe patches": "Auto-merge after tests",
  "Next.js minor": "Manual review",
  "Major updates": "Manual review + breaking changes review"
}
```

## 🔍 Security Validation Workflow

Every dependency update triggers:

### 1. Security Audit
- `npm audit` with moderate/high/critical filtering
- `audit-ci` for strict security policies
- Known vulnerability database checks

### 2. License Compliance
- GPL/AGPL/LGPL license detection
- License report generation
- Compliance validation

### 3. Critical Package Validation
- Version compatibility checks
- Known vulnerable version detection
- Integration testing

### 4. Build & Test
- Security-focused ESLint (`npm run lint:security`)
- Full application build
- Test suite execution

### 5. Auto-approval
Safe updates are automatically approved if:
- ✅ All security checks pass
- ✅ Build succeeds
- ✅ Tests pass
- ✅ License compliance verified

## 📦 Package Categories

### 🚨 Security Critical
```json
[
  "next",
  "@supabase/supabase-js", "@supabase/ssr",
  "stripe", "@stripe/stripe-js",
  "jose", "bcryptjs"
]
```

### 🔐 Authentication & Security
```json
[
  "jose", "bcrypt*", "*auth*",
  "jsonwebtoken", "passport*", "crypto*"
]
```

### ⚛️ React Ecosystem
```json
[
  "react*", "@radix-ui/*", "lucide-react"
]
```

### 🛠️ Development Tools
```json
[
  "eslint*", "@typescript-eslint/*", "typescript",
  "prettier", "jest", "@types/*"
]
```

## 🚨 Security Alerts

### Immediate Actions
- **Critical/High vulnerabilities** → Immediate PR creation
- **Security advisories** → Auto-merge after validation
- **Known exploits** → Manual review + urgent deployment

### Alert Channels
- **GitHub Security Advisories**
- **Dependabot Security Updates**
- **OSF Scorecard** (via Renovate)
- **npm audit** (automated checks)

## 📋 Manual Review Required

### Major Version Updates
- Breaking changes assessment
- Integration testing
- Documentation updates
- Rollback plan preparation

### Framework Updates
- **Next.js major versions** - App router changes, API changes
- **React major versions** - Breaking changes, deprecated features
- **Node.js major versions** - Runtime compatibility

## 🛠️ Commands

### Security Audit
```bash
# Run comprehensive security audit
npm audit --audit-level=moderate

# Strict security validation
npx audit-ci --moderate

# Generate audit report
npm audit --json > security-report.json
```

### License Checking
```bash
# Check package licenses
npx license-checker --failOn 'GPL;AGPL;LGPL'

# Generate license report
npx license-checker --json > licenses.json
```

### Update Management
```bash
# Update all patch versions
npm update

# Check for outdated packages
npm outdated

# Security-focused linting
npm run lint:security
```

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| `.github/dependabot.yml` | Dependabot automation rules |
| `renovate.json` | Renovate configuration (alternative) |
| `audit-ci.json` | Security audit policies |
| `.github/workflows/dependency-security-check.yml` | Security validation workflow |

## 🎯 Best Practices

### 1. Regular Monitoring
- Review security dashboard weekly
- Monitor failed security checks
- Track update success rates

### 2. Testing Strategy
- All updates must pass full test suite
- Integration tests for critical packages
- Security-focused linting validation

### 3. Rollback Procedures
- Keep previous working version documented
- Monitor post-update application health
- Immediate rollback for security failures

### 4. Communication
- Security updates documented in commit messages
- Breaking changes communicated to team
- Update logs maintained for compliance

## 🔗 Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Renovate Documentation](https://docs.renovatebot.com/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [GitHub Security Advisories](https://github.com/advisories)
- [OSF Scorecard](https://securityscorecards.dev/)

---

**🛡️ Security Note**: This configuration prioritizes security patches for payment processing (Stripe), user authentication (Supabase), and application framework (Next.js) components to minimize security exposure while maintaining system stability.