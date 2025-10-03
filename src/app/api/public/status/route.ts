import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a service role client for public status checks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Check system health
    const systemHealth = await checkSystemHealth()

    // Get monitoring statistics
    const metrics = await getSystemMetrics()

    // Get PingBuoy's own site uptime status
    const pingbuoyStatus = await getPingBuoyUptimeStatus()

    // Get recent incidents
    const incidents = await getRecentIncidents()

    // Service status based on actual system health
    const services = [
      {
        name: 'Website Monitoring',
        status: systemHealth.monitoring_active ? 'operational' : 'degraded',
        uptime: metrics.monitoring_uptime,
        responseTime: metrics.avg_response_time,
        lastChecked: systemHealth.last_check
      },
      {
        name: 'API Services',
        status: systemHealth.api_responsive ? 'operational' : 'outage',
        uptime: systemHealth.database_responsive ? metrics.monitoring_uptime : 0,
        responseTime: systemHealth.api_responsive ? 120 : 0,
        lastChecked: systemHealth.last_check
      },
      {
        name: 'Database',
        status: systemHealth.database_responsive ? 'operational' : 'outage',
        uptime: systemHealth.database_responsive ? metrics.monitoring_uptime : 0,
        responseTime: systemHealth.database_responsive ? 12 : 0,
        lastChecked: systemHealth.last_check
      }
    ]

    // Add PingBuoy's own sites to services if available
    if (pingbuoyStatus.length > 0) {
      pingbuoyStatus.forEach(site => {
        services.push({
          name: site.name,
          status: site.status,
          uptime: site.uptime,
          responseTime: site.responseTime,
          lastChecked: site.lastChecked
        })
      })
    }

    return NextResponse.json({
      services,
      metrics: {
        totalSitesMonitored: metrics.total_sites,
        checksPerformed24h: metrics.checks_24h,
        averageResponseTime: metrics.avg_response_time,
        systemUptime: calculateSystemUptime(services)
      },
      incidents,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Status API error:', error)

    // Return fallback data if there's an error
    return NextResponse.json({
      services: [
        { name: 'Website Monitoring', status: 'unknown', uptime: 0, responseTime: 0 },
        { name: 'API Services', status: 'unknown', uptime: 0, responseTime: 0 },
        { name: 'Database', status: 'unknown', uptime: 0, responseTime: 0 }
      ],
      metrics: {
        totalSitesMonitored: 0,
        checksPerformed24h: 0,
        averageResponseTime: 0,
        systemUptime: 0
      },
      lastUpdated: new Date().toISOString(),
      error: 'Unable to fetch current status'
    }, { status: 500 })
  }
}

async function checkSystemHealth() {
  try {
    // Test database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('sites')
      .select('count')
      .limit(1)

    const database_responsive = !dbError

    // Check if monitoring is active (recent uptime logs within 10 minutes)
    const { data: recentLogs } = await supabase
      .from('uptime_logs')
      .select('checked_at')
      .gte('checked_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(1)

    const monitoring_active = (recentLogs && recentLogs.length > 0)

    return {
      database_responsive,
      api_responsive: true, // API is responsive if we can run this function
      monitoring_active,
      last_check: new Date().toISOString()
    }
  } catch (error) {
    console.error('Health check error:', error)
    return {
      database_responsive: false,
      api_responsive: false,
      monitoring_active: false,
      last_check: new Date().toISOString()
    }
  }
}

async function getSystemMetrics() {
  try {
    // Get total number of sites being monitored
    const { count: totalSites } = await supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get checks performed in last 24 hours
    const { count: checks24h } = await supabase
      .from('uptime_logs')
      .select('*', { count: 'exact', head: true })
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Get average response time from recent checks
    const { data: avgResponseData } = await supabase
      .from('uptime_logs')
      .select('response_time')
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('response_time', 'is', null)
      .limit(1000)

    const avgResponseTime = avgResponseData && avgResponseData.length > 0
      ? Math.round(avgResponseData.reduce((sum, log) => sum + (log.response_time || 0), 0) / avgResponseData.length)
      : 285

    // Calculate monitoring uptime (percentage of successful checks in last 24h)
    const { data: uptimeData } = await supabase
      .from('uptime_logs')
      .select('status')
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1000)

    const monitoringUptime = uptimeData && uptimeData.length > 0
      ? Math.round((uptimeData.filter(log => log.status === 'up').length / uptimeData.length) * 100 * 10) / 10
      : 99.8

    return {
      total_sites: totalSites || 0,
      checks_24h: checks24h || 0,
      avg_response_time: avgResponseTime,
      monitoring_uptime: monitoringUptime
    }
  } catch (error) {
    console.error('Failed to get system metrics:', error)
    return {
      total_sites: 0,
      checks_24h: 0,
      avg_response_time: 285,
      monitoring_uptime: 99.8
    }
  }
}

async function getPingBuoyUptimeStatus() {
  try {
    // Fetch PingBuoy's own monitored sites
    // Look for sites with pingbuoy.com but exclude staging
    const { data: pingbuoySites, error: sitesError } = await supabase
      .from('sites')
      .select('id, name, url, status, last_checked')
      .ilike('url', '%pingbuoy.com%')
      .not('url', 'ilike', '%staging%')
      .eq('is_active', true)

    if (sitesError || !pingbuoySites || pingbuoySites.length === 0) {
      console.log('No PingBuoy sites found or error:', sitesError)
      return []
    }

    // Get uptime statistics for each PingBuoy site
    const statusPromises = pingbuoySites.map(async (site) => {
      // Get uptime percentage for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: uptimeLogs } = await supabase
        .from('uptime_logs')
        .select('status, response_time, checked_at')
        .eq('site_id', site.id)
        .gte('checked_at', thirtyDaysAgo)
        .order('checked_at', { ascending: false })
        .limit(1000)

      if (!uptimeLogs || uptimeLogs.length === 0) {
        return {
          name: site.name,
          status: 'unknown' as const,
          uptime: 0,
          responseTime: null,
          lastChecked: site.last_checked
        }
      }

      // Calculate uptime percentage
      const upChecks = uptimeLogs.filter(log => log.status === 'up').length
      const uptimePercentage = Math.round((upChecks / uptimeLogs.length) * 1000) / 10

      // Get average response time from recent checks (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const recentLogs = uptimeLogs.filter(log =>
        log.checked_at >= twentyFourHoursAgo &&
        log.response_time !== null &&
        log.response_time < 1000 // Exclude timeout values
      )

      const avgResponseTime = recentLogs.length > 0
        ? Math.round(recentLogs.reduce((sum, log) => sum + (log.response_time || 0), 0) / recentLogs.length)
        : null

      // Determine current status based on recent checks and site status
      let currentStatus: 'operational' | 'degraded' | 'outage' | 'unknown' = 'operational'
      if (site.status === 'down') {
        currentStatus = 'outage'
      } else if (uptimePercentage < 99.0) {
        currentStatus = 'degraded'
      } else if (site.status === 'up') {
        currentStatus = 'operational'
      }

      // Get daily uptime for the last 30 days for visualization
      const dailyUptime = await getDailyUptime(site.id, uptimeLogs)

      return {
        name: site.name,
        status: currentStatus,
        uptime: uptimePercentage,
        responseTime: avgResponseTime,
        lastChecked: site.last_checked || uptimeLogs[0]?.checked_at,
        dailyUptime
      }
    })

    const results = await Promise.all(statusPromises)
    return results

  } catch (error) {
    console.error('Failed to get PingBuoy uptime status:', error)
    return []
  }
}

async function getRecentIncidents() {
  try {
    // Fetch public incidents from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: incidents, error } = await supabase
      .from('status_incidents')
      .select(`
        id,
        title,
        description,
        status,
        impact,
        started_at,
        resolved_at,
        created_at,
        updated_at
      `)
      .eq('is_public', true)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Failed to fetch incidents:', error)
      return []
    }

    // Fetch updates for each incident
    const incidentsWithUpdates = await Promise.all(
      (incidents || []).map(async (incident) => {
        const { data: updates } = await supabase
          .from('status_incident_updates')
          .select('id, status, message, created_at')
          .eq('incident_id', incident.id)
          .order('created_at', { ascending: false })

        return {
          ...incident,
          updates: updates || []
        }
      })
    )

    return incidentsWithUpdates

  } catch (error) {
    console.error('Failed to get recent incidents:', error)
    return []
  }
}

function getDailyUptime(siteId: string, uptimeLogs: any[]) {
  // Group logs by day for the last 30 days
  const dailyStats = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayLogs = uptimeLogs.filter(log => {
      const logDate = new Date(log.checked_at)
      return logDate >= date && logDate < nextDate
    })

    let status: 'up' | 'down' | 'degraded' | 'no-data' = 'no-data'
    if (dayLogs.length > 0) {
      const upCount = dayLogs.filter(log => log.status === 'up').length
      const uptimePercent = (upCount / dayLogs.length) * 100

      if (uptimePercent === 100) {
        status = 'up'
      } else if (uptimePercent >= 50) {
        status = 'degraded'
      } else if (uptimePercent > 0) {
        status = 'degraded'
      } else {
        status = 'down'
      }
    }

    dailyStats.push({
      date: date.toISOString().split('T')[0],
      status,
      uptime: dayLogs.length > 0 ? Math.round((dayLogs.filter(log => log.status === 'up').length / dayLogs.length) * 100) : null
    })
  }

  return dailyStats
}

function calculateSystemUptime(services: any[]) {
  if (services.length === 0) return 0

  const totalUptime = services.reduce((sum, service) => sum + service.uptime, 0)
  return Math.round((totalUptime / services.length) * 10) / 10
}