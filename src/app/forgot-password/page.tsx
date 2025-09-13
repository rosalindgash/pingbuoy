'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        setMessage('Error: ' + error.message)
      } else {
        setSent(true)
        setMessage('Check your email for a password reset link!')
      }
    } catch (error) {
      setMessage('An unexpected error occurred: ' + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {sent 
              ? "We've sent you a password reset link"
              : "Enter your email address and we'll send you a link to reset your password"
            }
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            
            {message && (
              <div className={`p-3 border rounded-lg text-sm ${
                message.startsWith('Error')
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                {message}
              </div>
            )}
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <div className="text-center">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-700">
                Password reset link sent to <strong>{email}</strong>
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Check your email and click the link to reset your password.
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}