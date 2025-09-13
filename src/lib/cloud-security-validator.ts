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
  }

  private addCheck(check: CloudSecurityCheck) {
    this.checks.push(check)
  }

  private validateEnvironmentVariables(): boolean {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
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

    // Check for wildcard in production
    if (process.env.NODE_ENV === 'production' && 
        (!allowedOrigins || allowedOrigins.includes('*'))) {
      console.warn('CORS should not use wildcards in production')
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
      recommendations.push('Configure CORS with specific allowed origins')
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