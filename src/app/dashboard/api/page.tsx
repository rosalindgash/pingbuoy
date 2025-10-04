'use client'
import {
  Code,
  Key,
  Globe,
  Shield,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Book,
  Zap,
  Database,
  Lock,
  Webhook,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Code example component
function CodeExample({ title, code, language = 'bash' }: { title: string; code: string; language?: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <span className="text-sm font-medium text-gray-300">{title}</span>
        <button
          onClick={copyToClipboard}
          className="text-gray-400 hover:text-white transition-colors"
          title="Copy to clipboard"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  )
}

// API endpoint documentation component
function APIEndpoint({ 
  method, 
  path, 
  description, 
  parameters, 
  response,
  example 
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  parameters?: { name: string; type: string; required: boolean; description: string }[]
  response?: string
  example?: string
}) {
  const methodColors = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
    PATCH: 'bg-purple-100 text-purple-800'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start space-x-4 mb-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${methodColors[method]}`}> {/* eslint-disable-line security/detect-object-injection */}
          {method}
        </span>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 font-mono">{path}</h3>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      {parameters && parameters.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Parameters</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Required</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((param, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-sm font-mono text-gray-900">{param.name}</td>
                    <td className="py-2 px-3 text-sm text-gray-600">{param.type}</td>
                    <td className="py-2 px-3 text-sm">
                      {param.required ? (
                        <span className="text-red-600">Required</span>
                      ) : (
                        <span className="text-gray-500">Optional</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-600">{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {response && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Response</h4>
          <pre className="bg-gray-50 p-3 rounded text-sm text-gray-700 overflow-x-auto">
            <code>{response}</code>
          </pre>
        </div>
      )}

      {example && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Example</h4>
          <CodeExample title="cURL Example" code={example} />
        </div>
      )}
    </div>
  )
}

export default function APIDocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Code className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
                <p className="text-gray-600 mt-1">
                  Complete API reference for PingBuoy monitoring service
                </p>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contents</h2>
              <nav className="space-y-2">
                <a href="#getting-started" className="block text-sm text-blue-600 hover:text-blue-800">
                  Getting Started
                </a>
                <a href="#authentication" className="block text-sm text-gray-600 hover:text-gray-800">
                  Authentication
                </a>
                <a href="#rate-limits" className="block text-sm text-gray-600 hover:text-gray-800">
                  Rate Limits
                </a>
                <a href="#websites" className="block text-sm text-gray-600 hover:text-gray-800">
                  Websites
                </a>
                <a href="#monitoring" className="block text-sm text-gray-600 hover:text-gray-800">
                  Monitoring
                </a>
                <a href="#integrations" className="block text-sm text-gray-600 hover:text-gray-800">
                  Integrations
                </a>
                <a href="#api-keys" className="block text-sm text-gray-600 hover:text-gray-800">
                  API Keys
                </a>
                <a href="#webhooks" className="block text-sm text-gray-600 hover:text-gray-800">
                  Webhooks
                </a>
                <a href="#errors" className="block text-sm text-gray-600 hover:text-gray-800">
                  Error Handling
                </a>
              </nav>

              {/* API Status */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">API Status</h3>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">All systems operational</span>
                </div>
                <a href="/status" className="text-xs text-blue-600 hover:text-blue-800 mt-1 block">
                  View status page →
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Getting Started */}
            <section id="getting-started">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Zap className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Getting Started</h2>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-4">
                    The PingBuoy API allows you to programmatically manage your website monitoring, 
                    alerts, and integrations. Our REST API uses standard HTTP methods and returns 
                    JSON responses.
                  </p>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Base URL</h4>
                        <code className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          https://pingbuoy.com/api
                        </code>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Example</h3>
                  <CodeExample
                    title="Get your monitored sites"
                    code={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://pingbuoy.com/api/sites`}
                  />
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Key className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Authentication</h2>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-4">
                    PingBuoy uses API keys for authentication. Include your API key in the 
                    Authorization header of all requests.
                  </p>

                  <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                    <div className="flex items-start">
                      <Lock className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Security Notice</h4>
                        <p className="text-sm text-yellow-700">
                          Keep your API keys secure and never expose them in client-side code. 
                          Rotate keys regularly for enhanced security.
                        </p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Creating API Keys</h3>
                  <p className="text-gray-600 mb-4">
                    Generate API keys in your <a href="/dashboard/integrations" className="text-blue-600 hover:text-blue-800">dashboard integrations page</a>.
                  </p>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Using API Keys</h3>
                  <CodeExample
                    title="Authentication Header"
                    code={`Authorization: Bearer pb_live_1234567890abcdef`} // eslint-disable-line no-secrets/no-secrets
                  />
                </div>
              </div>
            </section>

            {/* Rate Limits */}
            <section id="rate-limits">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Rate Limits</h2>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-4">
                    API requests are rate limited to ensure fair usage and system stability.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900">Free Plan</h4>
                      <p className="text-sm text-gray-600">100 requests/hour</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900">Pro Plan</h4>
                      <p className="text-sm text-blue-700">1,000 requests/hour</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Rate Limit Headers</h3>
                  <CodeExample
                    title="Response Headers"
                    code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1641123456`}
                  />
                </div>
              </div>
            </section>

            {/* Websites Endpoints */}
            <section id="websites">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Globe className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Websites</h2>
                </div>

                <APIEndpoint
                  method="GET"
                  path="/api/sites"
                  description="Retrieve all monitored sites"
                  parameters={[
                    { name: 'status', type: 'string', required: false, description: 'Filter by status (up, down, unknown)' }
                  ]}
                  response={`[
  {
    "id": "uuid",
    "name": "My Website",
    "url": "https://example.com",
    "status": "up",
    "last_checked": "2025-01-15T10:30:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "user_id": "uuid",
    "is_active": true
  }
]`}
                  example={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://pingbuoy.com/api/sites"`}
                />

                <APIEndpoint
                  method="POST"
                  path="/api/sites"
                  description="Add a new site to monitor"
                  parameters={[
                    { name: 'name', type: 'string', required: true, description: 'Site display name (max 100 chars)' },
                    { name: 'url', type: 'string', required: true, description: 'Site URL to monitor (must be valid URL)' }
                  ]}
                  response={`{
  "id": "uuid",
  "name": "My Website",
  "url": "https://example.com",
  "status": "unknown",
  "user_id": "uuid",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z",
  "last_checked": null
}`}
                  example={`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Website", "url": "https://example.com"}' \\
  https://pingbuoy.com/api/sites`}
                />

                <APIEndpoint
                  method="DELETE"
                  path="/api/sites?id={id}"
                  description="Remove a site from monitoring"
                  parameters={[
                    { name: 'id', type: 'string', required: true, description: 'Site UUID (query parameter)' }
                  ]}
                  response={`{
  "success": true
}`}
                  example={`curl -X DELETE \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://pingbuoy.com/api/sites?id=SITE_UUID"`}
                />
              </div>
            </section>

            {/* Monitoring Endpoints */}
            <section id="monitoring">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Database className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Monitoring Data</h2>
                </div>

                <APIEndpoint
                  method="POST"
                  path="/api/monitoring/trigger"
                  description="Manually trigger a monitoring check for a site"
                  parameters={[
                    { name: 'action', type: 'string', required: true, description: 'Check type: "uptime", "pagespeed", or "deadlinks"' },
                    { name: 'siteId', type: 'string', required: true, description: 'Site UUID to check' }
                  ]}
                  response={`{
  "success": true,
  "site": {
    "id": "uuid",
    "name": "My Website",
    "url": "https://example.com"
  },
  "result": {
    "type": "uptime",
    "status": "up",
    "responseTime": 234,
    "statusCode": 200,
    "sslValid": true
  }
}`}
                  example={`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "uptime", "siteId": "SITE_UUID"}' \\
  https://pingbuoy.com/api/monitoring/trigger`}
                />

                <APIEndpoint
                  method="GET"
                  path="/api/integrations"
                  description="Get all your integrations (Slack, Discord, Webhooks)"
                  parameters={[]}
                  response={`[
  {
    "id": "uuid",
    "name": "Slack Alerts",
    "type": "slack",
    "status": "active",
    "config": {
      "events": ["downtime", "recovery"]
    },
    "lastTest": "2025-01-15T10:30:00Z",
    "lastTestStatus": "success",
    "totalNotifications": 42
  }
]`}
                  example={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://pingbuoy.com/api/integrations"`}
                />

                <APIEndpoint
                  method="POST"
                  path="/api/integrations"
                  description="Create a new integration"
                  parameters={[
                    { name: 'name', type: 'string', required: true, description: 'Integration name' },
                    { name: 'integration_type', type: 'string', required: true, description: 'Type: slack, discord, or webhook' },
                    { name: 'webhook_url', type: 'string', required: true, description: 'Webhook URL for the integration' },
                    { name: 'events', type: 'array', required: false, description: 'Events to monitor (default: downtime, recovery)' }
                  ]}
                  response={`{
  "success": true,
  "integration": {
    "id": "uuid",
    "name": "My Slack Integration",
    "type": "slack",
    "status": "active",
    "config": {
      "events": ["downtime", "recovery", "ssl_expiry"]
    }
  }
}`}
                  example={`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Slack Alerts",
    "integration_type": "slack",
    "webhook_url": "https://hooks.slack.com/services/...",
    "events": ["downtime", "recovery"]
  }' \\
  https://pingbuoy.com/api/integrations`}
                />
              </div>
            </section>

            {/* API Keys */}
            <section id="api-keys">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Key className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
                </div>

                <APIEndpoint
                  method="GET"
                  path="/api/keys"
                  description="Get all your API keys"
                  parameters={[]}
                  response={`[
  {
    "id": "uuid",
    "name": "Production API Key",
    "prefix": "pb_12345",
    "permissions": ["read", "write"],
    "status": "active",
    "totalRequests": 1234,
    "lastUsed": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-01T00:00:00Z"
  }
]`}
                  example={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://pingbuoy.com/api/keys"`}
                />

                <APIEndpoint
                  method="POST"
                  path="/api/keys"
                  description="Generate a new API key"
                  parameters={[
                    { name: 'name', type: 'string', required: true, description: 'API key name' },
                    { name: 'permissions', type: 'array', required: true, description: 'Array of permissions: ["read"] or ["read", "write"]' }
                  ]}
                  response={`{
  "success": true,
  "key": "pb_live_1234567890abcdef...",
  "apiKey": {
    "id": "uuid",
    "name": "My API Key",
    "prefix": "pb_12345",
    "permissions": ["read", "write"],
    "status": "active"
  }
}`}
                  example={`curl -X POST \\
  -H "Authorization: Bearer YOUR_EXISTING_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Key",
    "permissions": ["read", "write"]
  }' \\
  https://pingbuoy.com/api/keys`}
                />
              </div>
            </section>

            {/* Webhooks */}
            <section id="webhooks">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Webhook className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-4">
                    Webhooks allow you to receive real-time notifications when incidents occur. 
                    PingBuoy will send HTTP POST requests to your configured endpoints.
                  </p>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Webhook Payload</h3>
                  <CodeExample
                    title="Downtime Alert Payload"
                    language="json"
                    code={`{
  "event": "website.down",
  "timestamp": "2025-01-12T10:30:00Z",
  "website": {
    "id": "uuid",
    "name": "My Website",
    "url": "https://example.com"
  },
  "incident": {
    "id": "uuid",
    "status_code": 503,
    "response_time": null,
    "error_message": "Service Unavailable"
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}`}
                  />

                  <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Security</h3>
                  <p className="text-gray-600 mb-4">
                    Webhook requests include a signature header for verification:
                  </p>
                  <CodeExample
                    title="Signature Verification"
                    code={`X-Webhook-Signature: sha256=hash_value`}
                  />
                </div>
              </div>
            </section>

            {/* Error Handling */}
            <section id="errors">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Error Handling</h2>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-4">
                    The API uses standard HTTP status codes and returns error details in JSON format.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {[
                      { code: '200', description: 'Success' },
                      { code: '400', description: 'Bad Request' },
                      { code: '401', description: 'Unauthorized' },
                      { code: '403', description: 'Forbidden' },
                      { code: '404', description: 'Not Found' },
                      { code: '429', description: 'Rate Limited' },
                      { code: '500', description: 'Server Error' }
                    ].map((status) => (
                      <div key={status.code} className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{status.code}</code>
                        <span className="text-sm text-gray-600">{status.description}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Error Response Format</h3>
                  <CodeExample
                    title="Error Response"
                    language="json"
                    code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid website URL format",
    "details": {
      "field": "url",
      "value": "not-a-url"
    }
  }
}`}
                  />
                </div>
              </div>
            </section>

            {/* SDK and Libraries */}
            <section>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Book className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">SDKs & Libraries</h2>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-6">
                    Official SDKs and community libraries to integrate PingBuoy into your applications.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">JavaScript/Node.js</h3>
                      <CodeExample
                        title="Installation"
                        code={`npm install pingbuoy-sdk`}
                      />
                      <a href="#" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View on GitHub
                      </a>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Python</h3>
                      <CodeExample
                        title="Installation"
                        code={`pip install pingbuoy`}
                      />
                      <a href="#" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View on GitHub
                      </a>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Go</h3>
                      <CodeExample
                        title="Installation"
                        code={`go get github.com/pingbuoy/go-sdk`}
                      />
                      <a href="#" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View on GitHub
                      </a>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">PHP</h3>
                      <CodeExample
                        title="Installation"
                        code={`composer require pingbuoy/php-sdk`}
                      />
                      <a href="#" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View on GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Support */}
            <section>
              <div className="bg-blue-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-blue-900 mb-3">Need Help?</h2>
                <p className="text-blue-800 mb-4">
                  If you have questions about the API or need assistance with integration, 
                  our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Contact Support
                  </Button>
                  <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                    View Examples
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}