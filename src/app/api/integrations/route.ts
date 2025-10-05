import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/upstash-rate-limit'
import { validateCSRF } from '@/lib/csrf-protection'
import { randomBytes } from 'crypto'

// Zod schema for integration creation
const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  integration_type: z.enum(['slack', 'discord', 'webhook', 'zapier', 'microsoft_teams', 'custom']),
  webhook_url: z.string().url(),
  events: z.array(z.string()).min(1).default(['downtime', 'recovery'])
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's integrations
    const { data: integrations, error } = await (supabase as any)
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform data for frontend
    const transformedIntegrations = integrations?.map((integration: any) => ({
      id: integration.id,
      name: integration.name,
      type: integration.integration_type,
      status: integration.status,
      config: {
        events: integration.enabled_events || ['downtime', 'recovery']
      },
      lastTest: integration.last_test_at,
      lastTestStatus: integration.last_test_status,
      totalNotifications: integration.total_notifications_sent || 0
    })) || []

    return NextResponse.json(transformedIntegrations)

  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for integration creation
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked integration creation request`, {
      reason: csrfValidation.reason,
      origin: csrfValidation.origin,
      referer: csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    // Validate input with Zod
    const validationResult = createIntegrationSchema.safeParse(body)
    if (!validationResult.success) {
      console.warn(`[${requestId}] Invalid integration input`, {
        errors: validationResult.error.issues
      })
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, integration_type, webhook_url, events } = validationResult.data

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed for integration creation`, { hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 20 integration operations per hour
    const rateLimitResponse = await checkRateLimit(user.id, 'integrationOperations', 'integration creation')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.info(`[${requestId}] Integration creation requested`, {
      userId: user.id,
      integrationType: integration_type
    })

    // Prepare integration data based on type
    const integrationData: any = {
      user_id: user.id,
      name,
      integration_type,
      status: 'inactive',
      enabled_events: events
    }

    // Set type-specific fields
    if (integration_type === 'slack') {
      integrationData.slack_webhook_url = webhook_url
    } else if (integration_type === 'discord') {
      integrationData.discord_webhook_url = webhook_url
    } else {
      integrationData.webhook_url = webhook_url
    }

    // Create integration
    const { data: integration, error } = await (supabase as any)
      .from('integrations')
      .insert(integrationData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to create integration: ' + error.message)
    }

    // Test the integration
    try {
      const testResponse = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PingBuoy/1.0'
        },
        body: JSON.stringify({
          text: 'PingBuoy integration test',
          message: 'Your integration is now connected to PingBuoy!',
          event_type: 'test',
          timestamp: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(10000)
      })

      const testStatus = testResponse.ok ? 'success' : 'failed'

      // Update integration with test result
      await (supabase as any)
        .from('integrations')
        .update({
          last_test_at: new Date().toISOString(),
          last_test_status: testStatus,
          status: testStatus === 'success' ? 'active' : 'error'
        })
        .eq('id', integration.id)

      // Log the test
      await (supabase as any)
        .from('integration_logs')
        .insert({
          integration_id: integration.id,
          user_id: user.id,
          event_type: 'test',
          status: testStatus,
          response_status: testResponse.status
        })

      integration.status = testStatus === 'success' ? 'active' : 'error'
      integration.last_test_status = testStatus

    } catch (testError) {
      console.error('Integration test failed:', testError)

      // Update integration status to error
      await (supabase as any)
        .from('integrations')
        .update({
          status: 'error',
          last_test_at: new Date().toISOString(),
          last_test_status: 'failed',
          last_test_error: testError instanceof Error ? testError.message : 'Test failed'
        })
        .eq('id', integration.id)

      integration.status = 'error'
      integration.last_test_status = 'failed'
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        type: integration.integration_type,
        status: integration.status,
        config: {
          events: integration.enabled_events
        },
        lastTest: integration.last_test_at,
        lastTestStatus: integration.last_test_status,
        totalNotifications: 0
      }
    })

  } catch (error) {
    console.error('Error creating integration:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for integration deletion
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked integration deletion request`, {
      reason: csrfValidation.reason,
      origin: csrfValidation.origin,
      referer: csrfValidation.referer
    })
    return NextResponse.json(
      { error: 'Request blocked by security policy' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const rawIntegrationId = searchParams.get('id')

    if (!rawIntegrationId) {
      console.warn(`[${requestId}] Missing integration ID for deletion`)
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(rawIntegrationId)) {
      console.warn(`[${requestId}] Invalid integration ID format provided`)
      return NextResponse.json({ error: 'Invalid integration ID format' }, { status: 400 })
    }

    const integrationId = rawIntegrationId

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed for integration deletion`, { hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResponse = await checkRateLimit(user.id, 'integrationOperations', 'integration deletion')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.info(`[${requestId}] Integration deletion requested`, {
      userId: user.id,
      integrationId: integrationId
    })

    // Delete integration (RLS will ensure user owns it)
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', integrationId)
      .eq('user_id', user.id)

    if (error) {
      throw new Error('Failed to delete integration: ' + error.message)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
