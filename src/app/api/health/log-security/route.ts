import { NextRequest, NextResponse } from 'next/server'
import { createLogMonitoringAPI } from '@/lib/log-monitoring'

const logMonitoringAPI = createLogMonitoringAPI()

/**
 * GET /api/health/log-security
 * Health check for log security monitoring
 *
 * This endpoint can be used by external monitoring systems
 * to check for log security violations
 */
export async function GET(request: NextRequest) {
  try {
    const healthCheck = await logMonitoringAPI.healthCheck()

    return NextResponse.json(
      {
        service: 'log-security-monitoring',
        status: healthCheck.status,
        timestamp: new Date().toISOString(),
        details: {
          criticalViolations: healthCheck.criticalViolations,
          totalViolations: healthCheck.totalViolations,
          message: healthCheck.message
        }
      },
      {
        status: healthCheck.status === 'healthy' ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        service: 'log-security-monitoring',
        status: 'error',
        timestamp: new Date().toISOString(),
        details: {
          message: 'Log monitoring system unavailable'
        }
      },
      { status: 500 }
    )
  }
}