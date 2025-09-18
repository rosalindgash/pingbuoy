// Security configuration and headers
export const securityHeaders = {
  // Prevent XSS attacks
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy (Optimized - Removed unused allowances)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com", // Removed 'unsafe-inline'
    "style-src 'self' 'unsafe-inline'", // Removed Google Fonts - not used
    "font-src 'self'", // Removed Google Fonts - not used
    "img-src 'self' data: https://pingbuoy.com", // Restricted to specific domain
    "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co", // Added WebSocket
    "frame-src https://js.stripe.com",
    "object-src 'none'", // Added security
    "base-uri 'self'", // Added security
    "form-action 'self'", // Added security
    "frame-ancestors 'none'" // Added security
  ].join('; '),
  
  // Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=(self)',
  ].join(', ')
}

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
}

// API route rate limits (per endpoint)
export const apiRateLimits = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
  },
  contact: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 contact form submissions per hour
  },
  sites: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 site operations per minute
  }
}

// Password policy configuration
export const passwordPolicy = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  preventCommonPasswords: true,
  preventReuse: 5, // Don't allow reuse of last 5 passwords
}

// Session configuration
export const sessionConfig = {
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  rolling: true, // Reset expiry on activity
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  httpOnly: true,
  sameSite: 'strict' as const,
}

// File upload security
export const fileUploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  scanForMalware: true,
}

// Input validation limits
export const inputLimits = {
  email: { max: 254 },
  name: { max: 100 },
  url: { max: 2048 },
  message: { max: 2000 },
  subject: { max: 200 },
  siteName: { max: 100 },
}

// CORS configuration
export const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL || 'https://pingbuoy.com']
    : ['http://localhost:3000', 'http://localhost:4000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
}