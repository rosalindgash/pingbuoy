import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { markDeadLinkFixed } from '@/lib/deadlinks'

export async function POST(request: NextRequest) {
  try {
    const { deadLinkId } = await request.json()
    
    if (!deadLinkId) {
      return NextResponse.json({ error: 'Dead link ID is required' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await markDeadLinkFixed(deadLinkId, user.id)
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error marking dead link as fixed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}