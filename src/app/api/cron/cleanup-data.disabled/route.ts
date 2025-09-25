import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Security check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_data')

    if (error) {
      console.error('Cleanup function error:', error)
      throw error
    }

    console.log('Data cleanup completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Data cleanup completed',
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Data cleanup failed:', error)
    return NextResponse.json({ error: 'Data cleanup failed' }, { status: 500 })
  }
}