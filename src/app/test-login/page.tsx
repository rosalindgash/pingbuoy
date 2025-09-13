'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestLogin() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Auth error:', error)
        } else if (user) {
          setUser(user)
          
          // Get profile
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
            
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Not Logged In</h1>
        <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Go to Login
        </a>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600 mb-4">Success! You're logged in!</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">User Info:</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>ID:</strong> {user.id}</p>
      </div>

      {profile && (
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h2 className="font-semibold mb-2">Profile Info:</h2>
          <p><strong>Full Name:</strong> {profile.full_name || 'Not set'}</p>
          <p><strong>Plan:</strong> 
            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
              profile.plan === 'founder' ? 'bg-purple-100 text-purple-800' :
              profile.plan === 'pro' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {profile.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : 'Free'}
            </span>
          </p>
          <p><strong>Created:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
      )}

      <div className="space-x-4">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Try Dashboard
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  )
}