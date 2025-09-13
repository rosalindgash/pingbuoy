'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          setError('Auth error: ' + error.message)
        } else if (user) {
          setUser(user)
        } else {
          setError('No user found')
        }
      } catch (err) {
        setError('Unexpected error: ' + err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-600 mb-4">Auth Test Failed</h1>
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.href = '/login'}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600 mb-4">Auth Test Success!</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">User Info:</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</p>
      </div>
      <button
        onClick={() => window.location.href = '/dashboard'}
        className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Go to Real Dashboard
      </button>
    </div>
  )
}