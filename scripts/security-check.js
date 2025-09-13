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

  // Run all security checks
  async runAllChecks() {
    this.log('🚀 Starting comprehensive security check...', 'info')
    
    try {
      this.checkForSecrets()
      this.checkEnvironmentConfig()
      this.checkSecurityHeaders()
      this.checkDependencies()
      this.checkCICD()
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