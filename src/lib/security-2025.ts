// Advanced Security Configuration for 2025
// Addresses latest threats: AI/ML security, supply chain, cloud misconfigurations

// Enhanced Content Security Policy for 2025 with Google Analytics Support
export const csp2025 = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Allow inline scripts for compatibility
    "https://js.stripe.com", // Stripe checkout
    "https://www.googletagmanager.com", // Google Analytics
    "https://www.google-analytics.com", // Google Analytics
    "https://ssl.google-analytics.com" // Google Analytics SSL
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'" // Allow inline styles for compatibility
  ],
  'font-src': [
    "'self'" // Only local fonts - Google Fonts not used
  ],
  'img-src': [
    "'self'",
    "data:", // For small inline images/icons
    "https://pingbuoy.com", // Only for email templates referencing logo
    "https://www.google-analytics.com", // Google Analytics tracking images
    "https://ssl.google-analytics.com" // Google Analytics SSL tracking images
  ],
  'connect-src': [
    "'self'",
    "https://*.supabase.co", // Supabase API
    "https://api.stripe.com", // Stripe API
    "wss://*.supabase.co", // WebSocket for real-time features
    "https://www.google-analytics.com", // Google Analytics API
    "https://ssl.google-analytics.com" // Google Analytics SSL API
  ],
  'frame-src': [
    "https://js.stripe.com" // Only for Stripe checkout iframe
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': true
}

// Zero Trust Security Principles
export const zeroTrustConfig = {
  // Never trust, always verify
  explicitVerify: true,
  
  // Least privilege access
  leastPrivilegeAccess: {
    defaultDeny: true,
    timeBasedAccess: true,
    contextAwareAccess: true
  },
  
  // Assume breach mentality
  assumeBreach: {
    microsegmentation: true,
    continuousMonitoring: true,
    encryptEverywhere: true
  }
}

// AI/ML Security Configuration (2025 Focus)
export const aiMLSecurityConfig = {
  // Prompt injection prevention
  promptSecurity: {
    maxPromptLength: 1000,
    sanitizeInput: true,
    blockSuspiciousPatterns: [
      'ignore previous instructions',
      'act as',
      'pretend you are',
      'roleplay',
      'jailbreak'
    ],
    rateLimitAI: {
      requests: 10,
      window: '1m'
    }
  },
  
  // Model security
  modelSecurity: {
    validateModelIntegrity: true,
    secureModelStorage: true,
    accessControlOnModels: true
  },
  
  // Data privacy for AI
  dataPrivacy: {
    anonymizeTrainingData: true,
    preventDataLeakage: true,
    auditAIDecisions: true
  }
}

// Supply Chain Security (2025 Enhanced)
export const supplyChainSecurity = {
  // Software Bill of Materials (SBOM)
  sbom: {
    generateSBOM: true,
    validateSBOM: true,
    trackDependencies: true
  },
  
  // Dependency security
  dependencySecurity: {
    pinExactVersions: true,
    verifySignatures: true,
    scanVulnerabilities: 'continuous',
    allowedLicenses: [
      'MIT',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC'
    ]
  },
  
  // CI/CD Pipeline security
  pipelineSecurity: {
    signedCommits: true,
    immutableBuilds: true,
    secretScanning: true,
    buildProvenance: true
  }
}

// Cloud Security Configuration (2025)
export const cloudSecurityConfig = {
  // Configuration management
  configManagement: {
    infrastructureAsCode: true,
    configurationValidation: true,
    driftDetection: true
  },
  
  // Multi-cloud considerations
  multiCloud: {
    uniformPolicies: true,
    centralizedLogging: true,
    crossCloudNetworking: 'encrypted'
  },
  
  // Serverless security
  serverlessSecurity: {
    functionIsolation: true,
    eventValidation: true,
    coldStartSecurity: true
  }
}

// Advanced Logging and Monitoring (2025)
export const advancedMonitoring = {
  // Security Information and Event Management (SIEM)
  siem: {
    realTimeAnalysis: true,
    behavioralAnalysis: true,
    threatIntelligence: true,
    automaticResponse: true
  },
  
  // Observability
  observability: {
    distributedTracing: true,
    securityMetrics: true,
    alerting: {
      anomalyDetection: true,
      threatDetection: true,
      complianceViolations: true
    }
  },
  
  // Audit logging
  auditLogging: {
    immutableLogs: true,
    logIntegrity: true,
    longTermRetention: true,
    complianceReporting: true
  }
}

// Enhanced Authentication (2025 Standards)
export const authConfig2025 = {
  // Multi-factor authentication
  mfa: {
    required: true,
    methods: ['totp', 'webauthn', 'sms_backup'],
    adaptiveAuth: true // Risk-based authentication
  },
  
  // Passwordless authentication (future consideration)
  passwordless: {
    webauthn: false,
    magicLinks: false,
    biometric: false
  },
  
  // Identity and Access Management
  iam: {
    roleBasedAccess: true,
    attributeBasedAccess: true,
    temporaryAccess: true,
    auditTrail: true
  }
}

// API Security (2025 Enhanced)
export const apiSecurity2025 = {
  // API Gateway security
  gateway: {
    rateLimiting: 'adaptive',
    authentication: 'required',
    authorization: 'granular',
    validation: 'strict'
  },
  
  // API versioning security
  versioning: {
    deprecationPolicy: true,
    securityBackporting: true,
    versionIsolation: true
  },
  
  // GraphQL security (if applicable)
  graphql: {
    queryComplexityLimiting: true,
    depthLimiting: true,
    rateLimiting: 'query-based'
  }
}

// Privacy and Compliance (2025)
export const privacyConfig2025 = {
  // Data protection
  dataProtection: {
    dataMinimization: true,
    purposeLimitation: true,
    storageMinimization: true,
    rightToErasure: true
  },
  
  // Regulatory compliance
  compliance: {
    gdpr: true,
    ccpa: true,
    sox: true,
    pciDss: true
  },
  
  // Privacy by design
  privacyByDesign: {
    defaultPrivacySettings: true,
    transparentProcessing: true,
    userControl: true
  }
}

// Security Headers for 2025 - Simplified
export const securityHeaders2025 = {
  // Enhanced security headers
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=(self)',
    'usb=()',
    'serial=()'
  ].join(', '),
  'Content-Security-Policy': Object.entries(csp2025)
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return key
      }
      return `${key} ${Array.isArray(value) ? value.join(' ') : value}`
    })
    .join('; ')
}

// Utility function to generate cryptographically secure nonces
export function generateNonce(): string {
  // Use Node.js crypto in server environment (middleware runs on server)
  try {
    const { randomBytes } = require('crypto')
    return randomBytes(16).toString('base64')
  } catch (error) {
    // Fallback to Web Crypto API if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(16)
      crypto.getRandomValues(array)
      return btoa(String.fromCharCode.apply(null, Array.from(array)))
    }
    // Last resort fallback
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}

// Incident Response (2025)
export const incidentResponse2025 = {
  preparation: {
    playbooks: true,
    tools: 'automated',
    training: 'regular'
  },
  
  detection: {
    continuous: true,
    aiPowered: true,
    threatHunting: true
  },
  
  containment: {
    automated: true,
    networkSegmentation: true,
    forensics: true
  },
  
  recovery: {
    businessContinuity: true,
    dataRecovery: true,
    systemHardening: true
  },
  
  postIncident: {
    lessonsLearned: true,
    processImprovement: true,
    threatIntelligence: true
  }
}