import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/upstash-rate-limit'
import { validateCSRF } from '@/lib/csrf-protection'
import { randomBytes, createHash } from 'crypto'

// Zod schema for API key creation
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1)
})

// Generate a secure API key
function generateApiKey(): string {
  return 'pb_' + randomBytes(32).toString('hex')
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's API keys (without exposing actual keys)
    const { data: apiKeys, error } = await (supabase as any)
      .from('api_keys')
      .select('id, name, key_prefix, permissions, status, total_requests, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform data for frontend
    const transformedKeys = apiKeys?.map((key: any) => ({
      id: key.id,
      name: key.name,
      prefix: key.key_prefix,
      permissions: key.permissions,
      status: key.status,
      totalRequests: key.total_requests || 0,
      lastUsed: key.last_used_at,
      createdAt: key.created_at
    })) || []

    return NextResponse.json(transformedKeys)

  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for API key creation
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked API key creation request`, {
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
    const validationResult = createApiKeySchema.safeParse(body)
    if (!validationResult.success) {
      console.warn(`[${requestId}] Invalid API key input`, {
        errors: validationResult.error.issues
      })
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, permissions } = validationResult.data

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed for API key creation`, { hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 20 integration operations per hour (includes API keys)
    const rateLimitResponse = await checkRateLimit(user.id, 'integrationOperations', 'API key generation')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.info(`[${requestId}] API key generation requested`, {
      userId: user.id,
      keyName: name
    })

    // Check existing API key count
    const { data: existingKeys } = await (supabase as any)
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (existingKeys && existingKeys.length >= 10) {
      console.warn(`[${requestId}] Maximum API key limit reached`, { userId: user.id })
      return NextResponse.json(
        { error: 'Maximum of 10 active API keys allowed' },
        { status: 403 }
      )
    }

    // Generate API key
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)
    const keyPrefix = apiKey.substring(0, 8)

    // Store API key
    const { data: createdKey, error } = await (supabase as any)
      .from('api_keys')
      .insert({
        user_id: user.id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: permissions,
        status: 'active'
      })
      .select('id, name, key_prefix, permissions, status, created_at')
      .single()

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to create API key: ' + error.message)
    }

    // Return the full API key (this is the only time it will be shown)
    return NextResponse.json({
      success: true,
      key: apiKey,
      apiKey: {
        id: createdKey.id,
        name: createdKey.name,
        prefix: createdKey.key_prefix,
        permissions: createdKey.permissions,
        status: createdKey.status,
        totalRequests: 0,
        lastUsed: null,
        createdAt: createdKey.created_at
      }
    })

  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = randomBytes(8).toString('hex')

  // CSRF Protection: Validate Origin/Referer for API key revocation
  const csrfValidation = validateCSRF(request)
  if (!csrfValidation.isValid) {
    console.warn(`[${requestId}] CSRF protection blocked API key revocation request`, {
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
    const rawKeyId = searchParams.get('id')

    if (!rawKeyId) {
      console.warn(`[${requestId}] Missing API key ID for revocation`)
      return NextResponse.json({ error: 'API key ID required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(rawKeyId)) {
      console.warn(`[${requestId}] Invalid API key ID format provided`)
      return NextResponse.json({ error: 'Invalid API key ID format' }, { status: 400 })
    }

    const keyId = rawKeyId

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed for API key revocation`, { hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResponse = await checkRateLimit(user.id, 'integrationOperations', 'API key revocation')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    console.info(`[${requestId}] API key revocation requested`, {
      userId: user.id,
      keyId: keyId
    })

    // Revoke API key (set status to revoked instead of deleting)
    const { error } = await (supabase as any)
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId)
      .eq('user_id', user.id)

    if (error) {
      throw new Error('Failed to revoke API key: ' + error.message)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error revoking API key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
