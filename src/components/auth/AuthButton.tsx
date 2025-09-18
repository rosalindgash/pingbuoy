'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { authLogger } from '@/lib/secure-logger'

export default function AuthButton() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Environment validation (development only)
    if (process.env.NODE_ENV === 'development') {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.warn('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
      }
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
      }
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        authLogger.error('Authentication failed', error)
        alert('Error: ' + error.message)
      } else {
        alert('Check your email for the login link!')
      }
    } catch (error) {
      authLogger.error('Unexpected authentication error', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-4 max-w-sm">
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-4 py-2 border rounded-lg"
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        onClick={handleSignOut}
        className="mt-2"
      >
        Sign Out
      </Button>
    </form>
  )
}