import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import { headers } from 'next/headers'
import { createHash } from 'crypto'

const exportRequestSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeDeleted: z.boolean().default(false),
  categories: z.array(z.enum([
    'profile', 
    'monitors', 
    'alerts', 
    'integrations', 
    'analytics', 
    'notifications',
    'billing'
  ])).optional()
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limiting check
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') || 'unknown'
    const rateLimitKey = createHash('sha256').update(`export:${session.user.email}:${ip}`).digest('hex')

    const supabase = await createClient()

    // Check rate limit (1 export per hour per user)
    const { data: recentExports } = await (supabase as any)
      .from('privacy_requests')
      .select('created_at')
      .eq('user_email', session.user.email)
      .eq('request_type', 'export')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (recentExports && recentExports.length > 0) {
      return NextResponse.json(
        { error: 'Export rate limit exceeded. Please wait 1 hour between exports.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { format, includeDeleted, categories } = exportRequestSchema.parse(body)

    // Get user data from various tables
    const userData: Record<string, unknown> = {}

    // Profile data
    if (!categories || categories.includes('profile')) {
      const { data: profile } = await (supabase as any)
        .from('users')
        .select(`
          email,
          full_name,
          timezone,
          notification_preferences,
          created_at,
          updated_at,
          last_login_at
        `)
        .eq('email', session.user.email)
        .single()

      if (profile) {
        userData.profile = {
          ...profile,
          // Remove sensitive fields
          id: undefined,
          password_hash: undefined,
          reset_token: undefined,
          verification_token: undefined
        }
      }
    }

    // Website monitors
    if (!categories || categories.includes('monitors')) {
      const { data: monitors } = await (supabase as any)
        .from('website_monitors')
        .select(`
          url,
          name,
          check_interval,
          timeout_seconds,
          is_active,
          created_at,
          updated_at,
          tags,
          expected_status_codes,
          follow_redirects,
          verify_ssl,
          custom_headers
        `)
        .eq('user_email', session.user.email)
        .eq('deleted_at', includeDeleted ? undefined : null, { 
          nullOperator: includeDeleted ? 'neq' : 'is' 
        })

      userData.monitors = monitors || []
    }

    // Alert history
    if (!categories || categories.includes('alerts')) {
      const { data: alerts } = await (supabase as any)
        .from('alerts')
        .select(`
          alert_type,
          message,
          status,
          created_at,
          resolved_at,
          monitor_url
        `)
        .eq('user_email', session.user.email)
        .order('created_at', { ascending: false })
        .limit(1000) // Last 1000 alerts

      userData.alerts = alerts || []
    }

    // Integration settings
    if (!categories || categories.includes('integrations')) {
      const { data: integrations } = await (supabase as any)
        .from('integrations')
        .select(`
          platform,
          is_active,
          settings,
          created_at,
          updated_at
        `)
        .eq('user_email', session.user.email)

      // Remove sensitive tokens/secrets from settings
      userData.integrations = (integrations || []).map((integration: any) => ({
        ...integration,
        settings: integration.settings ? {
          ...integration.settings,
          webhook_url: integration.settings.webhook_url ? '[REDACTED]' : undefined,
          bot_token: integration.settings.bot_token ? '[REDACTED]' : undefined,
          api_key: integration.settings.api_key ? '[REDACTED]' : undefined
        } : {}
      }))
    }

    // Analytics data
    if (!categories || categories.includes('analytics')) {
      const { data: analytics } = await (supabase as any)
        .from('user_analytics')
        .select(`
          event_type,
          event_data,
          created_at
        `)
        .eq('user_email', session.user.email)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .order('created_at', { ascending: false })

      userData.analytics = analytics || []
    }

    // Notification history
    if (!categories || categories.includes('notifications')) {
      const { data: notifications } = await (supabase as any)
        .from('notifications')
        .select(`
          type,
          subject,
          sent_at,
          delivery_status
        `)
        .eq('recipient_email', session.user.email)
        .order('sent_at', { ascending: false })
        .limit(500) // Last 500 notifications

      userData.notifications = notifications || []
    }

    // Billing data (if exists)
    if (!categories || categories.includes('billing')) {
      const { data: billing } = await (supabase as any)
        .from('subscriptions')
        .select(`
          plan_name,
          status,
          current_period_start,
          current_period_end,
          created_at
        `)
        .eq('user_email', session.user.email)
        .order('created_at', { ascending: false })

      userData.billing = billing || []
    }

    // Log the export request
    await (supabase as any)
      .from('privacy_requests')
      .insert({
        user_email: session.user.email,
        request_type: 'export',
        status: 'completed',
        request_data: { format, categories },
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

    // Prepare export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      userEmail: session.user.email,
      format,
      categories: categories || ['all'],
      data: userData
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData)
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="pingbuoy-data-export-${new Date().toISOString().split('T')[0]}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    return NextResponse.json(exportData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="pingbuoy-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Data export error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

// Sanitize CSV cells to prevent formula injection
function sanitizeCSVCell(cell: string): string {
  const cellStr = String(cell)
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r']

  // Prefix dangerous characters with single quote to prevent formula execution
  if (dangerousChars.some(char => cellStr.startsWith(char))) {
    return `'${cellStr}`
  }

  return cellStr
}

function convertToCSV(data: Record<string, unknown>): string {
  const rows: string[] = []

  // Header
  rows.push('Category,Field,Value,Date')

  // Flatten data structure for CSV
  function flattenObject(obj: Record<string, unknown>, category: string, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        flattenObject(value as Record<string, unknown>, category, fieldName)
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            flattenObject(item as Record<string, unknown>, category, `${fieldName}[${index}]`)
          } else {
            const sanitizedValue = sanitizeCSVCell(String(item))
            rows.push(`${sanitizeCSVCell(category)},"${sanitizeCSVCell(fieldName)}[${index}]","${sanitizedValue.replace(/"/g, '""')}",""`)
          }
        })
      } else {
        const dateValue = key.includes('_at') || key.includes('Date') ? String(value) : ''
        const sanitizedValue = sanitizeCSVCell(String(value || ''))
        const sanitizedDate = sanitizeCSVCell(dateValue)
        rows.push(`${sanitizeCSVCell(category)},"${sanitizeCSVCell(fieldName)}","${sanitizedValue.replace(/"/g, '""')}","${sanitizedDate.replace(/"/g, '""')}"`)
      }
    }
  }

  // Process each data category
  for (const [category, categoryData] of Object.entries(data.data as Record<string, unknown>)) {
    if (Array.isArray(categoryData)) {
      categoryData.forEach((item, index) => {
        flattenObject(item as Record<string, unknown>, category, `record_${index}`)
      })
    } else if (categoryData && typeof categoryData === 'object') {
      flattenObject(categoryData as Record<string, unknown>, category)
    }
  }

  return rows.join('\n')
}

// GET endpoint to check export eligibility
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    
    // Check last export time
    const { data: lastExport } = await (supabase as any)
      .from('privacy_requests')
      .select('created_at')
      .eq('user_email', session.user.email)
      .eq('request_type', 'export')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    const canExport = !lastExport || new Date(lastExport.created_at).getTime() < oneHourAgo

    const nextExportTime = lastExport 
      ? new Date(new Date(lastExport.created_at).getTime() + (60 * 60 * 1000))
      : new Date()

    return NextResponse.json({
      canExport,
      lastExportAt: lastExport?.created_at || null,
      nextExportAvailable: nextExportTime.toISOString(),
      rateLimitInfo: {
        limit: 1,
        window: '1 hour',
        remaining: canExport ? 1 : 0
      }
    })

  } catch (error) {
    console.error('Export eligibility check error:', error)
    return NextResponse.json(
      { error: 'Failed to check export eligibility' },
      { status: 500 }
    )
  }
}