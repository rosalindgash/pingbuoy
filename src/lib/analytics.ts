'use client'

import { getCookieConsentManager } from './cookie-consent'

// Analytics event types
export interface AnalyticsEvent {
  action: string
  category: string
  label?: string
  value?: number
  custom_parameters?: Record<string, any>
}

// User properties for analytics
export interface UserProperties {
  user_id?: string
  plan_type?: 'free' | 'pro' | 'founder'
  signup_date?: string
  websites_count?: number
  integrations_count?: number
}

// Page view data
export interface PageViewData {
  page_title: string
  page_location: string
  page_referrer?: string
  user_properties?: UserProperties
}

// Security-focused analytics manager
export class SecureAnalytics {
  private static instance: SecureAnalytics
  private isInitialized = false
  private gaId: string | null = null
  private debugMode = false

  private constructor() {
    this.debugMode = process.env.NODE_ENV === 'development'
  }

  public static getInstance(): SecureAnalytics {
    if (!SecureAnalytics.instance) {
      SecureAnalytics.instance = new SecureAnalytics()
    }
    return SecureAnalytics.instance
  }

  // Initialize Google Analytics
  public async initialize(measurementId: string): Promise<void> {
    if (this.isInitialized) return

    this.gaId = measurementId

    // Check if user has consented to analytics cookies
    const consentManager = getCookieConsentManager()
    const hasConsent = consentManager.hasConsent()
    const preferences = consentManager.getPreferences()

    if (!hasConsent || !preferences?.analytics) {
      if (this.debugMode) {
        console.log('Analytics: User has not consented to analytics cookies')
      }
      return
    }

    try {
      // Load Google Analytics script
      await this.loadGoogleAnalytics()
      
      // Configure Google Analytics
      this.configureAnalytics()
      
      this.isInitialized = true

      if (this.debugMode) {
        console.log('Analytics: Google Analytics initialized successfully')
      }
    } catch (error) {
      console.error('Analytics: Failed to initialize Google Analytics:', error)
    }
  }

  // Load Google Analytics script
  private async loadGoogleAnalytics(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.gtag) {
        resolve()
        return
      }

      // Create and load GA script
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaId}`
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Analytics script'))
      
      document.head.appendChild(script)

      // Initialize gtag function
      window.dataLayer = window.dataLayer || []
      window.gtag = function(...args: any[]) {
        window.dataLayer.push(args)
      }
    })
  }

  // Configure Google Analytics with privacy settings
  private configureAnalytics(): void {
    if (!window.gtag || !this.gaId) return

    // Configure with privacy-focused settings
    window.gtag('config', this.gaId, {
      // Privacy settings
      anonymize_ip: true,
      allow_google_signals: false, // Disable Google Signals for privacy
      allow_ad_personalization_signals: false,
      
      // Performance settings
      page_title: document.title,
      page_location: window.location.href,
      
      // Custom settings
      custom_map: {
        'custom_parameter_1': 'plan_type',
        'custom_parameter_2': 'websites_count'
      }
    })

    // Set default consent state (can be updated via cookie banner)
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    })
  }

  // Track page view
  public trackPageView(data: PageViewData): void {
    if (!this.isAnalyticsEnabled()) return

    try {
      if (window.gtag && this.gaId) {
        window.gtag('config', this.gaId, {
          page_title: data.page_title,
          page_location: data.page_location,
          page_referrer: data.page_referrer || document.referrer,
          ...data.user_properties
        })
      }

      // Also track with our internal analytics if needed
      this.trackInternalEvent({
        action: 'page_view',
        category: 'navigation',
        label: data.page_location,
        custom_parameters: {
          page_title: data.page_title,
          ...data.user_properties
        }
      })

      if (this.debugMode) {
        console.log('Analytics: Page view tracked', data)
      }
    } catch (error) {
      console.error('Analytics: Error tracking page view:', error)
    }
  }

  // Track custom event
  public trackEvent(event: AnalyticsEvent): void {
    if (!this.isAnalyticsEnabled()) return

    try {
      // Validate event data
      const validatedEvent = this.validateEvent(event)
      
      if (window.gtag) {
        window.gtag('event', validatedEvent.action, {
          event_category: validatedEvent.category,
          event_label: validatedEvent.label,
          value: validatedEvent.value,
          ...validatedEvent.custom_parameters
        })
      }

      // Track internally
      this.trackInternalEvent(validatedEvent)

      if (this.debugMode) {
        console.log('Analytics: Event tracked', validatedEvent)
      }
    } catch (error) {
      console.error('Analytics: Error tracking event:', error)
    }
  }

  // Track user properties
  public setUserProperties(properties: UserProperties): void {
    if (!this.isAnalyticsEnabled()) return

    try {
      const sanitizedProperties = this.sanitizeUserProperties(properties)

      if (window.gtag) {
        window.gtag('set', {
          user_properties: sanitizedProperties
        })
      }

      if (this.debugMode) {
        console.log('Analytics: User properties set', sanitizedProperties)
      }
    } catch (error) {
      console.error('Analytics: Error setting user properties:', error)
    }
  }

  // Track conversion (for Pro plan signups, etc.)
  public trackConversion(conversionId: string, value?: number, currency = 'USD'): void {
    if (!this.isAnalyticsEnabled()) return

    try {
      if (window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: conversionId,
          value: value,
          currency: currency
        })
      }

      // Track as regular event as well
      this.trackEvent({
        action: 'conversion',
        category: 'ecommerce',
        label: conversionId,
        value: value
      })

      if (this.debugMode) {
        console.log('Analytics: Conversion tracked', { conversionId, value, currency })
      }
    } catch (error) {
      console.error('Analytics: Error tracking conversion:', error)
    }
  }

  // Track internal events (for our own analytics)
  private trackInternalEvent(event: AnalyticsEvent): void {
    try {
      // Store event in localStorage for batch sending
      const events = JSON.parse(localStorage.getItem('pingbuoy_analytics') || '[]')
      events.push({
        ...event,
        timestamp: new Date().toISOString(),
        session_id: this.getSessionId(),
        page_url: window.location.href
      })

      // Keep only last 100 events to prevent storage bloat
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }

      localStorage.setItem('pingbuoy_analytics', JSON.stringify(events))

      // Batch send events periodically
      this.scheduleBatchSend()
    } catch (error) {
      console.error('Analytics: Error storing internal event:', error)
    }
  }

  // Send batched events to our analytics endpoint
  private async sendBatchedEvents(): Promise<void> {
    try {
      const events = JSON.parse(localStorage.getItem('pingbuoy_analytics') || '[]')
      if (events.length === 0) return

      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      })

      if (response.ok) {
        // Clear sent events
        localStorage.setItem('pingbuoy_analytics', '[]')
        
        if (this.debugMode) {
          console.log(`Analytics: Sent ${events.length} batched events`)
        }
      }
    } catch (error) {
      console.error('Analytics: Error sending batched events:', error)
    }
  }

  // Schedule batch sending
  private batchSendTimer: NodeJS.Timeout | null = null
  private scheduleBatchSend(): void {
    if (this.batchSendTimer) return

    this.batchSendTimer = setTimeout(() => {
      this.sendBatchedEvents()
      this.batchSendTimer = null
    }, 30000) // Send every 30 seconds
  }

  // Validate and sanitize event data
  private validateEvent(event: AnalyticsEvent): AnalyticsEvent {
    return {
      action: this.sanitizeString(event.action, 100),
      category: this.sanitizeString(event.category, 100),
      label: event.label ? this.sanitizeString(event.label, 500) : undefined,
      value: typeof event.value === 'number' ? Math.max(0, Math.min(event.value, 1000000)) : undefined,
      custom_parameters: event.custom_parameters ? this.sanitizeObject(event.custom_parameters) : undefined
    }
  }

  // Sanitize user properties
  private sanitizeUserProperties(properties: UserProperties): UserProperties {
    const sanitized: UserProperties = {}

    if (properties.user_id) {
      sanitized.user_id = this.sanitizeString(properties.user_id, 100)
    }
    if (properties.plan_type && ['free', 'pro'].includes(properties.plan_type)) {
      sanitized.plan_type = properties.plan_type
    }
    if (properties.signup_date) {
      sanitized.signup_date = this.sanitizeString(properties.signup_date, 50)
    }
    if (typeof properties.websites_count === 'number') {
      sanitized.websites_count = Math.max(0, Math.min(properties.websites_count, 10000))
    }
    if (typeof properties.integrations_count === 'number') {
      sanitized.integrations_count = Math.max(0, Math.min(properties.integrations_count, 100))
    }

    return sanitized
  }

  // Sanitize string input
  private sanitizeString(input: string, maxLength: number): string {
    return input
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, maxLength)
      .trim()
  }

  // Sanitize object properties
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof key === 'string' && key.length <= 50) {
        const cleanKey = this.sanitizeString(key, 50)
        
        if (typeof value === 'string') {
          sanitized[cleanKey] = this.sanitizeString(value, 500)
        } else if (typeof value === 'number') {
          sanitized[cleanKey] = Math.max(-1000000, Math.min(value, 1000000))
        } else if (typeof value === 'boolean') {
          sanitized[cleanKey] = value
        }
        // Ignore other types for security
      }
    }

    return sanitized
  }

  // Get or create session ID
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }

  // Check if analytics is enabled (user consent + initialization)
  private isAnalyticsEnabled(): boolean {
    if (!this.isInitialized) return false
    
    const consentManager = getCookieConsentManager()
    const preferences = consentManager.getPreferences()
    
    return preferences?.analytics === true
  }

  // Update consent status (called from cookie banner)
  public updateConsent(analyticsConsent: boolean): void {
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: analyticsConsent ? 'granted' : 'denied'
      })
    }

    if (analyticsConsent && !this.isInitialized && this.gaId) {
      // Initialize analytics if user just consented
      this.initialize(this.gaId)
    }

    if (this.debugMode) {
      console.log('Analytics: Consent updated', { analyticsConsent })
    }
  }

  // Clean up analytics data (for GDPR compliance)
  public clearAnalyticsData(): void {
    try {
      localStorage.removeItem('pingbuoy_analytics')
      sessionStorage.removeItem('analytics_session_id')
      
      // Clear Google Analytics data if possible
      if (window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied'
        })
      }

      if (this.debugMode) {
        console.log('Analytics: All analytics data cleared')
      }
    } catch (error) {
      console.error('Analytics: Error clearing analytics data:', error)
    }
  }
}

// Convenience functions and hooks
export const getAnalytics = () => SecureAnalytics.getInstance()

// Predefined event tracking functions
export const trackPageView = (title: string, location?: string) => {
  getAnalytics().trackPageView({
    page_title: title,
    page_location: location || window.location.href,
    page_referrer: document.referrer
  })
}

export const trackSignup = (plan: 'free' | 'pro' | 'founder' = 'free') => {
  getAnalytics().trackEvent({
    action: 'sign_up',
    category: 'auth',
    label: plan,
    custom_parameters: { plan_type: plan }
  })
}

export const trackLogin = () => {
  getAnalytics().trackEvent({
    action: 'login',
    category: 'auth'
  })
}

export const trackWebsiteAdded = () => {
  getAnalytics().trackEvent({
    action: 'website_added',
    category: 'monitoring',
    label: 'new_website'
  })
}

export const trackIntegrationAdded = (integrationType: string) => {
  getAnalytics().trackEvent({
    action: 'integration_added',
    category: 'integrations',
    label: integrationType
  })
}

export const trackUpgrade = (fromPlan: string, toPlan: string, value?: number) => {
  getAnalytics().trackEvent({
    action: 'upgrade',
    category: 'subscription',
    label: `${fromPlan}_to_${toPlan}`,
    value: value,
    custom_parameters: {
      from_plan: fromPlan,
      to_plan: toPlan
    }
  })
}

export const trackFeatureUsed = (feature: string, context?: string) => {
  getAnalytics().trackEvent({
    action: 'feature_used',
    category: 'engagement',
    label: feature,
    custom_parameters: { context }
  })
}

// Global type declarations
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}