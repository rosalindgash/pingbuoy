import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Test query to check if public_status field exists
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, url, public_status')
      .limit(1)

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      hasPublicStatusField: data && data.length > 0 && 'public_status' in data[0],
      sample: data
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}