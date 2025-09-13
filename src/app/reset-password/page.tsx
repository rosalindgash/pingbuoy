'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidSession(true)
      } else {
        setMessage('Invalid or expired reset link. Please request a new password reset.')
      }
    }
    
    checkSession()
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setMessage('Error: ' + error.message)
      } else {
        setMessage('Password updated successfully! You will be logged out and redirected to the login page.')
        // Sign out the user and redirect to login
        setTimeout(async () => {
          await supabase.auth.signOut()
          window.location.href = '/login?message=Password updated successfully. Please sign in with your new password.'
        }, 2000)
      }
    } catch (error) {
      setMessage('An unexpected error occurred: ' + error)
    } finally {
      setLoading(false)
    }
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {message || 'This password reset link is invalid or has expired.'}
            </p>
          </div>
          
          <div className="text-center">
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500">
              Request a new password reset link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            minLength={6}
            required
          />
          
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            minLength={6}
            required
          />
          
          {message && (
            <div className={`p-3 border rounded-lg text-sm ${
              message.startsWith('Error') || message.includes('do not match')
                ? 'bg-red-50 border-red-200 text-red-700'
                : message.includes('successfully')
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {message}
            </div>
          )}
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating password...' : 'Update password'}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}