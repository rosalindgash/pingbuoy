import { createClient } from './supabase-server'
import { redirect } from 'next/navigation'
import { Database } from './supabase'
import type { NextAuthOptions } from 'next-auth'

// NextAuth configuration - minimal setup for the failing routes
export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async session({ session, user }) {
      return session
    },
  },
}

type UserProfile = Database['public']['Tables']['users']['Row']

export async function getUser() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.log('getUser failed:', error?.message || 'No user')
    return null
  }
  
  console.log('getUser success:', user.email)
  return user
}

export async function requireAuth() {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
    
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data
}