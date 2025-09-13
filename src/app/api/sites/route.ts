import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { addSite } from '@/lib/uptime'
import { Database } from '@/lib/supabase'
import { siteSchema, validateAndSanitize } from '@/lib/validation'

type UserProfile = Database['public']['Tables']['users']['Row']

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    
    // Validate and sanitize input
    const { name, url } = validateAndSanitize(siteSchema, rawData)
    
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user's plan and current site count
    const { data: userProfile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single() as { data: Pick<UserProfile, 'plan'> | null }

    const { data: existingSites } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', user.id)

    const siteCount = existingSites?.length || 0
    const maxSites = userProfile?.plan === 'free' ? 3 : userProfile?.plan === 'pro' ? 25 : userProfile?.plan === 'founder' ? 999 : 999

    if (siteCount >= maxSites) {
      return NextResponse.json(
        { error: `You've reached your plan limit of ${maxSites} websites. Please upgrade to add more.` },
        { status: 403 }
      )
    }

    const site = await addSite(user.id, url, name)
    
    return NextResponse.json(site)
  } catch (error: unknown) {
    console.error('Error adding site:', error)
    
    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawSiteId = searchParams.get('id')
    
    if (!rawSiteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 })
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

    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId)
      .eq('user_id', user.id)

    if (error) {
      throw new Error('Failed to delete site: ' + error.message)
    }
    
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting site:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}