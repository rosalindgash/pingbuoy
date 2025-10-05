import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Zod schema for incident update
const incidentUpdateSchema = z.object({
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  message: z.string().min(1).max(2000)
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

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// POST - Add update to incident
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { incidentId } = await params

    // Validate incidentId format
    if (!isValidUUID(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 })
    }

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

    // Verify incident exists
    const { data: incident, error: incidentError } = await supabase
      .from('status_incidents')
      .select('id')
      .eq('id', incidentId)
      .single()

    if (incidentError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    const body = await request.json()

    // Validate input with Zod
    const result = incidentUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.issues },
        { status: 400 }
      )
    }

    const { status, message } = result.data

    const { data: update, error } = await (supabase as any)
      .from('status_incident_updates')
      .insert({
        incident_id: incidentId,
        status,
        message
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create update:', error)
      return NextResponse.json({ error: 'Failed to create update' }, { status: 500 })
    }

    // Update the incident's status to match the latest update
    await (supabase as any)
      .from('status_incidents')
      .update({
        status,
        // If status is resolved, set resolved_at
        resolved_at: status === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', incidentId)

    return NextResponse.json({ update }, { status: 201 })

  } catch (error) {
    console.error('Create update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
