# Security CI/CD Implementation Guide

## 🛡️ Overview

This document outlines the comprehensive security CI/CD implementation for PingBuoy, including automated secrets scanning with Gitleaks and commit signing verification.

## 📋 Components Implemented

### 1. **Gitleaks Configuration** (`.gitleaks.toml`)

Advanced secrets detection configuration tailored for the PingBuoy application stack.

**Features**:
- ✅ **Custom Rules**: Stripe, Supabase, NextAuth, Redis, SMTP secrets
- ✅ **Generic Patterns**: API keys, database URLs, JWT secrets, private keys
- ✅ **Smart Allowlisting**: Test keys, documentation examples, placeholders
- ✅ **Path Exclusions**: Build directories, dependencies, logs
- ✅ **Performance Optimized**: Stopwords and focused scanning

**Detected Secret Types**:
- Stripe API keys (live, restricted, publishable)
- Supabase keys (service role, anon)
- NextAuth secrets
- Redis passwords and URLs
- SMTP credentials
- Webhook secrets
- OpenAI/Anthropic API keys
- Database connection strings
- Private keys and certificates

### 2. **GitHub Actions Workflows**

Enhanced security scanning workflow with multiple security tools.

**File**: `.github/workflows/security-scan.yml`

**Security Scanning Jobs**:
- **Secrets Detection**: Gitleaks + TruffleHog dual scanning
- **Dependency Vulnerabilities**: npm audit with high/critical blocking
- **Code Analysis**: CodeQL security-extended queries
- **Static Analysis**: Semgrep security rules
- **Container Scanning**: Trivy filesystem scan
- **Supply Chain**: SBOM generation and license checking
- **AI/ML Security**: Detection of AI-related security patterns

**Commit Verification Job**:
- **Signature Checking**: Verifies GPG signatures on PR commits
- **Educational Warnings**: Provides guidance for unsigned commits
- **PR Comments**: Automated feedback on commit signing status
- **Flexible Enforcement**: Warning mode (easily switched to blocking)

### 3. **Pre-commit Hooks** (`.pre-commit-config.yaml`)

Local development security scanning before commits reach the repository.

**Hook Categories**:
- **General Quality**: Trailing whitespace, file formatting, merge conflicts
- **Secrets Detection**: Gitleaks local scanning
- **Code Quality**: ESLint with security rules, Prettier formatting
- **Security Scanning**: Semgrep static analysis
- **Environment Safety**: .env file detection and blocking
- **Dependency Audit**: npm vulnerability checking
- **Security TODOs**: Detection of security-related TODO comments
- **Configuration Validation**: Security middleware and CSRF checks

### 4. **Branch Protection Configuration**

Documentation for GitHub branch protection settings.

**File**: `.github/branch-protection.yml`

**Protection Features**:
- **Required Reviews**: Pull request approval requirements
- **Status Checks**: Mandatory security scan passing
- **Linear History**: Optional clean commit history
- **Admin Enforcement**: Optional admin bypass prevention
- **Signed Commits**: Configurable GPG signature requirements

### 5. **Developer Setup Script**

Automated commit signing setup for development teams.

**File**: `scripts/setup-commit-signing.sh`

**Setup Features**:
- **Environment Detection**: Checks for GPG and Git installation
- **Key Management**: Existing key detection or new key generation
- **Git Configuration**: Automatic signing setup
- **GitHub Integration**: Public key export for GitHub
- **Testing**: Commit signing verification
- **Cross-platform**: Windows, macOS, Linux support

## 🔧 Setup Instructions

### 1. Initial Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/pingbuoy.git
cd pingbuoy

# Install pre-commit (Python required)
pip install pre-commit

# Install the pre-commit hooks
pre-commit install

# Test the hooks
pre-commit run --all-files
```

### 2. Commit Signing Setup

```bash
# Run the automated setup script
chmod +x scripts/setup-commit-signing.sh
./scripts/setup-commit-signing.sh

# Or manual setup:
# 1. Generate GPG key
gpg --full-generate-key

# 2. Configure Git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# 3. Export public key for GitHub
gpg --armor --export YOUR_KEY_ID
```

### 3. GitHub Repository Configuration

#### Enable Branch Protection

1. Go to **Settings → Branches**
2. Add rule for `main` branch
3. Enable required status checks:
   - `Secrets and Security Scan`
   - `CodeQL`
   - `Dependency Review`
   - `Commit Signature Verification` (optional)

#### Optional: Require Signed Commits

```yaml
# In branch protection settings
required_signatures: true
```

#### Configure Repository Secrets

Add these secrets in **Settings → Secrets and variables → Actions**:

```bash
# Optional: Gitleaks Pro license
GITLEAKS_LICENSE=your_license_key
```

### 4. Local Development Workflow

#### Before First Commit

```bash
# Setup commit signing (one-time)
./scripts/setup-commit-signing.sh

# Install pre-commit hooks (one-time)
pre-commit install
```

#### Daily Development

```bash
# Regular commits (automatically signed and scanned)
git add .
git commit -m "Your commit message"

# Pre-commit hooks will:
# ✓ Scan for secrets with Gitleaks
# ✓ Run ESLint security rules
# ✓ Format code with Prettier
# ✓ Check for .env files
# ✓ Validate configurations
```

#### Manual Security Scanning

```bash
# Run Gitleaks manually
gitleaks detect --source . --config .gitleaks.toml

# Run all pre-commit hooks
pre-commit run --all-files

# Run npm audit
npm audit --audit-level=high
```

## 🚨 Security Incident Response

### When Secrets Are Detected

1. **Immediate Action**:
   - Stop the commit/push process
   - Do not ignore or bypass the warning
   - Identify the detected secret

2. **Secret Remediation**:
   - Remove the secret from code
   - Add to `.gitleaks.toml` allowlist if false positive
   - Rotate the actual secret if real
   - Update environment variables

3. **History Cleanup** (if secret was committed):
   ```bash
   # Remove secret from Git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all

   # Or use BFG Repo-Cleaner (recommended)
   java -jar bfg.jar --delete-files 'secret-file.txt' .
   ```

### When Security Scans Fail

1. **Review Scan Results**:
   - Download artifacts from failed GitHub Actions
   - Review SARIF reports for details
   - Check specific vulnerability descriptions

2. **Remediation Priority**:
   - **Critical**: Fix immediately, block deployment
   - **High**: Fix within 24 hours
   - **Medium**: Fix within 1 week
   - **Low**: Fix in next release cycle

3. **False Positive Handling**:
   - Add to appropriate allowlists
   - Update scan configurations
   - Document reasoning for exclusions

## 📊 Monitoring and Metrics

### CI/CD Security Metrics

Track these metrics in your dashboards:

- **Secrets Detection Rate**: Secrets caught per 1000 commits
- **False Positive Rate**: Invalid detections per scan
- **Scan Performance**: Average scan duration
- **Commit Signing Rate**: Percentage of signed commits
- **Vulnerability Resolution Time**: Time to fix critical issues

### Security Scan Results

Monitor these outputs:

- **Gitleaks Reports**: `.sarif` format for security tools
- **npm Audit Results**: JSON vulnerability reports
- **CodeQL Findings**: GitHub Security tab
- **Dependency Reviews**: Pull request checks
- **Pre-commit Statistics**: Hook success/failure rates

## 🔧 Configuration Customization

### Adjusting Gitleaks Rules

```toml
# Add custom secret patterns
[[rules]]
id = "custom-api-key"
description = "Custom API Key Pattern"
regex = '''custom_api_[a-zA-Z0-9]{32}'''
keywords = ["custom_api"]

# Allowlist false positives
[allowlist]
regexes = [
    '''test_key_[a-zA-Z0-9]{24}''',
    '''example_[a-zA-Z0-9]{24}'''
]
```

### Customizing Pre-commit Hooks

```yaml
# Disable specific hooks
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
        # Disable for certain file types
        exclude: '\.md$'
```

### GitHub Actions Customization

```yaml
# Adjust security scan frequency
on:
  schedule:
    # Run daily instead of weekly
    - cron: '0 2 * * *'

# Add custom security checks
- name: Custom Security Check
  run: |
    echo "Running custom security validation..."
    ./scripts/custom-security-check.sh
```

## 🚀 Advanced Features

### Enforcing Commit Signatures

To require signed commits (blocks unsigned commits):

1. **Update GitHub Branch Protection**:
   ```yaml
   required_signatures: true
   ```

2. **Update Workflow** (uncomment in `security-scan.yml`):
   ```bash
   # Change warning to error
   exit 1  # Uncomment this line
   ```

### Enterprise Gitleaks Features

With Gitleaks Pro license:

```yaml
env:
  GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
```

**Pro Features**:
- Custom rule libraries
- Advanced reporting
- Enterprise integrations
- Priority support

### Integration with Security Tools

**SIEM Integration**:
```bash
# Forward security events to SIEM
curl -X POST "https://your-siem.com/api/events" \
  -H "Content-Type: application/json" \
  -d @gitleaks-report.json
```

**Slack Notifications**:
```yaml
- name: Notify Slack on Security Issues
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: "🚨 Security scan failed in ${{ github.repository }}"
```

## ⚠️ Important Security Notes

### Secrets Management Best Practices

1. **Never commit secrets** - use environment variables
2. **Rotate compromised secrets** immediately
3. **Use least-privilege access** for service accounts
4. **Regular secret audits** - review and rotate periodically
5. **Monitor secret usage** - track API key access patterns

### Commit Signing Security

1. **Protect GPG private keys** - use strong passphrases
2. **Backup GPG keys** - store securely offline
3. **Revoke compromised keys** - update GitHub immediately
4. **Regular key rotation** - consider annual key updates
5. **Team key management** - maintain team key registry

### CI/CD Security

1. **Secure runner environments** - use trusted runners only
2. **Protect workflow secrets** - minimize secret exposure
3. **Review workflow changes** - security team approval required
4. **Monitor CI/CD logs** - watch for suspicious activity
5. **Regular security updates** - keep actions and tools updated

---

## ✅ Implementation Checklist

### Repository Setup
- [ ] Gitleaks configuration file created (`.gitleaks.toml`)
- [ ] GitHub Actions workflow updated (`security-scan.yml`)
- [ ] Pre-commit hooks configured (`.pre-commit-config.yaml`)
- [ ] Branch protection documented (`.github/branch-protection.yml`)
- [ ] Setup scripts created (`scripts/setup-commit-signing.sh`)

### Team Setup
- [ ] All developers have GPG keys configured
- [ ] Pre-commit hooks installed on all dev machines
- [ ] Team trained on security incident response
- [ ] Security scan failure procedures documented
- [ ] Emergency contact list for security issues created

### Operational
- [ ] Security metrics dashboard created
- [ ] Alert channels configured (Slack/email)
- [ ] Regular security review meetings scheduled
- [ ] Vulnerability remediation SLAs defined
- [ ] Security scan result review process established

### Compliance
- [ ] Security policy documentation updated
- [ ] Audit logging configured
- [ ] Compliance reporting automated
- [ ] Security training materials created
- [ ] Incident response playbooks updated

🎉 **Your repository is now protected with enterprise-grade security scanning and commit verification!**