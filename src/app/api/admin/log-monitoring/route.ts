import { NextRequest, NextResponse } from 'next/server'
import { createLogMonitoringAPI } from '@/lib/log-monitoring'
import { withServiceAuth } from '@/lib/service-auth'

const logMonitoringAPI = createLogMonitoringAPI()

/**
 * GET /api/admin/log-monitoring
 * Get log security monitoring statistics
 */
export async function GET(request: NextRequest) {
  return withServiceAuth('admin', async () => {
    try {
      const stats = await logMonitoringAPI.getStats()

      return NextResponse.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve log monitoring stats'
        },
        { status: 500 }
      )
    }
  })
}

/**
 * POST /api/admin/log-monitoring/report
 * Generate detailed security report
 */
export async function POST(request: NextRequest) {
  return withServiceAuth('admin', async () => {
    try {
      const report = await logMonitoringAPI.generateReport()

      return NextResponse.json({
        success: true,
        report,
        generatedAt: new Date().toISOString()
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate security report'
        },
        { status: 500 }
      )
    }
  })
}