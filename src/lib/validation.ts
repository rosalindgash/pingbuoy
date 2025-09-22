import { z } from 'zod'

// UUID validation schema
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Validate UUID helper function
export function isValidUUID(value: string): boolean {
  try {
    uuidSchema.parse(value)
    return true
  } catch {
    return false
  }
}

// Validate and return UUID or throw error
export function validateUUID(value: string | null, paramName: string = 'ID'): string {
  if (!value) {
    throw new Error(`${paramName} is required`)
  }
  
  if (!isValidUUID(value)) {
    throw new Error(`Invalid ${paramName} format`)
  }
  
  return value
}

// Common API validation schemas
export const commonSchemas = {
  siteId: uuidSchema,
  userId: uuidSchema,
  scanId: uuidSchema,
  alertId: uuidSchema,
}

// Email validation (lenient - allows any valid email format including custom domains)
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .refine((email) => {
    // More lenient email validation that allows custom domains
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, 'Please enter a valid email address')
  .toLowerCase()

// URL validation (strict)
export const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .refine((url) => {
    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }, 'Only HTTP and HTTPS URLs are allowed')

// Site name validation
export const siteNameSchema = z.string()
  .min(1, 'Site name is required')
  .max(100, 'Site name too long')
  .trim()

// Password validation (NIST aligned)
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((password) => {
    // Check for at least 3 of the 4 character types
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[^a-zA-Z0-9]/.test(password)
    
    const typeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
    return typeCount >= 3
  }, 'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters')

// Site validation schema
export const siteSchema = z.object({
  name: siteNameSchema,
  url: urlSchema
})

// User profile validation schema
export const userProfileSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .trim(),
  plan: z.enum(['free', 'pro']).default('free'),
  role: z.enum(['user', 'admin']).default('user'),
  account_status: z.enum(['active', 'suspended', 'deletion_pending']).default('active'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deletion_scheduled_at: z.string().datetime().nullable()
})

// Contact form validation
export const contactSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .trim(),
  email: emailSchema,
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long')
    .trim(),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long')
    .trim(),
  plan: z.string().optional()
})

// Generic validation and sanitization function
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errors = result.error?.errors?.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') || 'Validation failed'
    throw new Error(`Validation failed: ${errors}`)
  }
  
  return result.data
}