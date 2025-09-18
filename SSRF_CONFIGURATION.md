# SSRF Defense Configuration

This document outlines the SSRF (Server-Side Request Forgery) defense configuration options for PingBuoy monitoring services.

## Environment Variables

### Security Policy
```bash
# Overall security policy level
SSRF_SECURITY_POLICY=high  # Options: maximum, high, balanced, development
```

### Basic Protection Settings
```bash
# Allow requests to private IP ranges (10.x.x.x, 192.168.x.x, etc.)
SSRF_ALLOW_PRIVATE_IPS=false

# Allow requests to localhost/127.0.0.1
SSRF_ALLOW_LOCALHOST=false

# Allow requests to loopback interfaces
SSRF_ALLOW_LOOPBACK=false

# Allow requests to cloud metadata services (DANGEROUS!)
SSRF_ALLOW_METADATA=false

# Whether to follow HTTP redirects
SSRF_FOLLOW_REDIRECTS=true
```

### Monitoring Service Settings
```bash
# Maximum redirects to follow for monitoring
SSRF_MONITORING_MAX_REDIRECTS=3

# Request timeout for monitoring in milliseconds
SSRF_MONITORING_TIMEOUT=15000

# DNS resolution timeout for monitoring
SSRF_MONITORING_DNS_TIMEOUT=3000

# Allowed ports for monitoring (comma-separated)
SSRF_MONITORING_PORTS=80,443,8080,8443

# User agent for monitoring requests
SSRF_MONITORING_USER_AGENT="PingBuoy-Monitor/2.0"
```

### Strict Validation Settings (User Input)
```bash
# Maximum redirects for user-submitted URLs
SSRF_STRICT_MAX_REDIRECTS=2

# Timeout for user URL validation
SSRF_STRICT_TIMEOUT=10000

# DNS timeout for user URL validation
SSRF_STRICT_DNS_TIMEOUT=2000

# Allowed ports for user URLs
SSRF_STRICT_PORTS=80,443

# User agent for strict validation
SSRF_STRICT_USER_AGENT="PingBuoy-Validator/2.0"
```

### Performance Monitoring Settings
```bash
# Maximum redirects for performance checks
SSRF_PERFORMANCE_MAX_REDIRECTS=2

# Timeout for performance monitoring
SSRF_PERFORMANCE_TIMEOUT=30000

# DNS timeout for performance monitoring
SSRF_PERFORMANCE_DNS_TIMEOUT=5000

# Allowed ports for performance monitoring
SSRF_PERFORMANCE_PORTS=80,443

# User agent for performance monitoring
SSRF_PERFORMANCE_USER_AGENT="PingBuoy-Performance/2.0"
```

### Allowlists and Blocklists
```bash
# Comma-separated list of allowed domains
SSRF_ALLOWED_DOMAINS=example.com,trusted-site.org

# Comma-separated list of blocked domains
SSRF_BLOCKED_DOMAINS=malicious-site.com,internal.company

# Comma-separated list of allowed IP addresses
SSRF_ALLOWED_IPS=203.0.113.1,198.51.100.1

# Comma-separated list of blocked IP addresses
SSRF_BLOCKED_IPS=192.0.2.1,198.51.100.100
```

## Security Policy Templates

### Maximum Security
- Only HTTPS (port 443)
- No redirects
- 5 second timeout
- No private IPs, localhost, or metadata services

### High Security (Production Default)
- HTTP and HTTPS (ports 80, 443)
- Max 2 redirects
- 10 second timeout
- No private IPs, localhost, or metadata services

### Balanced (Development Default)
- HTTP, HTTPS, and common alternates (80, 443, 8080, 8443)
- Max 3 redirects
- 15 second timeout
- No private IPs, localhost, or metadata services

### Development
- All common ports including development (3000, 8000, 8080, 8443)
- Max 5 redirects
- 30 second timeout
- Allows private IPs and localhost (metadata services still blocked)

## Implementation Details

### Monitored Attack Vectors

1. **Private IP Access**: Blocks RFC 1918 private networks
   - 10.0.0.0/8
   - 172.16.0.0/12
   - 192.168.0.0/16
   - 127.0.0.0/8 (localhost)
   - 169.254.0.0/16 (link-local)

2. **Cloud Metadata Services**: Blocks access to
   - 169.254.169.254 (AWS, Azure, GCP)
   - 169.254.170.2 (AWS ECS)
   - 100.100.100.200 (Alibaba Cloud)

3. **Dangerous Ports**: Blocks common internal service ports
   - SSH (22), Telnet (23), SMTP (25)
   - DNS (53), POP3 (110), IMAP (143)
   - Database ports (3306, 5432, 27017, etc.)
   - Redis (6379), Elasticsearch (9200)

4. **Protocol Restrictions**: Only HTTP and HTTPS allowed

5. **Redirect Validation**: Each redirect is validated against SSRF rules

### DNS Resolution Security

- Resolves hostnames to IP addresses before making requests
- Validates resolved IPs against private/reserved ranges
- Configurable DNS timeout to prevent slow DNS attacks
- IPv4 and IPv6 support

### Request Security

- Custom User-Agent identification
- Configurable timeouts to prevent resource exhaustion
- Manual redirect following with validation at each step
- Abort signals for timeout enforcement

## Usage Examples

### Basic Monitoring
```typescript
import { validateMonitoringUrl, safeFetchForMonitoring } from '@/lib/ssrf-defense'

// Validate URL before monitoring
const validation = await validateMonitoringUrl('https://example.com')
if (!validation.isValid) {
  throw new Error(`Invalid URL: ${validation.reason}`)
}

// Perform safe monitoring request
const response = await safeFetchForMonitoring('https://example.com', {
  method: 'HEAD'
})
```

### Strict User Input Validation
```typescript
import { validateStrictUrl } from '@/lib/ssrf-defense'

// Validate user-submitted URL
const validation = await validateStrictUrl(userSubmittedUrl)
if (!validation.isValid) {
  return { error: `URL not allowed: ${validation.reason}` }
}
```

### Performance Monitoring
```typescript
import { validatePerformanceUrl } from '@/lib/ssrf-defense'

// Validate URL for performance testing
const validation = await validatePerformanceUrl(siteUrl)
if (!validation.isValid) {
  return { success: false, error: validation.reason }
}
```

## Best Practices

1. **Default Deny**: Start with restrictive settings and allow specific exceptions
2. **Environment Separation**: Use different policies for development vs production
3. **Logging**: Enable SSRF defense logging in development for debugging
4. **Regular Review**: Periodically review allowlists and security policies
5. **Monitoring**: Monitor SSRF defense logs for blocked requests
6. **Testing**: Test SSRF defenses regularly with known attack vectors

## Common Configurations

### Production SaaS
```bash
SSRF_SECURITY_POLICY=high
SSRF_ALLOW_PRIVATE_IPS=false
SSRF_MONITORING_TIMEOUT=15000
SSRF_STRICT_TIMEOUT=10000
```

### Enterprise Internal
```bash
SSRF_SECURITY_POLICY=balanced
SSRF_ALLOWED_DOMAINS=company.com,internal.company.com
SSRF_MONITORING_PORTS=80,443,8080,8443
```

### Development Environment
```bash
SSRF_SECURITY_POLICY=development
SSRF_ALLOW_LOCALHOST=true
SSRF_ALLOW_PRIVATE_IPS=true
SSRF_MONITORING_TIMEOUT=30000
```