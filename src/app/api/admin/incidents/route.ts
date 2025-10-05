import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Zod schemas for validation
const createIncidentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  impact: z.enum(['none', 'minor', 'major', 'critical']),
  is_public: z.boolean().optional(),
  started_at: z.string().datetime().optional()
})

const updateIncidentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional(),
  impact: z.enum(['none', 'minor', 'major', 'critical']).optional(),
  is_public: z.boolean().optional(),
  resolved_at: z.string().datetime().nullable().optional()
})

// Helper function to verify admin access
async function verifyAdmin(user: any, supabase: any) {
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('email, plan')
    .eq('id', user.id)
    .single()

  if (error || !userProfile) {
    return false
  }

  // Check if user is founder (admin)
  const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL
  return userProfile.plan === 'founder' &&
         FOUNDER_EMAIL &&
         userProfile.email === FOUNDER_EMAIL
}

// GET - Fetch all incidents (including drafts)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin access
    const isAdmin = await verifyAdmin(user, supabase)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { data: incidents, error } = await supabase
      .from('status_incidents')
      .select(`
        id,
        title,
        description,
        status,
        impact,
        is_public,
        started_at,
        resolved_at,
        created_at,
        updated_at
      `)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch incidents:', error)
      return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
    }

    // Fetch updates for each incident
    const incidentsWithUpdates = await Promise.all(
      (incidents || []).map(async (incident: any) => {
        const { data: updates } = await (supabase as any)
          .from('status_incident_updates')
          .select('id, status, message, created_at')
          .eq('incident_id', incident.id)
          .order('created_at', { ascending: false })

        return {
          ...incident,
          updates: updates || []
        }
      })
    )

    return NextResponse.json({ incidents: incidentsWithUpdates })

  } catch (error) {
    console.error('Admin incidents API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new incident
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin access
    const isAdmin = await verifyAdmin(user, supabase)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input with Zod
    const result = createIncidentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.issues },
        { status: 400 }
      )
    }

    const { title, description, status, impact, is_public, started_at } = result.data

    const { data: incident, error } = await (supabase as any)
      .from('status_incidents')
      .insert({
        title,
        description,
        status,
        impact,
        is_public: is_public || false,
        started_at: started_at || new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create incident:', error)
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
    }

    return NextResponse.json({ incident }, { status: 201 })

  } catch (error) {
    console.error('Create incident error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update incident
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin access
    const isAdmin = await verifyAdmin(user, supabase)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input with Zod
    const result = updateIncidentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.issues },
        { status: 400 }
      )
    }

    const { id, ...updates } = result.data

    const { data: incident, error } = await (supabase as any)
      .from('status_incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update incident:', error)
      return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 })
    }

    return NextResponse.json({ incident })

  } catch (error) {
    console.error('Update incident error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
