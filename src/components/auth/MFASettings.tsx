'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { authLogger } from '@/lib/secure-logger'

interface Factor {
  id: string
  friendly_name: string
  factor_type: string
  status: string
}

export default function MFASettings() {
  const [factors, setFactors] = useState<Factor[]>([])
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string>('')
  const [verifyCode, setVerifyCode] = useState('')
  const [enrollingFactor, setEnrollingFactor] = useState<Factor | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMFAFactors()
  }, [])

  const loadMFAFactors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: factors, error } = await supabase.auth.mfa.listFactors()
      if (error) {
        authLogger.error('Error loading MFA factors', error)
        setMessage('Error loading MFA settings')
        return
      }

      setFactors(factors?.totp || [])
    } catch (error) {
      authLogger.error('Error loading MFA settings', error)
      setMessage('Error loading MFA settings')
    } finally {
      setLoading(false)
    }
  }

  const enrollMFA = async () => {
    setIsEnrolling(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'PingBuoy TOTP'
      })

      if (error) {
        setMessage('Error setting up MFA: ' + error.message)
        return
      }

      if (data) {
        setQrCode(data.totp.qr_code)
        setEnrollingFactor(data)
      }
    } catch (error) {
      authLogger.error('Error enrolling MFA', error)
      setMessage('Error setting up MFA')
    } finally {
      setIsEnrolling(false)
    }
  }

  const verifyAndEnableMFA = async () => {
    if (!enrollingFactor) return

    // Security: Validate code format
    if (!verifyCode || verifyCode.length !== 6 || !/^\d{6}$/.test(verifyCode)) {
      setMessage('Please enter a valid 6-digit code.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Security: Verify user is still authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setMessage('Authentication required. Please log in again.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollingFactor.id,
        code: verifyCode
      })

      if (error) {
        // Security: Rate limiting protection - don't expose too much info
        if (error.message.includes('rate')) {
          setMessage('Too many attempts. Please wait before trying again.')
        } else {
          setMessage('Invalid code. Please try again.')
        }
        return
      }

      if (data) {
        setMessage('MFA enabled successfully!')
        setQrCode('')
        setVerifyCode('')
        setEnrollingFactor(null)
        await loadMFAFactors()
      }
    } catch (error) {
      authLogger.error('Error verifying MFA', error)
      setMessage('Error verifying code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const disableMFA = async (factorId: string) => {
    // Security: Validate factorId format
    if (!factorId || typeof factorId !== 'string') {
      setMessage('Invalid factor ID')
      return
    }

    // Security: Confirm the action (this is a critical security operation)
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Security: Verify user is still authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setMessage('Authentication required. Please log in again.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.mfa.unenroll({ factorId })

      if (error) {
        // Security: Don't expose detailed error messages
        if (process.env.NODE_ENV === 'development') {
          console.error('MFA disable error:', error)
        }
        setMessage('Error disabling MFA. Please try again.')
        return
      }

      setMessage('MFA disabled successfully')
      await loadMFAFactors()
    } catch (error) {
      authLogger.error('Error disabling MFA', error)
      setMessage('Error disabling MFA. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const activeMFAFactors = factors.filter(f => f.status === 'verified')
  const hasMFA = activeMFAFactors.length > 0

  if (loading && !isEnrolling) {
    return <div className="text-center py-4">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 border rounded-lg text-sm ${
          message.includes('Error') 
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {!hasMFA && !qrCode && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span className="text-gray-900 font-medium">Two-factor authentication is disabled</span>
          </div>
          <p className="text-gray-600 mb-4">
            Enable two-factor authentication to secure your account with an additional verification step.
          </p>
          <Button 
            onClick={enrollMFA} 
            disabled={isEnrolling}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isEnrolling ? 'Setting up...' : 'Enable Two-Factor Authentication'}
          </Button>
        </div>
      )}

      {qrCode && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Set up your authenticator app</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
              </p>
              <div className="bg-white p-4 rounded-lg border inline-block">
                <img src={qrCode} alt="QR Code for MFA setup" className="w-48 h-48" />
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">
                2. Enter the 6-digit code from your authenticator app:
              </p>
              <div className="flex gap-2 max-w-xs">
                <input
                  type="text"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono text-lg"
                  maxLength={6}
                />
                <Button 
                  onClick={verifyAndEnableMFA}
                  disabled={verifyCode.length !== 6 || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Verify & Enable
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasMFA && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-gray-900 font-medium">Two-factor authentication is enabled</span>
          </div>
          
          <div className="space-y-3">
            {activeMFAFactors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{factor.friendly_name}</p>
                  <p className="text-sm text-gray-600">TOTP Authenticator</p>
                </div>
                <Button 
                  onClick={() => disableMFA(factor.id)}
                  disabled={loading}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Disable
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}