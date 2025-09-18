import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { safeFetchStrict } from '@/lib/ssrf-defense'

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

// Integration test interfaces
interface BaseIntegrationConfig {
  name: string
  integration_type: string
  enabled_events: string[]
}

interface SlackConfig extends BaseIntegrationConfig {
  integration_type: 'slack'
  webhook_url: string
  channel?: string
}

interface WebhookConfig extends BaseIntegrationConfig {
  integration_type: 'webhook'
  webhook_url: string
  webhook_method: 'POST' | 'PUT' | 'PATCH'
  webhook_headers: Record<string, string>
  webhook_secret?: string
  auth_type: 'none' | 'bearer' | 'basic' | 'api_key'
  auth_credentials: Record<string, string>
  timeout_seconds: number
}

interface DiscordConfig extends BaseIntegrationConfig {
  integration_type: 'discord'
  webhook_url: string
}

type IntegrationConfig = SlackConfig | WebhookConfig | DiscordConfig

interface TestResult {
  success: boolean
  responseTime?: number
  statusCode?: number
  error?: string
  details?: {
    requestSent?: boolean
    responseReceived?: boolean
    validResponse?: boolean
    errorDetails?: string
  }
}

interface TestPayload {
  event: string
  timestamp: string
  website: {
    id: string
    name: string
    url: string
  }
  alert?: {
    status_code?: number
    response_time?: number | null
    error_message?: string
  }
  user: {
    id: string
    email: string
  }
}

// Security-focused integration testing class
export class SecureIntegrationTester {
  private static instance: SecureIntegrationTester
  private testHistory: Map<string, TestResult[]> = new Map()
  private readonly maxHistoryEntries = 100

  private constructor() {}

  public static getInstance(): SecureIntegrationTester {
    if (!SecureIntegrationTester.instance) {
      SecureIntegrationTester.instance = new SecureIntegrationTester()
    }
    return SecureIntegrationTester.instance
  }

  // Validate integration configuration
  private validateConfig(config: IntegrationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic validation
    if (!config.name || config.name.length > 100) {
      errors.push('Integration name must be 1-100 characters')
    }

    if (!config.enabled_events || config.enabled_events.length === 0) {
      errors.push('At least one event type must be enabled')
    }

    // Type-specific validation
    switch (config.integration_type) {
      case 'slack':
        if (!config.webhook_url || !config.webhook_url.match(/^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9/]+$/)) {
          errors.push('Invalid Slack webhook URL')
        }
        if (config.channel && (!config.channel.startsWith('#') || config.channel.length > 21)) {
          errors.push('Invalid Slack channel format')
        }
        break

      case 'webhook':
        try {
          const url = new URL(config.webhook_url)
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('Webhook URL must use HTTP or HTTPS')
          }
          if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
            errors.push('Webhook URL must use HTTPS in production')
          }
        } catch {
          errors.push('Invalid webhook URL format')
        }

        if (config.timeout_seconds < 5 || config.timeout_seconds > 120) {
          errors.push('Timeout must be between 5-120 seconds')
        }

        // Validate auth credentials
        if (config.auth_type === 'bearer' && !config.auth_credentials.token) {
          errors.push('Bearer token is required')
        }
        if (config.auth_type === 'basic' && (!config.auth_credentials.username || !config.auth_credentials.password)) {
          errors.push('Username and password are required for basic auth')
        }
        if (config.auth_type === 'api_key' && (!config.auth_credentials.key || !config.auth_credentials.value)) {
          errors.push('API key name and value are required')
        }
        break

      case 'discord':
        if (!config.webhook_url || !config.webhook_url.match(/^https:\/\/discord(app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/)) {
          errors.push('Invalid Discord webhook URL')
        }
        break

      default:
        errors.push('Unsupported integration type')
    }

    return { valid: errors.length === 0, errors }
  }

  // Generate test payload
  private generateTestPayload(config: IntegrationConfig): TestPayload {
    return {
      event: 'test',
      timestamp: new Date().toISOString(),
      website: {
        id: 'test-website-id',
        name: 'Test Website',
        url: 'https://example.com'
      },
      alert: {
        status_code: 200,
        response_time: 250,
        error_message: null
      },
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    }
  }

  // Test Slack integration
  private async testSlackIntegration(config: SlackConfig): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      const payload = this.generateTestPayload(config)
      
      // Slack-specific payload format
      const slackPayload = {
        text: `🧪 PingBuoy Integration Test`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Integration Test*\n\n` +
                    `*Website:* ${payload.website.name} (${payload.website.url})\n` +
                    `*Status:* ✅ Test successful\n` +
                    `*Time:* ${payload.timestamp}`
            }
          }
        ],
        ...(config.channel && { channel: config.channel })
      }

      const response = await safeFetchStrict(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PingBuoy-Integration-Test/1.0'
        },
        body: JSON.stringify(slackPayload),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        return {
          success: true,
          responseTime,
          statusCode: response.status
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          responseTime,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${errorText}`,
          details: {
            requestSent: true,
            responseReceived: true,
            validResponse: false,
            errorDetails: errorText
          }
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          requestSent: true,
          responseReceived: false,
          validResponse: false,
          errorDetails: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  // Test Webhook integration
  private async testWebhookIntegration(config: WebhookConfig): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      const payload = this.generateTestPayload(config)
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'PingBuoy-Integration-Test/1.0',
        ...config.webhook_headers
      }

      // Add authentication headers
      switch (config.auth_type) {
        case 'bearer':
          headers.Authorization = `Bearer ${config.auth_credentials.token}`
          break
        case 'basic':
          const basicAuth = btoa(`${config.auth_credentials.username}:${config.auth_credentials.password}`)
          headers.Authorization = `Basic ${basicAuth}`
          break
        case 'api_key':
          headers[config.auth_credentials.key] = config.auth_credentials.value
          break
      }

      // Add webhook signature if secret is provided
      if (config.webhook_secret) {
        const payloadString = JSON.stringify(payload)
        const signature = await this.generateWebhookSignature(payloadString, config.webhook_secret)
        headers['X-Webhook-Signature'] = signature
      }

      const response = await safeFetchStrict(config.webhook_url, {
        method: config.webhook_method,
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.timeout_seconds * 1000)
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        return {
          success: true,
          responseTime,
          statusCode: response.status
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          responseTime,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${errorText}`,
          details: {
            requestSent: true,
            responseReceived: true,
            validResponse: false,
            errorDetails: errorText
          }
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          requestSent: true,
          responseReceived: false,
          validResponse: false,
          errorDetails: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  // Test Discord integration
  private async testDiscordIntegration(config: DiscordConfig): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      const payload = this.generateTestPayload(config)
      
      // Discord-specific payload format
      const discordPayload = {
        embeds: [
          {
            title: '🧪 PingBuoy Integration Test',
            color: 0x00ff00, // Green color
            fields: [
              {
                name: 'Website',
                value: `${payload.website.name}\n${payload.website.url}`,
                inline: true
              },
              {
                name: 'Status',
                value: '✅ Test successful',
                inline: true
              },
              {
                name: 'Time',
                value: payload.timestamp,
                inline: false
              }
            ],
            footer: {
              text: 'PingBuoy Integration Test'
            },
            timestamp: payload.timestamp
          }
        ]
      }

      const response = await safeFetchStrict(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PingBuoy-Integration-Test/1.0'
        },
        body: JSON.stringify(discordPayload),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })

      const responseTime = Date.now() - startTime

      if (response.ok || response.status === 204) { // Discord returns 204 on success
        return {
          success: true,
          responseTime,
          statusCode: response.status
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          responseTime,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${errorText}`,
          details: {
            requestSent: true,
            responseReceived: true,
            validResponse: false,
            errorDetails: errorText
          }
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          requestSent: true,
          responseReceived: false,
          validResponse: false,
          errorDetails: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  // Generate webhook signature (HMAC-SHA256)
  private async generateWebhookSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(payload)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const hashArray = Array.from(new Uint8Array(signature))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return `sha256=${hashHex}`
  }

  // Main test function
  public async testIntegration(config: IntegrationConfig): Promise<TestResult> {
    // Validate configuration first
    const validation = this.validateConfig(config)
    if (!validation.valid) {
      return {
        success: false,
        error: `Configuration validation failed: ${validation.errors.join(', ')}`
      }
    }

    let result: TestResult

    // Test based on integration type
    switch (config.integration_type) {
      case 'slack':
        result = await this.testSlackIntegration(config as SlackConfig)
        break
      case 'webhook':
        result = await this.testWebhookIntegration(config as WebhookConfig)
        break
      case 'discord':
        result = await this.testDiscordIntegration(config as DiscordConfig)
        break
      default:
        result = {
          success: false,
          error: 'Unsupported integration type'
        }
    }

    // Store test history
    const integrationKey = `${config.integration_type}:${config.name}`
    const history = this.testHistory.get(integrationKey) || []
    history.unshift({ ...result, timestamp: new Date().toISOString() } as any)
    
    // Limit history size
    if (history.length > this.maxHistoryEntries) {
      history.splice(this.maxHistoryEntries)
    }
    
    this.testHistory.set(integrationKey, history)

    return result
  }

  // Get test history for an integration
  public getTestHistory(integrationKey: string): TestResult[] {
    return this.testHistory.get(integrationKey) || []
  }

  // Clear test history
  public clearTestHistory(integrationKey?: string): void {
    if (integrationKey) {
      this.testHistory.delete(integrationKey)
    } else {
      this.testHistory.clear()
    }
  }

  // Batch test multiple integrations
  public async batchTestIntegrations(configs: IntegrationConfig[]): Promise<Map<string, TestResult>> {
    const results = new Map<string, TestResult>()
    
    // Run tests in parallel with concurrency limit
    const concurrencyLimit = 5
    const chunks = []
    
    for (let i = 0; i < configs.length; i += concurrencyLimit) {
      chunks.push(configs.slice(i, i + concurrencyLimit))
    }
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (config) => {
        const result = await this.testIntegration(config)
        const key = `${config.integration_type}:${config.name}`
        results.set(key, result)
        return { key, result }
      })
      
      await Promise.all(chunkPromises)
    }
    
    return results
  }

  // Validate webhook URL accessibility (additional security check)
  public async validateWebhookUrl(url: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const urlObj = new URL(url)
      
      // Security checks
      if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
        return { valid: false, error: 'HTTPS is required in production' }
      }
      
      // Check for private/local IPs in production
      const hostname = urlObj.hostname.toLowerCase()
      const privatePatterns = [
        /^localhost$/i,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^::1$/,
        /^fe80:/i
      ]
      
      if (process.env.NODE_ENV === 'production') {
        for (const pattern of privatePatterns) {
          if (pattern.test(hostname)) {
            return { valid: false, error: 'Private/local URLs not allowed in production' }
          }
        }
      }
      
      // Basic connectivity test (HEAD request)
      try {
        const response = await safeFetchStrict(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        })
        
        return { valid: true }
      } catch (error) {
        return { 
          valid: false, 
          error: `URL not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' }
    }
  }
}

// Convenience functions
export const getIntegrationTester = () => SecureIntegrationTester.getInstance()

export const testIntegration = (config: IntegrationConfig) => {
  return getIntegrationTester().testIntegration(config)
}

export const validateWebhookUrl = (url: string) => {
  return getIntegrationTester().validateWebhookUrl(url)
}

// Export types
export type { IntegrationConfig, SlackConfig, WebhookConfig, DiscordConfig, TestResult }