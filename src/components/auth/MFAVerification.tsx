'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

interface MFAVerificationProps {
  onSuccess: () => void
  onBack: () => void
}

export default function MFAVerification({ onSuccess, onBack }: MFAVerificationProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.find(f => f.status === 'verified')

      if (!totpFactor) {
        setMessage('No MFA factor found. Please contact support.')
        return
      }

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: code
      })

      if (error) {
        setMessage('Invalid code. Please try again.')
        return
      }

      if (data) {
        onSuccess()
      }
    } catch (error) {
      console.error('MFA verification error:', error)
      setMessage('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Two-Factor Authentication</h2>
        <p className="mt-2 text-gray-600">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-4 max-w-sm mx-auto">
        <input
          type="text"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono text-xl tracking-wider"
          maxLength={6}
          autoComplete="one-time-code"
          required
        />
        
        {message && (
          <div className="p-3 border border-red-200 rounded-lg text-sm bg-red-50 text-red-700">
            {message}
          </div>
        )}
        
        <Button 
          type="submit" 
          disabled={code.length !== 6 || loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </Button>

        <Button 
          type="button"
          onClick={onBack}
          variant="outline"
          className="text-gray-600"
        >
          Back to Login
        </Button>
      </form>
    </div>
  )
}