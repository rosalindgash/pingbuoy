import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { startDeadLinkScan } from '@/lib/deadlinks'

export async function POST(request: NextRequest) {
  try {
    const { siteId } = await request.json()
    
    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this site
    const { data: site } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const result = await startDeadLinkScan(siteId)
    
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error starting dead link scan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}