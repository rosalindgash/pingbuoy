import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger, ErrorCodes } from '../_shared/logger.ts'
import { withMonitoringAuth } from '../_shared/service-auth.ts'

serve(withSecureCORS(async (req) => {
  const logger = createLogger('dead-link-batch-scanner')
  const startTime = Date.now()

  logger.requestStart(req.method)

  try {
    const results = await withMonitoringAuth('dead_link_batch_scanner', async (supabaseClient) => {
      // Get all active sites for scanning
      const { data: sites, error: sitesError } = await supabaseClient
        .from('sites')
        .select('id, name, url, user_id')
        .eq('is_active', true)

      if (sitesError) {
        logger.error('Failed to fetch sites', {
          errorCode: ErrorCodes.DB_QUERY_ERROR,
          error: sitesError.code || 'UNKNOWN'
        })
        throw sitesError
      }

      logger.info('Batch dead link scan started', { sitesCount: sites.length })

      const scanResults = []

      // Trigger dead link scan for each site
      for (const site of sites) {
        try {
          // Call the existing dead-link-scanner function
          const scanResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/dead-link-scanner`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({ siteId: site.id })
            }
          )

          if (scanResponse.ok) {
            const scanResult = await scanResponse.json()
            scanResults.push({
              siteId: site.id,
              siteName: site.name,
              success: true,
              ...scanResult
            })
            logger.info('Site scan completed', {
              siteId: site.id,
              totalLinks: scanResult.totalLinks,
              brokenLinks: scanResult.brokenLinks
            })
          } else {
            scanResults.push({
              siteId: site.id,
              siteName: site.name,
              success: false,
              error: `Scan failed with status ${scanResponse.status}`
            })
            logger.error('Site scan failed', {
              siteId: site.id,
              status: scanResponse.status
            })
          }

          // Add delay between scans to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, 2000))

        } catch (error) {
          scanResults.push({
            siteId: site.id,
            siteName: site.name,
            success: false,
            error: error.message
          })
          logger.error('Site scan error', {
            siteId: site.id,
            errorCode: ErrorCodes.SCAN_FAILED
          })
        }
      }

      return {
        success: true,
        totalSites: sites.length,
        completedScans: scanResults.filter(r => r.success).length,
        failedScans: scanResults.filter(r => !r.success).length,
        results: scanResults
      }
    })

    const duration = Date.now() - startTime
    logger.requestEnd(200, duration)

    return new Response(
      JSON.stringify(results),
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Batch scan failed', {
      errorCode: ErrorCodes.EXTERNAL_SERVICE_ERROR,
      duration
    })
    logger.requestEnd(500, duration)

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
}))