'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always required
  analytics: false,
  marketing: false
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setIsVisible(true)
    }
  }, [])

  const setCookieConsent = (prefs: CookiePreferences) => {
    try {
      // Store preferences securely
      const consentData = {
        preferences: prefs,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
      
      localStorage.setItem('cookie-consent', JSON.stringify(consentData))
      
      // Set functional cookies based on preferences
      if (prefs.analytics) {
        // Enable analytics tracking (Google Analytics, etc.)
        window.gtag?.('consent', 'update', {
          analytics_storage: 'granted'
        })
      }
      
      if (prefs.marketing) {
        // Enable marketing cookies
        window.gtag?.('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted'
        })
      }
      
      setIsVisible(false)
    } catch (error) {
      console.error('Error saving cookie preferences:', error)
    }
  }

  const acceptAll = () => {
    setCookieConsent({
      necessary: true,
      analytics: true,
      marketing: true
    })
  }

  const acceptNecessary = () => {
    setCookieConsent(defaultPreferences)
  }

  const savePreferences = () => {
    setCookieConsent(preferences)
  }

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'necessary') return // Cannot disable necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }))
  }

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop - Only show when preferences panel is open */}
      {showPreferences && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowPreferences(false)}
        />
      )}
      
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {!showPreferences ? (
            /* Main Banner */
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    We use cookies to enhance your experience
                  </h3>
                  <p className="text-sm text-gray-600">
                    We use essential cookies to make our site work and optional cookies for analytics and marketing. 
                    By clicking "Accept All", you consent to our use of cookies. You can manage your preferences anytime.{' '}
                    <Link href="/privacy" className="text-blue-600 hover:underline">
                      Learn more in our Privacy Policy
                    </Link>.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                  className="flex items-center gap-2 justify-center"
                >
                  <Settings className="h-4 w-4" />
                  Customize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptNecessary}
                  className="justify-center"
                >
                  Essential Only
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="justify-center"
                >
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            /* Preferences Panel */
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Cookie Preferences
                </h3>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Close preferences"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Essential Cookies</h4>
                      <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        Always Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      These cookies are necessary for the website to function and cannot be switched off. 
                      They include authentication, security, and basic functionality.
                    </p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Analytics Cookies</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={preferences.analytics}
                          onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Help us understand how visitors interact with our website by collecting and reporting 
                      information anonymously. This helps us improve our service.
                    </p>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Marketing Cookies</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={preferences.marketing}
                          onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Used to track visitors across websites to display relevant advertisements 
                      and measure campaign effectiveness.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptNecessary}
                  className="flex-1 justify-center"
                >
                  Essential Only
                </Button>
                <Button
                  size="sm"
                  onClick={savePreferences}
                  className="flex-1 justify-center"
                >
                  Save Preferences
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                You can change these settings anytime in your browser or by visiting our{' '}
                <Link href="/cookies" className="text-blue-600 hover:underline">
                  Cookie Policy
                </Link>.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Type declarations for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}