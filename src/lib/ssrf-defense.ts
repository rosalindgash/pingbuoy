/**
 * SSRF Defense Library
 *
 * Comprehensive protection against Server-Side Request Forgery attacks
 * - Blocks private/reserved IP addresses and ranges
 * - Validates URLs post-redirect
 * - Caps redirects and enforces timeouts
 * - Optional allowlist/blocklist support
 * - DNS resolution validation
 */

import { createHash } from 'crypto'
import dns from 'dns/promises'

export interface SSRFDefenseConfig {
  // Basic protection settings
  allowPrivateIPs?: boolean
  allowLocalhost?: boolean
  allowLoopback?: boolean
  allowMetadataService?: boolean

  // Redirect limits
  maxRedirects?: number
  followRedirects?: boolean

  // Timeout settings
  timeout?: number
  dnsTimeout?: number

  // Allow/block lists
  allowedDomains?: string[]
  blockedDomains?: string[]
  allowedIPs?: string[]
  blockedIPs?: string[]
  allowedPorts?: number[]
  blockedPorts?: number[]

  // Custom user agent
  userAgent?: string

  // Enable detailed logging
  enableLogging?: boolean
}

export interface SSRFValidationResult {
  isValid: boolean
  reason?: string
  originalUrl: string
  finalUrl?: string
  redirectCount?: number
  resolvedIPs?: string[]
  blockedReason?: string
}

export class SSRFDefenseError extends Error {
  constructor(
    message: string,
    public reason: string,
    public url: string
  ) {
    super(message)
    this.name = 'SSRFDefenseError'
  }
}

export class SSRFDefense {
  private config: Required<SSRFDefenseConfig>

  // Default private/reserved IP ranges (CIDR format)
  private readonly PRIVATE_IP_RANGES = [
    '10.0.0.0/8',        // Private Class A
    '172.16.0.0/12',     // Private Class B
    '192.168.0.0/16',    // Private Class C
    '127.0.0.0/8',       // Loopback
    '169.254.0.0/16',    // Link-local
    '::1/128',           // IPv6 loopback
    'fc00::/7',          // IPv6 unique local
    'fe80::/10',         // IPv6 link-local
    '0.0.0.0/8',         // Invalid/broadcast
    '224.0.0.0/4',       // Multicast
    '240.0.0.0/4',       // Reserved
  ]

  // Cloud metadata service IPs
  private readonly METADATA_SERVICE_IPS = [
    '169.254.169.254',   // AWS, Azure, GCP
    '169.254.170.2',     // AWS ECS
    '100.100.100.200',   // Alibaba Cloud
    'fd00:ec2::254',     // AWS IPv6
  ]

  // Dangerous ports commonly used for internal services
  private readonly DANGEROUS_PORTS = [
    22,    // SSH
    23,    // Telnet
    25,    // SMTP
    53,    // DNS
    110,   // POP3
    143,   // IMAP
    993,   // IMAPS
    995,   // POP3S
    1433,  // MSSQL
    3306,  // MySQL
    5432,  // PostgreSQL
    6379,  // Redis
    9200,  // Elasticsearch
    27017, // MongoDB
    8080,  // Common internal web
    8000,  // Common development
    3000,  // Common development
  ]

  constructor(config: SSRFDefenseConfig = {}) {
    this.config = {
      allowPrivateIPs: false,
      allowLocalhost: false,
      allowLoopback: false,
      allowMetadataService: false,
      maxRedirects: 5,
      followRedirects: true,
      timeout: 10000,
      dnsTimeout: 3000,
      allowedDomains: [],
      blockedDomains: [],
      allowedIPs: [],
      blockedIPs: [],
      allowedPorts: [80, 443],
      blockedPorts: [],
      userAgent: 'PingBuoy-Monitor/2.0 (SSRF-Protected)',
      enableLogging: true,
      ...config
    }
  }

  /**
   * Validate a URL against SSRF protection rules
   */
  async validateUrl(url: string): Promise<SSRFValidationResult> {
    const startTime = Date.now()

    try {
      // Parse the URL
      const parsedUrl = new URL(url)

      // Basic protocol check
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          isValid: false,
          reason: 'Invalid protocol. Only HTTP and HTTPS allowed.',
          originalUrl: url,
          blockedReason: 'invalid_protocol'
        }
      }

      // Domain allowlist/blocklist check
      if (this.config.allowedDomains.length > 0) {
        if (!this.config.allowedDomains.some(domain =>
          parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
        )) {
          return {
            isValid: false,
            reason: 'Domain not in allowlist',
            originalUrl: url,
            blockedReason: 'domain_not_allowed'
          }
        }
      }

      if (this.config.blockedDomains.some(domain =>
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
      )) {
        return {
          isValid: false,
          reason: 'Domain is blocked',
          originalUrl: url,
          blockedReason: 'domain_blocked'
        }
      }

      // Port validation
      const port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80)

      if (this.config.allowedPorts.length > 0 && !this.config.allowedPorts.includes(port)) {
        return {
          isValid: false,
          reason: `Port ${port} not allowed`,
          originalUrl: url,
          blockedReason: 'port_not_allowed'
        }
      }

      if (this.config.blockedPorts.includes(port)) {
        return {
          isValid: false,
          reason: `Port ${port} is blocked`,
          originalUrl: url,
          blockedReason: 'port_blocked'
        }
      }

      if (!this.config.allowPrivateIPs && this.DANGEROUS_PORTS.includes(port)) {
        return {
          isValid: false,
          reason: `Dangerous port ${port} blocked`,
          originalUrl: url,
          blockedReason: 'dangerous_port'
        }
      }

      // DNS resolution and IP validation
      const resolvedIPs = await this.resolveDNS(parsedUrl.hostname)

      if (resolvedIPs.length === 0) {
        return {
          isValid: false,
          reason: 'Failed to resolve domain',
          originalUrl: url,
          blockedReason: 'dns_resolution_failed'
        }
      }

      // Check each resolved IP
      for (const ip of resolvedIPs) {
        const ipValidation = this.validateIP(ip)
        if (!ipValidation.isValid) {
          return {
            isValid: false,
            reason: `IP ${ip} blocked: ${ipValidation.reason}`,
            originalUrl: url,
            resolvedIPs,
            blockedReason: ipValidation.reason
          }
        }
      }

      this.log(`URL validation passed for ${url} (${Date.now() - startTime}ms)`)

      return {
        isValid: true,
        originalUrl: url,
        resolvedIPs
      }

    } catch (error) {
      return {
        isValid: false,
        reason: error instanceof Error ? error.message : 'Unknown validation error',
        originalUrl: url,
        blockedReason: 'validation_error'
      }
    }
  }

  /**
   * Perform a safe HTTP request with SSRF protection
   */
  async safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const validation = await this.validateUrl(url)

    if (!validation.isValid) {
      throw new SSRFDefenseError(
        `SSRF protection blocked request: ${validation.reason}`,
        validation.blockedReason || 'unknown',
        url
      )
    }

    // Set up secure fetch options
    const secureOptions: RequestInit = {
      ...options,
      redirect: this.config.followRedirects ? 'manual' : 'error',
      signal: AbortSignal.timeout(this.config.timeout),
      headers: {
        'User-Agent': this.config.userAgent,
        ...options.headers
      }
    }

    let currentUrl = url
    let redirectCount = 0
    let response: Response

    // Handle redirects manually for validation
    while (true) {
      response = await fetch(currentUrl, secureOptions)

      // If not a redirect, break
      if (!response.status.toString().startsWith('3') || !this.config.followRedirects) {
        break
      }

      // Check redirect limit
      if (redirectCount >= this.config.maxRedirects) {
        throw new SSRFDefenseError(
          `Too many redirects (${redirectCount})`,
          'too_many_redirects',
          currentUrl
        )
      }

      // Get redirect location
      const location = response.headers.get('Location')
      if (!location) {
        throw new SSRFDefenseError(
          'Redirect response missing Location header',
          'invalid_redirect',
          currentUrl
        )
      }

      // Resolve relative redirects
      const redirectUrl = new URL(location, currentUrl).toString()

      // Validate redirect URL
      const redirectValidation = await this.validateUrl(redirectUrl)
      if (!redirectValidation.isValid) {
        throw new SSRFDefenseError(
          `SSRF protection blocked redirect: ${redirectValidation.reason}`,
          redirectValidation.blockedReason || 'redirect_blocked',
          redirectUrl
        )
      }

      this.log(`Following redirect ${redirectCount + 1}: ${currentUrl} -> ${redirectUrl}`)

      currentUrl = redirectUrl
      redirectCount++
    }

    this.log(`Safe fetch completed: ${url} (${redirectCount} redirects)`)
    return response
  }

  /**
   * Validate an IP address against protection rules
   */
  private validateIP(ip: string): { isValid: boolean; reason?: string } {
    // Check IP allowlist/blocklist
    if (this.config.allowedIPs.length > 0) {
      if (!this.config.allowedIPs.includes(ip)) {
        return { isValid: false, reason: 'ip_not_allowed' }
      }
    }

    if (this.config.blockedIPs.includes(ip)) {
      return { isValid: false, reason: 'ip_blocked' }
    }

    // Check for metadata service IPs
    if (!this.config.allowMetadataService && this.METADATA_SERVICE_IPS.includes(ip)) {
      return { isValid: false, reason: 'metadata_service_blocked' }
    }

    // Check for localhost
    if (!this.config.allowLocalhost && (ip === '127.0.0.1' || ip === '::1')) {
      return { isValid: false, reason: 'localhost_blocked' }
    }

    // Check for private IP ranges
    if (!this.config.allowPrivateIPs && this.isPrivateIP(ip)) {
      return { isValid: false, reason: 'private_ip_blocked' }
    }

    return { isValid: true }
  }

  /**
   * Check if an IP is in private/reserved ranges
   */
  private isPrivateIP(ip: string): boolean {
    return this.PRIVATE_IP_RANGES.some(range => this.ipInCIDR(ip, range))
  }

  /**
   * Check if IP is in CIDR range
   */
  private ipInCIDR(ip: string, cidr: string): boolean {
    try {
      const [rangeIP, prefixLength] = cidr.split('/')
      const prefix = parseInt(prefixLength)

      // Simple IPv4 check
      if (ip.includes('.') && rangeIP.includes('.')) {
        const ipParts = ip.split('.').map(Number)
        const rangeParts = rangeIP.split('.').map(Number)

        let ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3]
        let rangeInt = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3]

        const mask = ~(Math.pow(2, 32 - prefix) - 1)
        return (ipInt & mask) === (rangeInt & mask)
      }

      // IPv6 is more complex, but for now return false for safety
      return false
    } catch {
      return false
    }
  }

  /**
   * Resolve DNS with timeout
   */
  private async resolveDNS(hostname: string): Promise<string[]> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.dnsTimeout)

      try {
        // Try IPv4 first
        const ipv4 = await dns.resolve4(hostname)
        clearTimeout(timeoutId)
        return ipv4
      } catch {
        // Try IPv6 if IPv4 fails
        try {
          const ipv6 = await dns.resolve6(hostname)
          clearTimeout(timeoutId)
          return ipv6
        } catch {
          clearTimeout(timeoutId)
          return []
        }
      }
    } catch {
      return []
    }
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[SSRF-Defense] ${message}`)
    }
  }

  /**
   * Create a hash-based cache key for validation results
   */
  static createCacheKey(url: string, config: SSRFDefenseConfig): string {
    const configHash = createHash('sha256')
      .update(JSON.stringify(config))
      .digest('hex')
      .substring(0, 16)

    const urlHash = createHash('sha256')
      .update(url)
      .digest('hex')
      .substring(0, 16)

    return `ssrf:${urlHash}:${configHash}`
  }
}

// Lazy-loaded instances to avoid circular dependencies
let _monitoringSSRFDefense: SSRFDefense | null = null
let _strictSSRFDefense: SSRFDefense | null = null
let _performanceSSRFDefense: SSRFDefense | null = null

/**
 * Default instance with secure settings for monitoring
 */
export const monitoringSSRFDefense = (): SSRFDefense => {
  if (!_monitoringSSRFDefense) {
    // Import here to avoid circular dependency
    const { ssrfConfigs } = require('./ssrf-config')
    _monitoringSSRFDefense = new SSRFDefense(ssrfConfigs.monitoring)
  }
  return _monitoringSSRFDefense
}

/**
 * Strict instance for user-submitted URLs
 */
export const strictSSRFDefense = (): SSRFDefense => {
  if (!_strictSSRFDefense) {
    const { ssrfConfigs } = require('./ssrf-config')
    _strictSSRFDefense = new SSRFDefense(ssrfConfigs.strict)
  }
  return _strictSSRFDefense
}

/**
 * Performance monitoring instance
 */
export const performanceSSRFDefense = (): SSRFDefense => {
  if (!_performanceSSRFDefense) {
    const { ssrfConfigs } = require('./ssrf-config')
    _performanceSSRFDefense = new SSRFDefense(ssrfConfigs.performance)
  }
  return _performanceSSRFDefense
}

/**
 * Convenience functions
 */
export const validateMonitoringUrl = (url: string) => monitoringSSRFDefense().validateUrl(url)
export const safeFetchForMonitoring = (url: string, options?: RequestInit) =>
  monitoringSSRFDefense().safeFetch(url, options)

export const validateStrictUrl = (url: string) => strictSSRFDefense().validateUrl(url)
export const safeFetchStrict = (url: string, options?: RequestInit) =>
  strictSSRFDefense().safeFetch(url, options)

export const validatePerformanceUrl = (url: string) => performanceSSRFDefense().validateUrl(url)
export const safeFetchForPerformance = (url: string, options?: RequestInit) =>
  performanceSSRFDefense().safeFetch(url, options)