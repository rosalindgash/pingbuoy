// Advanced Security Configuration for 2025
// Addresses latest threats: AI/ML security, supply chain, cloud misconfigurations

// Enhanced Content Security Policy for 2025 (stricter AI/ML considerations)
export const csp2025 = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'", 
    "'wasm-unsafe-eval'", // For WebAssembly if needed
    "https://js.stripe.com"
  ],
  'script-src-elem': [
    "'self'",
    "https://js.stripe.com"
  ],
  'style-src': [
    "'self'", 
    "'unsafe-inline'", // Necessary for React/Next.js
    "https://fonts.googleapis.com"
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com"
  ],
  'img-src': [
    "'self'", 
    "data:", 
    "https:",
    "blob:" // For generated images/charts
  ],
  'connect-src': [
    "'self'",
    "https://*.supabase.co",
    "https://api.stripe.com",
    "wss://*.supabase.co" // WebSocket for real-time features
  ],
  'frame-src': [
    "https://js.stripe.com"
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': true,
  // 2025 Addition: Trusted Types for DOM manipulation security
  'require-trusted-types-for': ["'script'"],
  'trusted-types': ['default']
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
  
  // Passwordless authentication
  passwordless: {
    webauthn: true,
    magicLinks: true,
    biometric: true
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

// Security Headers for 2025
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