/**
 * SSRF Configuration Management
 *
 * Centralized configuration for SSRF defense settings including
 * allowlists, blocklists, and security policies
 */

import { SSRFDefenseConfig } from './ssrf-defense'

// Environment-based configuration
export const getSSRFConfig = (): {
  monitoring: SSRFDefenseConfig
  strict: SSRFDefenseConfig
  performance: SSRFDefenseConfig
} => {
  // Parse environment variables for custom allowlists
  const getAllowedDomains = (envVar: string): string[] => {
    const domains = process.env[envVar]
    return domains ? domains.split(',').map(d => d.trim()) : []
  }

  const getAllowedIPs = (envVar: string): string[] => {
    const ips = process.env[envVar]
    return ips ? ips.split(',').map(ip => ip.trim()) : []
  }

  const getAllowedPorts = (envVar: string): number[] => {
    const ports = process.env[envVar]
    return ports ? ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p)) : []
  }

  // Base configuration for monitoring services
  const baseConfig: SSRFDefenseConfig = {
    allowPrivateIPs: process.env.SSRF_ALLOW_PRIVATE_IPS === 'true',
    allowLocalhost: process.env.SSRF_ALLOW_LOCALHOST === 'true',
    allowLoopback: process.env.SSRF_ALLOW_LOOPBACK === 'true',
    allowMetadataService: process.env.SSRF_ALLOW_METADATA === 'true',
    followRedirects: process.env.SSRF_FOLLOW_REDIRECTS !== 'false',
    enableLogging: process.env.NODE_ENV !== 'production',
    // Custom allowlists from environment
    allowedDomains: getAllowedDomains('SSRF_ALLOWED_DOMAINS'),
    blockedDomains: getAllowedDomains('SSRF_BLOCKED_DOMAINS'),
    allowedIPs: getAllowedIPs('SSRF_ALLOWED_IPS'),
    blockedIPs: getAllowedIPs('SSRF_BLOCKED_IPS'),
  }

  return {
    // Configuration for monitoring services (uptime, dead links)
    monitoring: {
      ...baseConfig,
      maxRedirects: parseInt(process.env.SSRF_MONITORING_MAX_REDIRECTS || '3'),
      timeout: parseInt(process.env.SSRF_MONITORING_TIMEOUT || '15000'),
      dnsTimeout: parseInt(process.env.SSRF_MONITORING_DNS_TIMEOUT || '3000'),
      allowedPorts: getAllowedPorts('SSRF_MONITORING_PORTS').length > 0
        ? getAllowedPorts('SSRF_MONITORING_PORTS')
        : [80, 443, 8080, 8443],
      userAgent: process.env.SSRF_MONITORING_USER_AGENT || 'PingBuoy-Monitor/2.0',
    },

    // Strict configuration for user-submitted URLs
    strict: {
      ...baseConfig,
      allowPrivateIPs: false, // Always false for user input
      allowLocalhost: false,  // Always false for user input
      allowLoopback: false,   // Always false for user input
      allowMetadataService: false, // Always false for user input
      maxRedirects: parseInt(process.env.SSRF_STRICT_MAX_REDIRECTS || '2'),
      timeout: parseInt(process.env.SSRF_STRICT_TIMEOUT || '10000'),
      dnsTimeout: parseInt(process.env.SSRF_STRICT_DNS_TIMEOUT || '2000'),
      allowedPorts: getAllowedPorts('SSRF_STRICT_PORTS').length > 0
        ? getAllowedPorts('SSRF_STRICT_PORTS')
        : [80, 443],
      userAgent: process.env.SSRF_STRICT_USER_AGENT || 'PingBuoy-Validator/2.0',
    },

    // Configuration for performance monitoring (PageSpeed, etc.)
    performance: {
      ...baseConfig,
      allowPrivateIPs: false, // Performance monitoring shouldn't access internal resources
      maxRedirects: parseInt(process.env.SSRF_PERFORMANCE_MAX_REDIRECTS || '2'),
      timeout: parseInt(process.env.SSRF_PERFORMANCE_TIMEOUT || '30000'),
      dnsTimeout: parseInt(process.env.SSRF_PERFORMANCE_DNS_TIMEOUT || '5000'),
      allowedPorts: getAllowedPorts('SSRF_PERFORMANCE_PORTS').length > 0
        ? getAllowedPorts('SSRF_PERFORMANCE_PORTS')
        : [80, 443],
      userAgent: process.env.SSRF_PERFORMANCE_USER_AGENT || 'PingBuoy-Performance/2.0',
    }
  }
}

// Default allowlists for common services
export const COMMON_ALLOWLISTS = {
  // CDN and hosting providers
  cdnDomains: [
    'cloudflare.com',
    'amazonaws.com',
    'googleusercontent.com',
    'azureedge.net',
    'fastly.com',
    'jsdelivr.net',
    'unpkg.com'
  ],

  // Popular website platforms
  websitePlatforms: [
    'github.io',
    'netlify.app',
    'vercel.app',
    'heroku.com',
    'wordpress.com',
    'blogspot.com',
    'medium.com'
  ],

  // Business websites
  businessDomains: [
    'shopify.com',
    'squarespace.com',
    'wix.com',
    'webflow.io'
  ]
}

// Security policy templates
export const SECURITY_POLICIES = {
  // Most restrictive - only HTTPS on standard ports
  maximum: {
    allowPrivateIPs: false,
    allowLocalhost: false,
    allowLoopback: false,
    allowMetadataService: false,
    maxRedirects: 1,
    timeout: 5000,
    allowedPorts: [443], // HTTPS only
    followRedirects: false,
  },

  // High security - standard web ports
  high: {
    allowPrivateIPs: false,
    allowLocalhost: false,
    allowLoopback: false,
    allowMetadataService: false,
    maxRedirects: 2,
    timeout: 10000,
    allowedPorts: [80, 443],
    followRedirects: true,
  },

  // Balanced - common web and alternate ports
  balanced: {
    allowPrivateIPs: false,
    allowLocalhost: false,
    allowLoopback: false,
    allowMetadataService: false,
    maxRedirects: 3,
    timeout: 15000,
    allowedPorts: [80, 443, 8080, 8443],
    followRedirects: true,
  },

  // Development - more permissive for testing
  development: {
    allowPrivateIPs: true,
    allowLocalhost: true,
    allowLoopback: true,
    allowMetadataService: false, // Still block metadata services
    maxRedirects: 5,
    timeout: 30000,
    allowedPorts: [80, 443, 3000, 8000, 8080, 8443],
    followRedirects: true,
  }
}

/**
 * Get the current security policy based on environment
 */
export const getCurrentSecurityPolicy = () => {
  const policyName = process.env.SSRF_SECURITY_POLICY?.toLowerCase()

  switch (policyName) {
    case 'maximum':
      return SECURITY_POLICIES.maximum
    case 'high':
      return SECURITY_POLICIES.high
    case 'balanced':
      return SECURITY_POLICIES.balanced
    case 'development':
      return SECURITY_POLICIES.development
    default:
      // Default to high security in production, balanced in development
      return process.env.NODE_ENV === 'production'
        ? SECURITY_POLICIES.high
        : SECURITY_POLICIES.balanced
  }
}

/**
 * Create an allowlist from common services
 */
export const createCommonAllowlist = (categories: (keyof typeof COMMON_ALLOWLISTS)[] = []) => {
  return categories.flatMap(category => COMMON_ALLOWLISTS[category])
}

/**
 * Validate SSRF configuration
 */
export const validateSSRFConfig = (config: SSRFDefenseConfig): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Validate timeouts
  if (config.timeout && config.timeout < 1000) {
    errors.push('Timeout should be at least 1000ms')
  }

  if (config.dnsTimeout && config.dnsTimeout < 500) {
    errors.push('DNS timeout should be at least 500ms')
  }

  // Validate redirect limits
  if (config.maxRedirects && config.maxRedirects > 10) {
    errors.push('Max redirects should not exceed 10')
  }

  // Validate ports
  if (config.allowedPorts) {
    const invalidPorts = config.allowedPorts.filter(port => port < 1 || port > 65535)
    if (invalidPorts.length > 0) {
      errors.push(`Invalid ports: ${invalidPorts.join(', ')}`)
    }
  }

  // Security warnings
  if (config.allowPrivateIPs && process.env.NODE_ENV === 'production') {
    errors.push('Warning: Private IPs are allowed in production environment')
  }

  if (config.allowMetadataService) {
    errors.push('Warning: Metadata service access is allowed (high security risk)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export configured instances
export const ssrfConfigs = getSSRFConfig()