import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { withSecureCORS } from '../_shared/cors-config.ts'
import { createLogger, ErrorCodes } from '../_shared/logger.ts'
import { withMonitoringAuth } from '../_shared/service-auth.ts'

serve(withSecureCORS(async (req) => {
  const logger = createLogger('data-cleanup')
  const startTime = Date.now()

  logger.requestStart(req.method)

  try {
    const results = await withMonitoringAuth('data_cleanup', async (supabaseClient) => {
      // Define retention periods (in days)
      const retentionPeriods = {
        uptime_logs: 90,        // Keep uptime logs for 90 days
        page_speed_logs: 30,    // Keep page speed logs for 30 days
        email_logs: 30,         // Keep email logs for 30 days
        dead_links: 180,        // Keep dead links for 6 months
        alerts: 90              // Keep alerts for 90 days
      }

      const cleanupResults = []

      for (const [table, retentionDays] of Object.entries(retentionPeriods)) {
        try {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

          let deleteQuery = supabaseClient
            .from(table)
            .delete()

          // Use appropriate timestamp column for each table
          switch (table) {
            case 'uptime_logs':
              deleteQuery = deleteQuery.lt('checked_at', cutoffDate.toISOString())
              break
            case 'page_speed_logs':
              deleteQuery = deleteQuery.lt('checked_at', cutoffDate.toISOString())
              break
            case 'email_logs':
              deleteQuery = deleteQuery.lt('sent_at', cutoffDate.toISOString())
              break
            case 'dead_links':
              deleteQuery = deleteQuery.lt('found_at', cutoffDate.toISOString())
              break
            case 'alerts':
              deleteQuery = deleteQuery.lt('sent_at', cutoffDate.toISOString())
              break
          }

          const { error, count } = await deleteQuery

          if (error) {
            logger.error(`Failed to cleanup ${table}`, {
              table,
              errorCode: ErrorCodes.DB_QUERY_ERROR,
              error: error.code || 'UNKNOWN'
            })
            cleanupResults.push({
              table,
              success: false,
              error: error.message,
              deletedCount: 0
            })
          } else {
            logger.dbOperation('DELETE', table, true, count || 0)
            cleanupResults.push({
              table,
              success: true,
              deletedCount: count || 0,
              retentionDays
            })
          }

        } catch (error) {
          logger.error(`Cleanup error for ${table}`, {
            table,
            errorCode: ErrorCodes.DB_QUERY_ERROR
          })
          cleanupResults.push({
            table,
            success: false,
            error: error.message,
            deletedCount: 0
          })
        }
      }

      // Additional cleanup: Remove resolved alerts older than 30 days
      try {
        const resolvedAlertsCutoff = new Date()
        resolvedAlertsCutoff.setDate(resolvedAlertsCutoff.getDate() - 30)

        const { error: resolvedError, count: resolvedCount } = await supabaseClient
          .from('alerts')
          .delete()
          .eq('resolved', true)
          .lt('sent_at', resolvedAlertsCutoff.toISOString())

        if (!resolvedError) {
          logger.dbOperation('DELETE', 'alerts (resolved)', true, resolvedCount || 0)
          cleanupResults.push({
            table: 'alerts (resolved)',
            success: true,
            deletedCount: resolvedCount || 0,
            retentionDays: 30
          })
        }
      } catch (error) {
        logger.error('Failed to cleanup resolved alerts', {
          errorCode: ErrorCodes.DB_QUERY_ERROR
        })
      }

      // Cleanup orphaned records (sites that no longer exist)
      try {
        // Get all site IDs
        const { data: validSiteIds } = await supabaseClient
          .from('sites')
          .select('id')

        const validIds = validSiteIds?.map(s => s.id) || []

        // Clean up orphaned uptime_logs
        const { error: orphanError1, count: orphanCount1 } = await supabaseClient
          .from('uptime_logs')
          .delete()
          .not('site_id', 'in', `(${validIds.join(',')})`)

        if (!orphanError1 && orphanCount1 > 0) {
          logger.dbOperation('DELETE', 'uptime_logs (orphaned)', true, orphanCount1)
          cleanupResults.push({
            table: 'uptime_logs (orphaned)',
            success: true,
            deletedCount: orphanCount1
          })
        }

        // Clean up orphaned page_speed_logs
        const { error: orphanError2, count: orphanCount2 } = await supabaseClient
          .from('page_speed_logs')
          .delete()
          .not('site_id', 'in', `(${validIds.join(',')})`)

        if (!orphanError2 && orphanCount2 > 0) {
          logger.dbOperation('DELETE', 'page_speed_logs (orphaned)', true, orphanCount2)
          cleanupResults.push({
            table: 'page_speed_logs (orphaned)',
            success: true,
            deletedCount: orphanCount2
          })
        }

      } catch (error) {
        logger.error('Failed to cleanup orphaned records', {
          errorCode: ErrorCodes.DB_QUERY_ERROR
        })
      }

      // Calculate total records cleaned up
      const totalDeleted = cleanupResults
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.deletedCount, 0)

      logger.info('Data cleanup completed', {
        totalDeleted,
        tablesProcessed: cleanupResults.length
      })

      return {
        success: true,
        totalDeleted,
        cleanupResults,
        processedAt: new Date().toISOString()
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
    logger.error('Data cleanup failed', {
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