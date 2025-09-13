'use client'

export interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export interface ConsentData {
  preferences: CookiePreferences
  timestamp: string
  version: string
}

const CONSENT_STORAGE_KEY = 'cookie-consent'
const CONSENT_VERSION = '1.0'

export class CookieConsentManager {
  private static instance: CookieConsentManager
  private preferences: CookiePreferences | null = null

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadPreferences()
    }
  }

  public static getInstance(): CookieConsentManager {
    if (!CookieConsentManager.instance) {
      CookieConsentManager.instance = new CookieConsentManager()
    }
    return CookieConsentManager.instance
  }

  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
      if (stored) {
        const data: ConsentData = JSON.parse(stored)
        
        // Validate stored data structure
        if (this.isValidConsentData(data)) {
          this.preferences = data.preferences
        } else {
          // Invalid data, clear it
          localStorage.removeItem(CONSENT_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Error loading cookie preferences:', error)
      // Clear corrupted data
      localStorage.removeItem(CONSENT_STORAGE_KEY)
    }
  }

  private isValidConsentData(data: any): data is ConsentData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.preferences === 'object' &&
      typeof data.preferences.necessary === 'boolean' &&
      typeof data.preferences.analytics === 'boolean' &&
      typeof data.preferences.marketing === 'boolean' &&
      typeof data.timestamp === 'string' &&
      typeof data.version === 'string'
    )
  }

  public hasConsent(): boolean {
    return this.preferences !== null
  }

  public getPreferences(): CookiePreferences | null {
    return this.preferences
  }

  public setPreferences(preferences: CookiePreferences): void {
    try {
      // Validate preferences
      if (!this.isValidPreferences(preferences)) {
        throw new Error('Invalid preferences object')
      }

      // Ensure necessary cookies are always true
      const validatedPreferences: CookiePreferences = {
        ...preferences,
        necessary: true // Always required
      }

      const consentData: ConsentData = {
        preferences: validatedPreferences,
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION
      }

      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData))
      this.preferences = validatedPreferences

      // Apply cookie settings
      this.applyCookieSettings(validatedPreferences)
      
      // Dispatch consent change event
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
        detail: validatedPreferences
      }))
    } catch (error) {
      console.error('Error setting cookie preferences:', error)
      throw error
    }
  }

  private isValidPreferences(prefs: any): prefs is CookiePreferences {
    return (
      typeof prefs === 'object' &&
      prefs !== null &&
      typeof prefs.necessary === 'boolean' &&
      typeof prefs.analytics === 'boolean' &&
      typeof prefs.marketing === 'boolean'
    )
  }

  private applyCookieSettings(preferences: CookiePreferences): void {
    // Configure Google Analytics/gtag consent
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: preferences.analytics ? 'granted' : 'denied',
        ad_storage: preferences.marketing ? 'granted' : 'denied',
        ad_user_data: preferences.marketing ? 'granted' : 'denied',
        ad_personalization: preferences.marketing ? 'granted' : 'denied'
      })
    }

    // Set consent mode for other analytics services
    if (preferences.analytics) {
      this.enableAnalytics()
    } else {
      this.disableAnalytics()
    }

    if (preferences.marketing) {
      this.enableMarketing()
    } else {
      this.disableMarketing()
    }
  }

  private enableAnalytics(): void {
    // Enable analytics tracking
    console.log('Analytics cookies enabled')
    
    // Example: Initialize Google Analytics if not already done
    if (typeof window !== 'undefined' && !window.gtag) {
      // Load analytics script (would be done in _document.tsx or similar)
    }
  }

  private disableAnalytics(): void {
    // Disable analytics tracking
    console.log('Analytics cookies disabled')
    
    // Clear analytics cookies if they exist
    this.clearCookiesByPattern(/^_ga/i)
  }

  private enableMarketing(): void {
    // Enable marketing cookies
    console.log('Marketing cookies enabled')
  }

  private disableMarketing(): void {
    // Disable marketing cookies
    console.log('Marketing cookies disabled')
    
    // Clear marketing cookies
    this.clearCookiesByPattern(/^_fbp|^_fbc/i)
  }

  private clearCookiesByPattern(pattern: RegExp): void {
    if (typeof document === 'undefined') return

    // Get all cookies
    const cookies = document.cookie.split(';')
    
    cookies.forEach(cookie => {
      const [name] = cookie.split('=')
      const cleanName = name.trim()
      
      if (pattern.test(cleanName)) {
        // Clear the cookie by setting it to expire
        document.cookie = `${cleanName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
        document.cookie = `${cleanName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname};`
      }
    })
  }

  public clearAllConsent(): void {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY)
      this.preferences = null
      
      // Clear all non-essential cookies
      this.disableAnalytics()
      this.disableMarketing()
      
      // Dispatch consent cleared event
      window.dispatchEvent(new CustomEvent('cookieConsentCleared'))
    } catch (error) {
      console.error('Error clearing cookie consent:', error)
    }
  }

  public updateConsentIfNeeded(): boolean {
    if (!this.preferences) return false

    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
      if (stored) {
        const data: ConsentData = JSON.parse(stored)
        
        // Check if version needs update
        if (data.version !== CONSENT_VERSION) {
          console.log('Cookie consent version outdated, requiring re-consent')
          this.clearAllConsent()
          return true // Needs re-consent
        }
      }
    } catch (error) {
      console.error('Error checking consent version:', error)
      this.clearAllConsent()
      return true
    }

    return false
  }
}

// Convenience functions
export const getCookieConsentManager = () => CookieConsentManager.getInstance()

export const hasUserConsent = (): boolean => {
  return getCookieConsentManager().hasConsent()
}

export const getUserPreferences = (): CookiePreferences | null => {
  return getCookieConsentManager().getPreferences()
}

export const setUserPreferences = (preferences: CookiePreferences): void => {
  getCookieConsentManager().setPreferences(preferences)
}

// Type declarations
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}