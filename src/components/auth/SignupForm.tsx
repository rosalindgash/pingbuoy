'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { passwordSchema } from '@/lib/validation'
import { Eye, EyeOff } from 'lucide-react'

export default function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<'signup' | 'verify'>('signup')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = []
    try {
      passwordSchema.parse(pwd)
    } catch (error: any) {
      if (error.errors) {
        errors.push(...error.errors.map((e: any) => e.message))
      }
    }
    return errors
  }

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd)
    setPasswordErrors(validatePassword(pwd))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    const errors = validatePassword(password)
    if (errors.length > 0) {
      setMessage(errors[0])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/login&verified=true`
        }
      })

      if (error) {
        setMessage('Error: ' + error.message)
      } else if (data.user) {
        if (data.user.email_confirmed_at) {
          // Email already confirmed, redirect to login
          window.location.href = '/login?message=Account created successfully. Please sign in.'
        } else {
          // Need email verification
          setStep('verify')
          setMessage('Please check your email and click the verification link to complete your account setup.')
        }
      }
    } catch (error) {
      setMessage('An unexpected error occurred: ' + error)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'verify') {
    return (
      <div className="flex flex-col gap-4 max-w-sm mx-auto">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Check your email
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            We&apos;ve sent a verification link to <strong>{email}</strong>. 
            Please click the link in your email to verify your account.
          </p>
          <p className="text-xs text-gray-500">
            After verification, you&apos;ll be redirected to the login page where you can sign in with your new password.
          </p>
        </div>
        
        {message && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {message}
          </div>
        )}
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already verified?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignup} className="flex flex-col gap-4 max-w-sm mx-auto">
      <input
        id="signup-email"
        name="email"
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="email"
        required
      />
      
      <div>
        <div className="relative">
          <input
            id="signup-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            className={`px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 w-full ${
              password && passwordErrors.length > 0 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            autoComplete="new-password"
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
        {password && (
          <div className="mt-2 text-sm">
            <p className="font-medium text-gray-700 mb-2">Password requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                At least 8 characters long
              </li>
              <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                One lowercase letter
              </li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                One uppercase letter  
              </li>
              <li className={/\d/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                One number
              </li>
              <li className={/[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                One special character
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              Need at least 3 of the above requirements
            </p>
          </div>
        )}
      </div>
      
      <div className="relative">
        <input
          id="confirm-password"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showConfirmPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      
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
        {loading ? 'Creating account...' : 'Create account'}
      </Button>
      
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            Sign in here
          </Link>
        </p>
      </div>
    </form>
  )
}