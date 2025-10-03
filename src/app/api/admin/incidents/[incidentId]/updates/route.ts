import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Add update to incident
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { incidentId } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, message } = body

    if (!status || !message) {
      return NextResponse.json(
        { error: 'Status and message are required' },
        { status: 400 }
      )
    }

    const { data: update, error } = await supabase
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
    await supabase
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
