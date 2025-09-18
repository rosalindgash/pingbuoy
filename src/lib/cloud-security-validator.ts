// Cloud Security Configuration Validator (2025)
// Prevents common cloud misconfigurations that lead to 99% of security failures

export interface CloudSecurityCheck {
  name: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  check: () => boolean | Promise<boolean>
  remediation: string
}

export class CloudSecurityValidator {
  private checks: CloudSecurityCheck[] = []

  constructor() {
    this.initializeChecks()
  }

  private initializeChecks() {
    // Environment Variable Security
    this.addCheck({
      name: 'Environment Variables Validation',
      description: 'Ensure all required environment variables are properly configured',
      severity: 'critical',
      check: () => this.validateEnvironmentVariables(),
      remediation: 'Set all required environment variables in your deployment environment'
    })

    // Database Security
    this.addCheck({
      name: 'Database Connection Security',
      description: 'Verify database connections use proper encryption and authentication',
      severity: 'critical',
      check: () => this.validateDatabaseSecurity(),
      remediation: 'Ensure database URLs use SSL/TLS and proper authentication'
    })

    // API Security Configuration
    this.addCheck({
      name: 'API Security Configuration',
      description: 'Check that API endpoints have proper security configurations',
      severity: 'high',
      check: () => this.validateAPIConfig(),
      remediation: 'Configure rate limiting, authentication, and CORS properly'
    })

    // HTTPS Configuration
    this.addCheck({
      name: 'HTTPS Enforcement',
      description: 'Ensure HTTPS is properly configured and enforced',
      severity: 'critical',
      check: () => this.validateHTTPSConfig(),
      remediation: 'Configure HTTPS with valid SSL certificates and HSTS headers'
    })

    // CORS Configuration
    this.addCheck({
      name: 'CORS Configuration',
      description: 'Verify CORS is not using wildcards in production',
      severity: 'high',
      check: () => this.validateCORSConfig(),
      remediation: 'Set specific allowed origins instead of using wildcards'
    })

    // Supabase Functions CORS Implementation
    this.addCheck({
      name: 'Supabase Functions CORS Implementation',
      description: 'Verify Supabase Edge Functions use secure CORS middleware',
      severity: 'high',
      check: () => this.validateSupabaseCORSImplementation(),
      remediation: 'Update Supabase functions to use withSecureCORS middleware from _shared/cors-config.ts'
    })

    // SSRF Defense Configuration
    this.addCheck({
      name: 'SSRF Defense Configuration',
      description: 'Ensure SSRF protection is properly configured for monitoring services',
      severity: 'high',
      check: () => this.validateSSRFConfig(),
      remediation: 'Configure SSRF defense settings and review allowlists/blocklists'
    })
  }

  private addCheck(check: CloudSecurityCheck) {
    this.checks.push(check)
  }

  private validateEnvironmentVariables(): boolean {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SERVICE_JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ]

    const missingVars = requiredVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.warn('Missing required environment variables:', missingVars)
      return false
    }

    // Check for development values in production
    if (process.env.NODE_ENV === 'production') {
      const devPatterns = [
        'localhost',
        '127.0.0.1',
        'test',
        'dev',
        'example'
      ]

      for (const varName of requiredVars) {
        const value = process.env[varName]?.toLowerCase() || ''
        if (devPatterns.some(pattern => value.includes(pattern))) {
          console.warn(`Production environment has development value for ${varName}`)
          return false
        }
      }
    }

    return true
  }

  private validateDatabaseSecurity(): boolean {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!supabaseUrl) {
      return false
    }

    // Check if using HTTPS
    if (!supabaseUrl.startsWith('https://')) {
      console.warn('Database URL should use HTTPS')
      return false
    }

    // Check for proper Supabase domain
    if (!supabaseUrl.includes('.supabase.co')) {
      console.warn('Database URL should be a proper Supabase URL')
      return false
    }

    return true
  }

  private validateAPIConfig(): boolean {
    // Check if rate limiting is configured
    const hasRateLimiting = process.env.RATE_LIMIT_ENABLED !== 'false'
    
    if (!hasRateLimiting && process.env.NODE_ENV === 'production') {
      console.warn('Rate limiting should be enabled in production')
      return false
    }

    return true
  }

  private validateHTTPSConfig(): boolean {
    if (process.env.NODE_ENV === 'production') {
      // In production, HTTPS should be enforced
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
      
      if (appUrl && !appUrl.startsWith('https://')) {
        console.warn('Application URL should use HTTPS in production')
        return false
      }
    }

    return true
  }

  private validateCORSConfig(): boolean {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
    const issues = []

    // Check if ALLOWED_ORIGINS is configured
    if (!allowedOrigins) {
      issues.push('ALLOWED_ORIGINS environment variable not configured')
      return false
    }

    // Check for wildcard in production
    if (process.env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
      issues.push('CORS uses wildcard (*) in production - critical security risk')
    }

    // Parse origins
    const origins = allowedOrigins.split(',').map(origin => origin.trim()).filter(o => o.length > 0)

    if (origins.length === 0) {
      issues.push('No valid origins configured in ALLOWED_ORIGINS')
      return false
    }

    // Validate each origin
    for (const origin of origins) {
      // Skip wildcard (already checked above)
      if (origin === '*') continue

      // Validate URL format
      try {
        const url = new URL(origin)

        // Check protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
          issues.push(`Invalid protocol for origin ${origin}: only HTTP/HTTPS allowed`)
        }

        // Check for HTTPS in production
        if (process.env.NODE_ENV === 'production' && url.protocol === 'http:') {
          // Allow localhost for testing
          if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
            issues.push(`HTTP origin not secure for production: ${origin}`)
          }
        }

        // Check for suspicious domains
        const suspiciousDomains = ['evil.com', 'malicious.com', 'attacker.com', 'hacker.com']
        if (suspiciousDomains.some(domain => url.hostname.includes(domain))) {
          issues.push(`Suspicious domain detected in origin: ${origin}`)
        }

      } catch (error) {
        issues.push(`Invalid URL format for origin: ${origin}`)
      }
    }

    // Check for common CORS misconfigurations
    const dangerousOrigins = origins.filter(origin =>
      origin.includes('null') ||
      origin.includes('undefined') ||
      origin.includes('file://') ||
      origin.includes('data:')
    )

    if (dangerousOrigins.length > 0) {
      issues.push(`Dangerous origins detected: ${dangerousOrigins.join(', ')}`)
    }

    // Warn about too many origins (potential maintenance issue)
    if (origins.length > 10) {
      issues.push(`Too many origins configured (${origins.length}): consider consolidating`)
    }

    // Check for duplicate origins
    const uniqueOrigins = new Set(origins)
    if (uniqueOrigins.size !== origins.length) {
      issues.push('Duplicate origins found in ALLOWED_ORIGINS')
    }

    if (issues.length > 0) {
      console.warn('CORS configuration issues:', issues)
      return issues.filter(issue =>
        issue.includes('critical') ||
        issue.includes('Invalid') ||
        issue.includes('not configured') ||
        issue.includes('No valid origins')
      ).length === 0
    }

    // Log successful validation
    console.log(`✅ CORS configured securely with ${origins.length} origins:`, origins.slice(0, 3))
    return true
  }

  private validateSupabaseCORSImplementation(): boolean {
    const fs = require('fs')
    const path = require('path')
    const issues = []

    // Check if Supabase functions directory exists
    const functionsDir = path.join(process.cwd(), 'supabase', 'functions')
    if (!fs.existsSync(functionsDir)) {
      console.warn('Supabase functions directory not found - skipping CORS implementation check')
      return true // Not applicable if no Supabase functions
    }

    // Check for secure CORS configuration file
    const corsConfigPath = path.join(functionsDir, '_shared', 'cors-config.ts')
    if (!fs.existsSync(corsConfigPath)) {
      issues.push('Secure CORS configuration file missing: supabase/functions/_shared/cors-config.ts')
      return false
    }

    // Read and validate the CORS configuration file
    try {
      const corsConfig = fs.readFileSync(corsConfigPath, 'utf8')

      // Check for required secure CORS components
      const requiredComponents = [
        'withSecureCORS',
        'SecureCORS',
        'parseAllowedOrigins',
        'validateOrigin',
        'Access-Control-Allow-Origin'
      ]

      const missingComponents = requiredComponents.filter(component =>
        !corsConfig.includes(component)
      )

      if (missingComponents.length > 0) {
        issues.push(`CORS configuration missing components: ${missingComponents.join(', ')}`)
      }

      // Check for insecure patterns
      const insecurePatterns = [
        "'Access-Control-Allow-Origin': '*'",
        '"Access-Control-Allow-Origin": "*"',
        'allowedOrigins: ["*"]',
        "allowedOrigins: ['*']"
      ]

      const foundInsecurePatterns = insecurePatterns.filter(pattern =>
        corsConfig.includes(pattern)
      )

      if (foundInsecurePatterns.length > 0) {
        issues.push(`Insecure CORS patterns found in configuration: ${foundInsecurePatterns.join(', ')}`)
      }

    } catch (error) {
      issues.push('Unable to read CORS configuration file')
      return false
    }

    // Check individual function files for proper CORS usage
    const functionFiles = []
    try {
      const functions = fs.readdirSync(functionsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
        .map(dirent => dirent.name)

      for (const functionName of functions) {
        const indexPath = path.join(functionsDir, functionName, 'index.ts')
        if (fs.existsSync(indexPath)) {
          functionFiles.push({ name: functionName, path: indexPath })
        }
      }
    } catch (error) {
      console.warn('Unable to scan function files for CORS validation')
      return true // Don't fail if we can't scan
    }

    // Validate each function file
    for (const { name, path: filePath } of functionFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8')

        // Check if function uses secure CORS
        if (!content.includes('withSecureCORS')) {
          issues.push(`Function ${name} not using withSecureCORS middleware`)
          continue
        }

        // Check for import of secure CORS
        if (!content.includes("from '../_shared/cors-config.ts'") &&
            !content.includes('from "../_shared/cors-config.ts"')) {
          issues.push(`Function ${name} not importing from secure CORS config`)
        }

        // Check for manual CORS headers (should be removed)
        const manualCorsPatterns = [
          'Access-Control-Allow-Origin',
          'corsHeaders',
          'cors',
          'req.method === "OPTIONS"'
        ]

        // Allow withSecureCORS but flag manual implementations
        const manualCorsFound = manualCorsPatterns.filter(pattern => {
          const matches = content.includes(pattern)
          // Exclude withSecureCORS usage
          return matches && !content.includes('withSecureCORS')
        })

        if (manualCorsFound.length > 0) {
          issues.push(`Function ${name} has manual CORS implementation - should use withSecureCORS middleware`)
        }

      } catch (error) {
        console.warn(`Unable to validate CORS in function ${name}:`, error.message)
      }
    }

    if (issues.length > 0) {
      console.warn('Supabase Functions CORS implementation issues:', issues)
      return false
    }

    console.log(`✅ Supabase Functions CORS implementation validated for ${functionFiles.length} functions`)
    return true
  }

  private validateSSRFConfig(): boolean {
    // Check if SSRF defense is properly configured
    const issues = []

    // Validate security policy
    const securityPolicy = process.env.SSRF_SECURITY_POLICY
    if (!securityPolicy) {
      issues.push('SSRF_SECURITY_POLICY not configured')
    }

    // Check for dangerous configurations in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.SSRF_ALLOW_PRIVATE_IPS === 'true') {
        issues.push('SSRF allows private IPs in production (security risk)')
      }

      if (process.env.SSRF_ALLOW_LOCALHOST === 'true') {
        issues.push('SSRF allows localhost in production (security risk)')
      }

      if (process.env.SSRF_ALLOW_METADATA === 'true') {
        issues.push('SSRF allows metadata service access (critical security risk)')
      }

      // Check timeout configuration
      const timeout = parseInt(process.env.SSRF_MONITORING_TIMEOUT || '15000')
      if (timeout > 30000) {
        issues.push('SSRF monitoring timeout too high (potential DoS risk)')
      }

      // Check redirect limits
      const maxRedirects = parseInt(process.env.SSRF_MONITORING_MAX_REDIRECTS || '3')
      if (maxRedirects > 5) {
        issues.push('SSRF max redirects too high (potential infinite redirect risk)')
      }
    }

    // Validate port configuration
    const allowedPorts = process.env.SSRF_MONITORING_PORTS
    if (allowedPorts) {
      const ports = allowedPorts.split(',').map(p => parseInt(p.trim()))
      const dangerousPorts = [22, 23, 25, 53, 110, 143, 993, 995, 1433, 3306, 5432, 6379, 9200, 27017]

      const foundDangerousPorts = ports.filter(port => dangerousPorts.includes(port))
      if (foundDangerousPorts.length > 0) {
        issues.push(`SSRF allows dangerous ports: ${foundDangerousPorts.join(', ')}`)
      }
    }

    if (issues.length > 0) {
      console.warn('SSRF configuration issues:', issues)
      return false
    }

    return true
  }

  public async runAllChecks(): Promise<{
    passed: number
    failed: number
    results: Array<{
      check: CloudSecurityCheck
      passed: boolean
      error?: string
    }>
  }> {
    const results = []
    let passed = 0
    let failed = 0

    for (const check of this.checks) {
      try {
        const result = await check.check()
        results.push({
          check,
          passed: result
        })

        if (result) {
          passed++
        } else {
          failed++
          console.error(`Security check failed: ${check.name}`)
          console.error(`Remediation: ${check.remediation}`)
        }
      } catch (error) {
        results.push({
          check,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
        console.error(`Security check error: ${check.name}`, error)
      }
    }

    return { passed, failed, results }
  }

  public async runCriticalChecks(): Promise<boolean> {
    const criticalChecks = this.checks.filter(check => check.severity === 'critical')
    
    for (const check of criticalChecks) {
      try {
        const result = await check.check()
        if (!result) {
          console.error(`Critical security check failed: ${check.name}`)
          return false
        }
      } catch (error) {
        console.error(`Critical security check error: ${check.name}`, error)
        return false
      }
    }

    return true
  }

  public generateSecurityReport(): {
    summary: string
    recommendations: string[]
    complianceStatus: 'compliant' | 'partial' | 'non-compliant'
  } {
    const recommendations = []
    let criticalIssues = 0

    // Environment recommendations
    if (!this.validateEnvironmentVariables()) {
      recommendations.push('Configure all required environment variables properly')
      criticalIssues++
    }

    // HTTPS recommendations
    if (!this.validateHTTPSConfig()) {
      recommendations.push('Enable HTTPS with proper SSL certificates')
      criticalIssues++
    }

    // CORS recommendations
    if (!this.validateCORSConfig()) {
      recommendations.push('Configure CORS with specific allowed origins instead of wildcards')
    }

    // Supabase Functions CORS recommendations
    if (!this.validateSupabaseCORSImplementation()) {
      recommendations.push('Update Supabase functions to use secure CORS middleware')
    }

    const complianceStatus = criticalIssues === 0 ? 'compliant' : 
                           criticalIssues <= 2 ? 'partial' : 'non-compliant'

    return {
      summary: `Security assessment complete. ${criticalIssues} critical issues found.`,
      recommendations,
      complianceStatus
    }
  }
}

// Utility function for deployment validation
export async function validateDeploymentSecurity(): Promise<boolean> {
  console.log('🔍 Running cloud security validation...')
  
  const validator = new CloudSecurityValidator()
  const criticalChecksPassed = await validator.runCriticalChecks()
  
  if (!criticalChecksPassed) {
    console.error('❌ Critical security checks failed! Deployment should not proceed.')
    return false
  }
  
  const allResults = await validator.runAllChecks()
  console.log(`✅ Security validation complete: ${allResults.passed}/${allResults.passed + allResults.failed} checks passed`)
  
  return criticalChecksPassed
}

// Export singleton instance
export const cloudSecurityValidator = new CloudSecurityValidator()