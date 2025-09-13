'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (but don't expose sensitive details to client)
    const errorInfo = {
      message: 'Application error occurred',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      // Don't log the full error or stack trace to avoid exposing sensitive information
      errorDigest: error.digest || 'no-digest'
    }
    
    // In production, send to your error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      console.error('Error tracked:', errorInfo)
    } else {
      // In development, show more details
      console.error('Development error:', error)
    }
  }, [error])

  const handleRefresh = () => {
    // Clear any potentially corrupted state before reset
    if (typeof window !== 'undefined') {
      try {
        // Clear any cached data that might be causing issues
        sessionStorage.removeItem('cached_data')
        localStorage.removeItem('temp_data')
      } catch {
        // Ignore storage errors
      }
    }
    reset()
  }

  const isNetworkError = error.message.toLowerCase().includes('network') || 
                        error.message.toLowerCase().includes('fetch')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Image
                  src="/ping-buoy-header-logo.png"
                  alt="PingBuoy"
                  width={150}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/about" className="text-gray-600 hover:text-gray-900">
                About
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/faq" className="text-gray-600 hover:text-gray-900">
                FAQ
              </Link>
              <Link href="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Error Content */}
      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className="mb-8">
            <div className="mx-auto h-32 w-32 text-red-500">
              <AlertTriangle className="h-full w-full" />
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Oops!
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              {isNetworkError ? 'Connection Error' : 'Something went wrong'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isNetworkError 
                ? 'We&apos;re having trouble connecting to our servers. Please check your internet connection and try again.'
                : 'We encountered an unexpected error. Our team has been notified and is working to fix this issue.'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRefresh}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
            <Link href="/">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto flex items-center justify-center"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>

          {/* Error ID for Support */}
          {error.digest && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Error ID:</strong> <code className="font-mono">{error.digest}</code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Please include this ID when contacting support
              </p>
            </div>
          )}

          {/* Helpful Information */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="space-y-4">
              {isNetworkError && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">
                    Troubleshooting Tips:
                  </h3>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Try refreshing the page</li>
                    <li>• Clear your browser cache</li>
                    <li>• Disable browser extensions temporarily</li>
                  </ul>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Still having issues?</strong>{' '}
                  <Link href="/contact" className="underline hover:no-underline">
                    Contact our support team
                  </Link>{' '}
                  for immediate assistance.
                </p>
              </div>
            </div>
          </div>

          {/* Status Page Link */}
          <div className="mt-6">
            <Link 
              href="/status" 
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Check System Status
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; 2025 PingBuoy. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <Link href="/privacy" className="hover:text-gray-700">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-700">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-gray-700">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}