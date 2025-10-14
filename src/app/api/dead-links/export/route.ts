import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { exportDeadLinksCSV } from '@/lib/deadlinks'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawSiteId = searchParams.get('siteId')
    
    if (!rawSiteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 })
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(rawSiteId)) {
      return NextResponse.json({ error: 'Invalid site ID format' }, { status: 400 })
    }
    
    const siteId = rawSiteId
    
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const csv = await exportDeadLinksCSV(siteId, user.id)
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dead-links-${siteId}.csv"`,
      },
    })
  } catch (error: unknown) {
    console.error('Error exporting dead links:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}