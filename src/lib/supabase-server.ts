import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const createClient = async (): Promise<SupabaseClient<Database>> => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // Cookie modifications are not allowed in server components during rendering
            // This is expected behavior and can be safely ignored
            console.debug('Cookie set operation skipped in server component')
          }
        },
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookie modifications are not allowed in server components during rendering
            // This is expected behavior and can be safely ignored
            console.debug('Cookie set operation skipped in server component:', name)
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (error) {
            // Cookie modifications are not allowed in server components during rendering
            // This is expected behavior and can be safely ignored
            console.debug('Cookie remove operation skipped in server component:', name)
          }
        }
      }
    }
  )
}

// Legacy export for backward compatibility
export const createServerSupabaseClient = createClient

// Service role client for server-side operations that require elevated permissions
export const createServiceRoleClient = (): SupabaseClient<Database> => {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      // No cookies needed for service role
      cookies: {
        getAll() { return [] },
        setAll() {},
        get() { return undefined },
        set() {},
        remove() {}
      }
    }
  )
}