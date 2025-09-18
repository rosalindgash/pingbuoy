#!/usr/bin/env node

/**
 * Pre-deployment Security Check Script
 * Validates security configurations before deployment
 * Prevents common cloud misconfigurations (2025)
 */

const fs = require('fs')
const path = require('path')

class SecurityChecker {
  constructor() {
    this.errors = []
    this.warnings = []
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = {
      'info': '📋',
      'warn': '⚠️ ',
      'error': '❌',
      'success': '✅'
    }[type] || '📋'
    
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  error(message) {
    this.errors.push(message)
    this.log(message, 'error')
  }

  warn(message) {
    this.warnings.push(message)
    this.log(message, 'warn')
  }

  success(message) {
    this.log(message, 'success')
  }

  // Check for hardcoded secrets
  checkForSecrets() {
    this.log('Checking for hardcoded secrets...')
    
    const secretPatterns = [
      /sk_live_[a-zA-Z0-9]+/, // Stripe live keys
      /sk_test_[a-zA-Z0-9]+/, // Stripe test keys (in production)
      /AKIA[0-9A-Z]{16}/, // AWS Access Keys
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, // UUIDs (potential API keys)
      /ghp_[a-zA-Z0-9]+/, // GitHub personal access tokens
      /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]+/ // Slack bot tokens
    ]

    const filesToCheck = [
      'src/**/*.ts',
      'src/**/*.tsx',
      'src/**/*.js',
      'src/**/*.jsx'
    ]

    // Simple implementation - in real scenario, use proper glob pattern matching
    const srcDir = path.join(__dirname, '..', 'src')
    this.checkDirectoryForSecrets(srcDir, secretPatterns)
  }

  checkDirectoryForSecrets(dir, patterns) {
    if (!fs.existsSync(dir)) return

    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        this.checkDirectoryForSecrets(filePath, patterns)
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || 
                 file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            this.error(`Potential secret found in ${filePath}`)
          }
        })
      }
    })
  }

  // Check environment configuration
  checkEnvironmentConfig() {
    this.log('Checking environment configuration...')
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ]

    // Check .env.example exists
    const envExamplePath = path.join(__dirname, '..', '.env.example')
    if (!fs.existsSync(envExamplePath)) {
      this.error('.env.example file is missing')
      return
    }

    const envExample = fs.readFileSync(envExamplePath, 'utf8')
    
    requiredEnvVars.forEach(varName => {
      if (!envExample.includes(varName)) {
        this.error(`Required environment variable ${varName} not documented in .env.example`)
      }
    })

    // Check for production-specific configurations
    if (process.env.NODE_ENV === 'production') {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')) {
        this.error('Production environment using localhost database URL')
      }
      
      if (!process.env.ALLOWED_ORIGINS || 
          process.env.ALLOWED_ORIGINS.includes('*')) {
        this.error('Production CORS configuration allows all origins')
      }
    }

    this.success('Environment configuration check completed')
  }

  // Check security headers configuration
  checkSecurityHeaders() {
    this.log('Checking security headers configuration...')
    
    const middlewarePath = path.join(__dirname, '..', 'middleware.ts')
    if (!fs.existsSync(middlewarePath)) {
      this.error('middleware.ts file is missing')
      return
    }

    const middleware = fs.readFileSync(middlewarePath, 'utf8')
    
    const requiredHeaders = [
      'Strict-Transport-Security',
      'Content-Security-Policy', 
      'X-Frame-Options',
      'X-Content-Type-Options'
    ]

    // Check for 2025 security headers import
    if (middleware.includes('securityHeaders2025')) {
      this.success('2025 Enhanced security headers detected')
    } else {
      requiredHeaders.forEach(header => {
        if (!middleware.includes(header)) {
          this.error(`Security header ${header} not configured`)
        }
      })
    }

    this.success('Security headers check completed')
  }

  // Check dependencies for known vulnerabilities
  checkDependencies() {
    this.log('Checking dependencies...')
    
    const packageJsonPath = path.join(__dirname, '..', 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      this.error('package.json file is missing')
      return
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    // Check for security-related dependencies
    const securityDeps = [
      'zod',
      'dompurify',
      'validator'
    ]

    securityDeps.forEach(dep => {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        this.warn(`Security dependency ${dep} is missing`)
      }
    })

    // Check for ESLint security plugins
    const eslintSecurityPlugins = [
      'eslint-plugin-security',
      'eslint-plugin-no-secrets'
    ]

    eslintSecurityPlugins.forEach(plugin => {
      if (!packageJson.devDependencies || !packageJson.devDependencies[plugin]) {
        this.warn(`ESLint security plugin ${plugin} is missing`)
      }
    })

    this.success('Dependencies check completed')
  }

  // Check CI/CD security configuration
  checkCICD() {
    this.log('Checking CI/CD security configuration...')
    
    const githubDir = path.join(__dirname, '..', '.github', 'workflows')
    if (!fs.existsSync(githubDir)) {
      this.warn('GitHub Actions workflows directory is missing')
      return
    }

    const workflowFiles = fs.readdirSync(githubDir)
    const requiredWorkflows = [
      'security-scan.yml',
      'dependency-review.yml',
      'codeql.yml'
    ]

    requiredWorkflows.forEach(workflow => {
      if (!workflowFiles.includes(workflow)) {
        this.error(`Required security workflow ${workflow} is missing`)
      }
    })

    this.success('CI/CD security check completed')
  }

  // Enhanced CORS validation
  checkCORSConfiguration() {
    this.log('Checking CORS configuration...')

    const allowedOrigins = process.env.ALLOWED_ORIGINS

    if (!allowedOrigins) {
      this.error('ALLOWED_ORIGINS environment variable not configured')
      return
    }

    // Check for wildcard in production
    if (process.env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
      this.error('CORS uses wildcard (*) in production - critical security risk')
      return
    }

    // Parse and validate origins
    const origins = allowedOrigins.split(',').map(origin => origin.trim()).filter(o => o.length > 0)

    if (origins.length === 0) {
      this.error('No valid origins configured in ALLOWED_ORIGINS')
      return
    }

    // Validate each origin
    let hasErrors = false
    for (const origin of origins) {
      if (origin === '*') continue // Already checked above

      try {
        const url = new URL(origin)

        if (!['http:', 'https:'].includes(url.protocol)) {
          this.error(`Invalid protocol for origin ${origin}: only HTTP/HTTPS allowed`)
          hasErrors = true
        }

        if (process.env.NODE_ENV === 'production' && url.protocol === 'http:') {
          if (!url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
            this.error(`HTTP origin not secure for production: ${origin}`)
            hasErrors = true
          }
        }
      } catch (error) {
        this.error(`Invalid URL format for origin: ${origin}`)
        hasErrors = true
      }
    }

    if (!hasErrors) {
      this.success(`CORS configured securely with ${origins.length} origins`)
    }
  }

  // Check Supabase functions CORS implementation
  checkSupabaseCORSImplementation() {
    this.log('Checking Supabase functions CORS implementation...')

    const functionsDir = path.join(__dirname, '..', 'supabase', 'functions')
    if (!fs.existsSync(functionsDir)) {
      this.log('Supabase functions directory not found - skipping CORS implementation check')
      return
    }

    // Check for secure CORS configuration file
    const corsConfigPath = path.join(functionsDir, '_shared', 'cors-config.ts')
    if (!fs.existsSync(corsConfigPath)) {
      this.error('Secure CORS configuration file missing: supabase/functions/_shared/cors-config.ts')
      return
    }

    // Validate CORS configuration file
    const corsConfig = fs.readFileSync(corsConfigPath, 'utf8')
    const requiredComponents = ['withSecureCORS', 'SecureCORS', 'parseAllowedOrigins']

    const missingComponents = requiredComponents.filter(component => !corsConfig.includes(component))
    if (missingComponents.length > 0) {
      this.error(`CORS configuration missing components: ${missingComponents.join(', ')}`)
      return
    }

    // Check for insecure patterns
    const insecurePatterns = [
      "'Access-Control-Allow-Origin': '*'",
      '"Access-Control-Allow-Origin": "*"'
    ]

    const foundInsecurePatterns = insecurePatterns.filter(pattern => corsConfig.includes(pattern))
    if (foundInsecurePatterns.length > 0) {
      this.error(`Insecure CORS patterns found in configuration`)
      return
    }

    // Check individual function files
    try {
      const functions = fs.readdirSync(functionsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
        .map(dirent => dirent.name)

      let functionIssues = 0
      for (const functionName of functions) {
        const indexPath = path.join(functionsDir, functionName, 'index.ts')
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8')

          if (!content.includes('withSecureCORS')) {
            this.error(`Function ${functionName} not using withSecureCORS middleware`)
            functionIssues++
          }
        }
      }

      if (functionIssues === 0) {
        this.success(`Supabase functions CORS implementation validated for ${functions.length} functions`)
      }
    } catch (error) {
      this.warn('Unable to validate individual function CORS implementations')
    }
  }

  // Run all security checks
  async runAllChecks() {
    this.log('🚀 Starting comprehensive security check...', 'info')

    try {
      this.checkForSecrets()
      this.checkEnvironmentConfig()
      this.checkSecurityHeaders()
      this.checkDependencies()
      this.checkCICD()
      this.checkCORSConfiguration()
      this.checkSupabaseCORSImplementation()
    } catch (error) {
      this.error(`Security check failed: ${error.message}`)
    }

    // Generate report
    this.generateReport()
    
    // Exit with appropriate code
    if (this.errors.length > 0) {
      this.log(`❌ Security check failed with ${this.errors.length} errors`, 'error')
      process.exit(1)
    } else {
      this.log('✅ All security checks passed!', 'success')
      process.exit(0)
    }
  }

  generateReport() {
    this.log('\n📊 Security Check Report', 'info')
    this.log('='.repeat(50), 'info')
    
    if (this.errors.length === 0) {
      this.log('🎉 No security errors found!', 'success')
    } else {
      this.log(`🔴 Errors: ${this.errors.length}`, 'error')
      this.errors.forEach((error, index) => {
        this.log(`   ${index + 1}. ${error}`, 'error')
      })
    }
    
    if (this.warnings.length > 0) {
      this.log(`🟡 Warnings: ${this.warnings.length}`, 'warn')
      this.warnings.forEach((warning, index) => {
        this.log(`   ${index + 1}. ${warning}`, 'warn')
      })
    }
    
    this.log('='.repeat(50), 'info')
  }
}

// Run security checks if called directly
if (require.main === module) {
  const checker = new SecurityChecker()
  checker.runAllChecks()
}

module.exports = SecurityChecker