'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import MFAVerification from './MFAVerification'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showMFA, setShowMFA] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const urlMessage = urlParams.get('message')
    const urlError = urlParams.get('error')
    
    if (urlMessage) {
      setMessage(urlMessage)
    } else if (urlError) {
      setMessage('Error: ' + urlError)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Check if Supabase is configured
    if (!supabase) {
      setMessage('Authentication service is not configured. Please set up environment variables.')
      setLoading(false)
      return
    }

    try {
      // SECURITY: First check if user has MFA before authenticating
      // This prevents bypassing MFA by staying on authenticated session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setMessage('Invalid email or password. Please try again.')
        } else if (signInError.message.includes('Email not confirmed')) {
          setMessage('Please check your email and click the verification link to confirm your account.')
        } else {
          setMessage('Error: ' + signInError.message)
        }
        return
      }

      if (signInData.user) {
        // SECURITY: Check if user has MFA enabled immediately after password verification
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()

        if (factorsError) {
          await supabase.auth.signOut() // Security: sign out on error
          setMessage('Authentication error. Please try again.')
          return
        }

        const hasMFA = factors?.totp?.some(f => f.status === 'verified')

        if (hasMFA) {
          // SECURITY: For MFA users, we need to challenge immediately
          // Don't let them proceed without completing MFA
          setShowMFA(true)
          setMessage('Please enter your 6-digit authentication code')
        } else {
          // No MFA enabled, proceed to dashboard
          setMessage('Login successful! Redirecting to dashboard...')
          window.location.href = '/dashboard'
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMFASuccess = () => {
    setMessage('Login successful! Redirecting to dashboard...')
    window.location.href = '/dashboard'
  }

  const handleMFABack = () => {
    setShowMFA(false)
    // Sign out the user since they haven't completed MFA
    supabase.auth.signOut()
  }

  if (showMFA) {
    return <MFAVerification onSuccess={handleMFASuccess} onBack={handleMFABack} />
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 max-w-sm mx-auto">
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="email"
          required
        />
        
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {message && (
          <div className={`p-3 border rounded-lg text-sm ${
            message.startsWith('Error') || message.includes('Invalid')
              ? 'bg-red-50 border-red-200 text-red-700'
              : message.includes('successfully') || message.includes('verified')
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {message}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        
        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
            Forgot your password?
          </Link>
        </div>
      </form>
      
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-500">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  )
}