// SSL certificate validation Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // CORS headers for cross-origin requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { domain } = await req.json()

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract domain from URL if full URL is provided
    let hostname = domain
    try {
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        hostname = new URL(domain).hostname
      }
    } catch {
      // If URL parsing fails, use domain as-is
    }

    // Attempt TLS connection to check SSL certificate
    const conn = await Deno.connectTls({
      hostname,
      port: 443,
      // Add timeout to prevent hanging
      timeout: 10000
    })

    // If we successfully connected, SSL is valid
    conn.close()

    return new Response(
      JSON.stringify({
        valid: true,
        checked_at: new Date().toISOString(),
        domain: hostname
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // Any connection error means SSL is invalid/unreachable
    return new Response(
      JSON.stringify({
        valid: false,
        error: error.message,
        checked_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})