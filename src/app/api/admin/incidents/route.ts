import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all incidents (including drafts)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      (incidents || []).map(async (incident) => {
        const { data: updates } = await supabase
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

    const body = await request.json()
    const { title, description, status, impact, is_public, started_at } = body

    if (!title || !description || !status || !impact) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: incident, error } = await supabase
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

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Incident ID required' }, { status: 400 })
    }

    const { data: incident, error } = await supabase
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
