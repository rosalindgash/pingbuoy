'use client'

import { useEffect } from 'react'
import { AlertTriangle, Home } from 'lucide-react'
import { logger } from '@/lib/secure-logger'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical application errors securely with automatic redaction
    logger.error('Critical application error', error, {
      type: 'global_error',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      errorDigest: error.digest || 'no-digest'
    })
  }, [error])

  // Provide a minimal, secure fallback UI
  return (
    <html lang="en">
      <head>
        <title>System Error - PingBuoy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-50 font-sans antialiased">
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-8">
              <div className="mx-auto h-24 w-24 text-red-500">
                <AlertTriangle className="h-full w-full" />
              </div>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                System Error
              </h1>
              <p className="text-gray-600 mb-6">
                We&apos;re experiencing technical difficulties. Our team has been 
                automatically notified and is working to resolve this issue.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  // Clear potentially corrupted state before reset
                  try {
                    if (typeof window !== 'undefined') {
                      sessionStorage.clear()
                      localStorage.removeItem('temp_data')
                    }
                  } catch {
                    // Ignore storage errors
                  }
                  reset()
                }}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Try Again
              </button>
              
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </a>
            </div>

            {/* Error Reference */}
            {error.digest && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Error Reference:</strong>{' '}
                  <code className="font-mono bg-white px-2 py-1 rounded text-xs">
                    {error.digest}
                  </code>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Please include this reference when contacting support
                </p>
              </div>
            )}

            {/* Support Information */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Need immediate assistance?</strong>
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Contact our support team at{' '}
                <a 
                  href="mailto:support@pingbuoy.com" 
                  className="underline hover:no-underline"
                >
                  support@pingbuoy.com
                </a>
              </p>
            </div>

            {/* Basic Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                &copy; 2025 PingBuoy. All rights reserved.
              </p>
              <div className="mt-2 space-x-4 text-xs">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/status" className="text-blue-600 hover:text-blue-800">
                  System Status
                </a>
                <a href="/contact" className="text-blue-600 hover:text-blue-800">
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal inline styles for critical error scenarios */}
        <style jsx>{`
          .font-sans {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .antialiased {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `}</style>
      </body>
    </html>
  )
}