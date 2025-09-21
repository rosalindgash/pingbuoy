'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
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
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 404 Content */}
      <div className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          {/* Error Illustration */}
          <div className="mb-8">
            <div className="mx-auto h-32 w-32 text-blue-500">
              <svg
                className="h-full w-full"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.02-5.709-2.619l-2.148-2.148C2.533 8.722 2 6.944 2 5c0-1.657 1.343-3 3-3s3 1.343 3 3c0 .24-.028.474-.082.696A5.98 5.98 0 0112 3a5.98 5.98 0 014.082 2.696C16.028 5.474 16 5.24 16 5c0-1.657 1.343-3 3-3s3 1.343 3 3c0 1.944-.533 3.722-2.143 5.233l-2.148 2.148A7.962 7.962 0 0112 15z"
                />
              </svg>
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              Sorry, we couldn&apos;t find the page you&apos;re looking for. 
              The page may have been moved, deleted, or the URL might be incorrect.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto flex items-center justify-center">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Popular Pages
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link 
                href="/pricing" 
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center p-2"
              >
                <span>Pricing Plans</span>
              </Link>
              <Link 
                href="/about" 
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center p-2"
              >
                <span>About Us</span>
              </Link>
              <Link 
                href="/signup" 
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center p-2"
              >
                <span>Sign Up</span>
              </Link>
              <Link 
                href="/contact" 
                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center p-2"
              >
                <span>Contact Support</span>
              </Link>
            </div>
          </div>

          {/* Additional Help */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Need help?</strong> If you believe this is an error or you need assistance, 
              please <Link href="/contact" className="underline hover:no-underline">contact our support team</Link>.
            </p>
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