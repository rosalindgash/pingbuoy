import { NextRequest, NextResponse } from 'next/server'

// Optional Vercel geolocation (only available in production)
let getGeolocation: ((request: Request) => { country?: string } | undefined) | undefined
try {
  const vercelFunctions = require('@vercel/functions')
  getGeolocation = vercelFunctions.geolocation
} catch {
  // Fallback for local development
  getGeolocation = undefined
}

/**
 * WAF Middleware - Bot Protection and Abuse Prevention
 *
 * Minimal WAF implementation for Vercel Edge Runtime
 * Blocks obvious bots, scrapers, and abusive traffic patterns
 */

// Bot patterns to block
const BOT_PATTERNS = [
  // Common bots and scrapers
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /scanner/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /go-http-client/i,
  /http_request/i,
  /libwww-perl/i,
  /php/i,
  /java/i,
  /okhttp/i,
  /apache-httpclient/i,

  // Vulnerability scanners
  /nikto/i,
  /sqlmap/i,
  /nessus/i,
  /openvas/i,
  /nmap/i,
  /masscan/i,
  /zmap/i,
  /nuclei/i,
  /gobuster/i,
  /dirb/i,
  /dirbuster/i,
  /wpscan/i,

  // Penetration testing tools
  /burpsuite/i,
  /owasp/i,
  /metasploit/i,
  /havij/i,
  /skipfish/i,

  // API testing tools
  /postman/i,
  /insomnia/i,
  /httpie/i,
  /restclient/i,
  /bruno/i,

  // Headless browsers (often used for scraping)
  /headlesschrome/i,
  /phantomjs/i,
  /slimerjs/i,
  /htmlunit/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /chromeheadless/i,
  /firefox.*headless/i,
]

// Suspicious paths that are commonly targeted
const SUSPICIOUS_PATHS = [
  // WordPress/CMS exploitation
  '/wp-admin',
  '/wp-login',
  '/wp-content',
  '/wp-includes',
  '/xmlrpc.php',
  '/admin/login',
  '/administrator',
  '/login.php',
  '/admin.php',

  // Common web vulnerabilities
  '/.env',
  '/.git',
  '/config.php',
  '/database.yml',
  '/phpinfo.php',
  '/info.php',
  '/test.php',
  '/shell.php',
  '/backup',
  '/dump.sql',

  // API exploitation attempts
  '/v1/users',
  '/v2/users',
  '/graphql',
  '/swagger',
  '/openapi',

  // Infrastructure probing
  '/robots.txt',
  '/sitemap.xml',
  '/.DS_Store',
  '/favicon.ico',

  // Directory traversal attempts
  '../',
  '..\\',
  '%2e%2e',
  '%252e%252e',
]

// Countries known for high bot traffic (adjust based on your audience)
const HIGH_RISK_COUNTRIES = [
  'CN', // China
  'RU', // Russia
  'KP', // North Korea
  'IR', // Iran
]

// Rate limiting configuration
const RATE_LIMITS = {
  // Requests per minute per IP
  perMinute: 60,
  // Burst allowance
  burst: 10,
  // Sliding window duration (minutes)
  windowMinutes: 5
}

// In-memory rate limiting (use Redis in production)
const rateLimitMap = new Map<string, {
  requests: number[]
  lastReset: number
}>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = RATE_LIMITS.windowMinutes * 60 * 1000

  let record = rateLimitMap.get(ip)

  if (!record) {
    record = { requests: [], lastReset: now }
    rateLimitMap.set(ip, record)
  }

  // Clean old requests outside the window
  record.requests = record.requests.filter(timestamp => now - timestamp < windowMs)

  // Check if rate limit exceeded
  if (record.requests.length >= RATE_LIMITS.perMinute) {
    return true
  }

  // Add current request
  record.requests.push(now)

  // Cleanup map periodically (prevent memory leaks)
  if (rateLimitMap.size > 10000) {
    const cutoff = now - windowMs
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.lastReset < cutoff) {
        rateLimitMap.delete(key)
      }
    }
  }

  return false
}

function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  const xClientIP = request.headers.get('x-client-ip')

  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  if (xClientIP) return xClientIP

  // Fallback to connection IP (might be proxy)
  return request.ip || 'unknown'
}

function createBlockResponse(reason: string, ip: string): NextResponse {
  console.warn(`[WAF] Blocked request: ${reason}`, {
    ip,
    timestamp: new Date().toISOString(),
    reason
  })

  return new NextResponse(
    JSON.stringify({
      error: 'Access denied',
      code: 'WAF_BLOCKED',
      timestamp: new Date().toISOString()
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-Blocked-By': 'PingBuoy-WAF',
        'X-Block-Reason': reason
      }
    }
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const userAgent = request.headers.get('user-agent') || ''
  const ip = getClientIP(request)

  // Skip WAF for certain paths (adjust as needed)
  const skipPaths = [
    '/api/health',
    '/api/webhooks', // Webhooks often come from external services
    '/_next/',
    '/favicon.ico',
    '/.well-known/' // Allow RFC 5785 well-known URIs
  ]

  if (skipPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 1. Block obvious bots by User-Agent
  if (BOT_PATTERNS.some(pattern => pattern.test(userAgent))) {
    return createBlockResponse('Bot User-Agent detected', ip)
  }

  // 2. Block empty or suspicious User-Agent
  if (!userAgent || userAgent.length < 10) {
    return createBlockResponse('Missing or suspicious User-Agent', ip)
  }

  // 3. Block suspicious paths
  const suspiciousPath = SUSPICIOUS_PATHS.find(path =>
    pathname.includes(path) || pathname.toLowerCase().includes(path.toLowerCase())
  )

  if (suspiciousPath) {
    return createBlockResponse(`Suspicious path access: ${suspiciousPath}`, ip)
  }

  // 4. Block common SQL injection patterns in URL
  const sqlPatterns = [
    /union.*select/i,
    /union select/i,
    /select.*from/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /drop table/i,
    /or.*1=1/i,
    /or 1=1/i,
    /and.*1=1/i,
    /'.*or.*'/i,
    /exec.*xp_/i,
    /exec xp_/i,
    /sp_.*password/i
  ]

  if (sqlPatterns.some(pattern => pattern.test(pathname + request.nextUrl.search))) {
    return createBlockResponse('SQL injection attempt detected', ip)
  }

  // 5. Block XSS patterns in URL
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /alert\(/i,
    /document\.cookie/i,
    /window\.location/i
  ]

  if (xssPatterns.some(pattern => pattern.test(pathname + request.nextUrl.search))) {
    return createBlockResponse('XSS attempt detected', ip)
  }

  // 6. Rate limiting
  if (isRateLimited(ip)) {
    return createBlockResponse('Rate limit exceeded', ip)
  }

  // 7. Geographic blocking (optional - be careful with legitimate users)
  try {
    if (getGeolocation) {
      const geo = getGeolocation(request)
      if (geo?.country && HIGH_RISK_COUNTRIES.includes(geo.country)) {
      // Log but don't block automatically - this can affect legitimate users
      console.info(`[WAF] High-risk country access: ${geo.country}`, {
        ip,
        country: geo.country,
        pathname
      })
      }
    }
  } catch (error) {
    // Geolocation might fail, continue without blocking
    console.debug('[WAF] Geolocation unavailable')
  }

  // 8. Block requests with no Referer for sensitive endpoints
  const sensitiveEndpoints = [
    '/api/checkout',
    '/api/billing',
    '/api/sites',
    '/api/user'
  ]

  if (method === 'POST' &&
      sensitiveEndpoints.some(endpoint => pathname.startsWith(endpoint)) &&
      !request.headers.get('referer') &&
      !request.headers.get('origin')) {
    return createBlockResponse('Missing origin/referer for sensitive endpoint', ip)
  }

  // 9. Block excessively long URLs (potential buffer overflow attempts)
  if (request.url.length > 2000) {
    return createBlockResponse('Excessively long URL', ip)
  }

  // 10. Block requests with suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-originating-ip',
    'x-remote-ip',
    'x-client-ip'
  ]

  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header)
    if (value && value.includes('127.0.0.1')) {
      return createBlockResponse(`Suspicious header: ${header}`, ip)
    }
  }

  // Log legitimate requests for monitoring
  console.info('[WAF] Request allowed', {
    ip,
    method,
    pathname,
    userAgent: userAgent.substring(0, 100), // Truncate for logs
    timestamp: new Date().toISOString()
  })

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}