'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { User, Save, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'pro' | 'founder'
  created_at: string
}

interface AccountInformationProps {
  profile: UserProfile
}

export default function AccountInformation({ profile }: AccountInformationProps) {
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [email, setEmail] = useState(profile.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Update profile info
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email !== profile.email ? email : undefined
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Profile updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Error: ' + (result.error || 'Failed to update profile'))
      }
    } catch (_error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters long')
      return
    }

    setPasswordLoading(true)
    setMessage('')

    try {
      // Use Supabase's updateUser method for password change
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage('Error changing password: ' + error.message)
      } else {
        setMessage('Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('An unexpected error occurred while changing password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <User className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-medium text-gray-900">Account Information</h2>
      </div>
      
      <div className="space-y-4">
        {/* Instructional note */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> To change your name or email, simply type in the new information and click "Save Changes".
          </p>
        </div>

        <div>
          <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email address"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Plan</label>
          <div className="mt-1">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              profile.plan === 'free' ? 'bg-gray-100 text-gray-800' :
              profile.plan === 'founder' ? 'bg-purple-100 text-purple-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
            </span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Member Since</label>
          <div className="mt-1 text-sm text-gray-900">
            {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Password Change Section */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Lock className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <div className="mt-1 relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password (min 8 characters)"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handlePasswordChange}
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                variant="outline"
                className="flex items-center"
              >
                <Lock className="w-4 h-4 mr-2" />
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}