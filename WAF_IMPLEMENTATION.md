# WAF Implementation Guide

## 🛡️ Overview

This document outlines the minimal WAF (Web Application Firewall) implementation for PingBuoy to protect against bot scrapers and obvious abuse patterns.

## 📋 Implementation Options

### Option 1: Next.js Middleware (Recommended for Vercel)

**File**: `src/middleware.ts`

A lightweight WAF implementation using Next.js Edge Runtime that runs on Vercel's edge network.

**Features**:
- ✅ Bot detection via User-Agent patterns
- ✅ Suspicious path blocking
- ✅ SQL injection pattern detection
- ✅ XSS attempt blocking
- ✅ Rate limiting per IP
- ✅ Geographic awareness (logging only)
- ✅ Empty/missing header detection
- ✅ Buffer overflow protection (long URLs)
- ✅ CSRF enhancement (missing origin/referer)

### Option 2: Cloudflare WAF Rules

**File**: `cloudflare-waf-rules.json`

Enterprise-grade WAF rules for Cloudflare (requires Cloudflare Pro/Business plan).

**Setup**:
1. Add your domain to Cloudflare
2. Import the firewall rules via Cloudflare dashboard
3. Configure rate limiting rules
4. Enable Bot Fight Mode

### Option 3: Vercel Edge Config

**File**: `vercel-edge-config.json`

Configuration-driven WAF for Vercel Pro teams with Edge Config.

**Setup**:
1. Create Edge Config in Vercel dashboard
2. Import the configuration
3. Update middleware to use Edge Config
4. Deploy with Pro plan

## 🚦 Protection Rules

### 1. **Bot Detection**
Blocks requests with suspicious User-Agent patterns:
- Common scrapers: `curl`, `wget`, `python-requests`
- Vulnerability scanners: `nikto`, `sqlmap`, `nessus`
- Headless browsers: `puppeteer`, `selenium`, `playwright`
- API testing tools: `postman`, `insomnia`

### 2. **Path Protection**
Blocks access to commonly targeted paths:
- WordPress: `/wp-admin`, `/wp-login`, `/xmlrpc.php`
- Configuration files: `/.env`, `/config.php`, `/database.yml`
- Backup files: `/dump.sql`, `/backup`
- Admin interfaces: `/admin/login`, `/administrator`

### 3. **Injection Prevention**
Detects and blocks:
- **SQL Injection**: `union select`, `or 1=1`, `drop table`
- **XSS**: `<script>`, `javascript:`, `alert()`
- **Directory Traversal**: `../`, `%2e%2e`

### 4. **Rate Limiting**
- **100 requests/minute** per IP address
- **5-minute sliding window**
- **Burst allowance** for legitimate traffic spikes
- **Memory cleanup** to prevent resource exhaustion

### 5. **Geographic Awareness**
- Logs requests from high-risk countries
- Optional blocking (disabled by default)
- Preserves legitimate international users

### 6. **Request Validation**
- Minimum User-Agent length (10 characters)
- Maximum URL length (2000 characters)
- Required Origin/Referer for sensitive API endpoints
- Header validation for proxy manipulation

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Enable geographic blocking
ENABLE_GEO_BLOCKING=false

# Optional: Custom rate limits
WAF_RATE_LIMIT_PER_MINUTE=100
WAF_RATE_LIMIT_WINDOW=5

# Optional: Custom logging
WAF_LOG_ALL_REQUESTS=false
WAF_LOG_BLOCKED_REQUESTS=true
```

### Whitelisting Legitimate Services

The WAF automatically allows:
- Search engine bots (Google, Bing, DuckDuckGo)
- Social media crawlers (Facebook, Twitter, LinkedIn)
- Monitoring services (Pingdom, UptimeRobot)
- Health check endpoints

### Customization

Edit patterns in `src/middleware.ts`:

```typescript
// Add custom bot patterns
const CUSTOM_BOT_PATTERNS = [
  /your-custom-pattern/i
]

// Add custom blocked paths
const CUSTOM_BLOCKED_PATHS = [
  '/your-sensitive-endpoint'
]

// Adjust rate limits
const RATE_LIMITS = {
  perMinute: 150, // Increase for high-traffic sites
  burst: 20,
  windowMinutes: 5
}
```

## 📊 Monitoring & Logging

### Request Logging
All WAF decisions are logged with structured data:

```json
{
  "timestamp": "2025-01-13T10:30:00Z",
  "event": "WAF_BLOCK",
  "reason": "Bot User-Agent detected",
  "ip": "192.168.1.100",
  "userAgent": "curl/7.68.0",
  "path": "/api/sites",
  "method": "POST"
}
```

### Metrics to Monitor
- **Block rate**: Percentage of requests blocked
- **False positives**: Legitimate users blocked
- **Attack patterns**: Most common attack types
- **Geographic distribution**: Source countries
- **Rate limiting effectiveness**: Requests throttled

### Dashboard Integration

For production monitoring, integrate with:
- **Vercel Analytics**: Built-in request monitoring
- **Cloudflare Analytics**: Comprehensive traffic analysis
- **DataDog/New Relic**: Custom metrics and alerting
- **Sentry**: Error tracking and performance monitoring

## 🧪 Testing

### Test Legitimate Traffic
```bash
# Should be allowed
curl -H "User-Agent: Mozilla/5.0 (compatible; MyBot/1.0)" \
     -H "Origin: https://pingbuoy.com" \
     https://your-domain.com/api/sites

# Should be blocked - bot user agent
curl -H "User-Agent: curl/7.68.0" \
     https://your-domain.com/api/sites

# Should be blocked - suspicious path
curl https://your-domain.com/wp-admin

# Should be blocked - SQL injection
curl "https://your-domain.com/search?q=1' OR '1'='1"
```

### Rate Limit Testing
```bash
# Test rate limiting
for i in {1..110}; do
  curl -s https://your-domain.com/ > /dev/null
  echo "Request $i"
done
```

## 🚀 Deployment

### Vercel Deployment
1. Ensure `src/middleware.ts` is in your project
2. Deploy normally - middleware runs automatically
3. Monitor in Vercel Functions dashboard

### Cloudflare Setup
1. Add domain to Cloudflare
2. Update DNS to Cloudflare nameservers
3. Import WAF rules from `cloudflare-waf-rules.json`
4. Enable security features:
   - Bot Fight Mode
   - Browser Integrity Check
   - Security Level: Medium

### Edge Config (Vercel Pro)
```bash
# Create Edge Config
vercel edge-config create pingbuoy-waf

# Import configuration
vercel edge-config import --from vercel-edge-config.json
```

## ⚠️ Important Considerations

### False Positives
- **Monitor logs** for legitimate users being blocked
- **Whitelist** known good IPs/User-Agents
- **Adjust patterns** based on your application's needs

### Performance Impact
- Middleware adds ~1-5ms latency per request
- Edge execution minimizes impact
- Rate limiting uses memory - monitor usage

### Compliance
- **GDPR**: Log retention policies for IP addresses
- **Geographic restrictions**: Ensure blocking aligns with business needs
- **Accessibility**: Don't block legitimate assistive technologies

### Maintenance
- **Regular updates**: New bot patterns emerge constantly
- **Pattern refinement**: Reduce false positives over time
- **Attack adaptation**: Adjust rules based on observed attacks

## 📈 Success Metrics

### Security Metrics
- **90%+ reduction** in bot traffic
- **99%+ block accuracy** for obvious attacks
- **<1% false positive** rate for legitimate users

### Performance Metrics
- **<5ms additional latency** from WAF processing
- **Memory usage** remains stable under load
- **No impact** on legitimate user experience

---

## 🔗 Quick Start

1. **Copy** `src/middleware.ts` to your Next.js project
2. **Deploy** to Vercel (middleware auto-activates)
3. **Monitor** logs for blocked requests
4. **Adjust** patterns based on your traffic patterns
5. **Scale up** to Cloudflare for enterprise needs

✅ **Your application is now protected against common bot scrapers and abuse patterns!**