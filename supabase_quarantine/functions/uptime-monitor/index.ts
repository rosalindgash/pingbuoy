import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://your-production-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get all active sites
    const { data: sites, error: sitesError } = await supabaseClient
      .from('sites')
      .select('*')
      .eq('is_active', true)

    if (sitesError) {
      throw sitesError
    }

    const results = []

    for (const site of sites) {
      try {
        const startTime = Date.now()
        
        // Check site status
        const response = await fetch(site.url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'PingBuoy-Monitor/1.0'
          }
        })
        
        const endTime = Date.now()
        const responseTime = endTime - startTime
        const isUp = response.status >= 200 && response.status < 400
        
        // Log the check
        const { error: logError } = await supabaseClient
          .from('uptime_logs')
          .insert({
            site_id: site.id,
            status: isUp ? 'up' : 'down',
            response_time: responseTime,
            status_code: response.status,
          })

        if (logError) {
          console.error('Error logging uptime:', logError)
        }

        // Update site status
        await supabaseClient
          .from('sites')
          .update({ 
            status: isUp ? 'up' : 'down',
            last_checked: new Date().toISOString()
          })
          .eq('id', site.id)

        // Check if we need to send an alert
        if (!isUp) {
          // Get the last alert for this site
          const { data: lastAlert } = await supabaseClient
            .from('alerts')
            .select('*')
            .eq('site_id', site.id)
            .eq('type', 'uptime')
            .eq('resolved', false)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single()

          // Only send alert if there's no unresolved alert (to avoid spam)
          if (!lastAlert) {
            const { error: alertError } = await supabaseClient
              .from('alerts')
              .insert({
                site_id: site.id,
                type: 'uptime',
                message: `Website ${site.name} (${site.url}) is down. Status code: ${response.status}`,
              })

            if (alertError) {
              console.error('Error creating alert:', alertError)
            }

            // Send email notification
            try {
              const { data: userData } = await supabaseClient
                .from('users')
                .select('email')
                .eq('id', site.user_id)
                .single()

              if (userData?.email) {
                await fetch(`${Deno.env.get('APP_URL')}/api/send-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                  },
                  body: JSON.stringify({
                    type: 'uptime_alert',
                    userEmail: userData.email,
                    siteName: site.name,
                    siteUrl: site.url,
                    statusCode: response.status
                  })
                })
              }
            } catch (emailError) {
              console.error('Error sending email:', emailError)
            }

            console.log(`Alert: ${site.name} is down`)
          }
        } else {
          // Site is up, check if we need to send recovery notification
          const { data: unresolvedAlerts } = await supabaseClient
            .from('alerts')
            .select('*')
            .eq('site_id', site.id)
            .eq('type', 'uptime')
            .eq('resolved', false)

          if (unresolvedAlerts && unresolvedAlerts.length > 0) {
            // Calculate downtime
            const oldestAlert = unresolvedAlerts[unresolvedAlerts.length - 1]
            const downtime = new Date().getTime() - new Date(oldestAlert.sent_at).getTime()
            const downtimeMinutes = Math.round(downtime / (1000 * 60))
            const downtimeText = downtimeMinutes < 60 ? 
              `${downtimeMinutes} minutes` : 
              `${Math.round(downtimeMinutes / 60)} hours`

            // Send recovery notification
            try {
              const { data: userData } = await supabaseClient
                .from('users')
                .select('email')
                .eq('id', site.user_id)
                .single()

              if (userData?.email) {
                await fetch(`${Deno.env.get('APP_URL')}/api/send-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                  },
                  body: JSON.stringify({
                    type: 'uptime_recovered',
                    userEmail: userData.email,
                    siteName: site.name,
                    siteUrl: site.url,
                    downtime: downtimeText
                  })
                })
              }
            } catch (emailError) {
              console.error('Error sending recovery email:', emailError)
            }
          }

          // Resolve any open alerts
          await supabaseClient
            .from('alerts')
            .update({ resolved: true })
            .eq('site_id', site.id)
            .eq('type', 'uptime')
            .eq('resolved', false)
        }

        results.push({
          site_id: site.id,
          url: site.url,
          status: isUp ? 'up' : 'down',
          response_time: responseTime,
          status_code: response.status
        })

      } catch (error) {
        console.error(`Error checking ${site.url}:`, error)
        
        // Log the failed check
        const { error: logError } = await supabaseClient
          .from('uptime_logs')
          .insert({
            site_id: site.id,
            status: 'down',
            response_time: null,
            status_code: null,
          })

        if (logError) {
          console.error('Error logging failed check:', logError)
        }

        // Update site status to down
        await supabaseClient
          .from('sites')
          .update({ 
            status: 'down',
            last_checked: new Date().toISOString()
          })
          .eq('id', site.id)

        results.push({
          site_id: site.id,
          url: site.url,
          status: 'down',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: sites.length,
        results 
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      },
    )
  }
})