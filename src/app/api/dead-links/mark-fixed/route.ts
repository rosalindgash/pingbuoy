import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { markDeadLinkFixed } from '@/lib/deadlinks'

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export async function POST(request: NextRequest) {
  try {
    const { deadLinkId } = await request.json()

    if (!deadLinkId) {
      return NextResponse.json({ error: 'Dead link ID is required' }, { status: 400 })
    }

    // Validate UUID format
    if (!isValidUUID(deadLinkId)) {
      return NextResponse.json({ error: 'Invalid dead link ID format' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the dead link belongs to a site owned by the user
    const { data: deadLink, error: deadLinkError } = await (supabase as any)
      .from('dead_links')
      .select('site_id')
      .eq('id', deadLinkId)
      .single()

    if (deadLinkError || !deadLink) {
      return NextResponse.json({ error: 'Dead link not found' }, { status: 404 })
    }

    // Verify the site belongs to the user
    const { data: site, error: siteError } = await (supabase as any)
      .from('sites')
      .select('user_id')
      .eq('id', deadLink.site_id)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (site.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this site' },
        { status: 403 }
      )
    }

    await markDeadLinkFixed(deadLinkId, user.id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error marking dead link as fixed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}