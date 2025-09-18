'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { User, Save } from 'lucide-react'

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
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: fullName }),
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <User className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-medium text-gray-900">Account Information</h2>
      </div>
      
      <div className="space-y-4">
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
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <div className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
            {profile.email}
          </div>
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
      </div>
    </div>
  )
}