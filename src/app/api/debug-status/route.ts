import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain') || 'rosalindgash.org'

    const supabase = await createServerSupabaseClient()
    const decodedDomain = decodeURIComponent(domain)

    // Build precise URL variations to match against
    const possibleUrls = [
      `https://${decodedDomain}`,
      `http://${decodedDomain}`,
      `https://www.${decodedDomain}`,
      `http://www.${decodedDomain}`,
      `https://${decodedDomain}/`,
      `http://${decodedDomain}/`,
      `https://www.${decodedDomain}/`,
      `http://www.${decodedDomain}/`
    ]

    // First, let's see ALL active sites
    const { data: allSites, error: allError } = await supabase
      .from('sites')
      .select('id, name, url, is_active')
      .eq('is_active', true)

    // Then try the specific query
    const { data: filteredSites, error: filteredError } = await supabase
      .from('sites')
      .select('id, name, url, is_active, public_status')
      .eq('is_active', true)
      .or(possibleUrls.map(url => `url.eq.${url}`).join(','))

    return NextResponse.json({
      debug: {
        searchingForDomain: decodedDomain,
        possibleUrls,
        allActiveSites: allSites?.map(s => ({ name: s.name, url: s.url })) || [],
        filteredSites: filteredSites || [],
        allError: allError?.message,
        filteredError: filteredError?.message
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: true
    })
  }
}