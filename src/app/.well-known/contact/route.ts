import { NextResponse } from 'next/server'

/**
 * /.well-known/contact endpoint
 *
 * Provides machine-readable contact information for the service.
 * This endpoint helps automated tools, researchers, and other services
 * find appropriate contact methods.
 *
 * @see https://tools.ietf.org/rfc/rfc8615.txt
 */

interface ContactInfo {
  contact: {
    email: string[]
    web: string[]
    phone?: string[]
  }
  security?: {
    email: string[]
    web: string[]
    policy?: string
    acknowledgments?: string
    expires?: string
  }
  support: {
    email: string[]
    web: string[]
    hours?: string
    timezone?: string
  }
  business: {
    name: string
    legal_name?: string
    website: string
    address?: {
      street?: string
      city?: string
      state?: string
      country?: string
      postal_code?: string
    }
  }
  social?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
}

export async function GET() {
  const contactInfo: ContactInfo = {
    contact: {
      email: [
        'hello@pingbuoy.com',
        'info@pingbuoy.com'
      ],
      web: [
        'https://pingbuoy.com/contact',
        'https://pingbuoy.com/support'
      ]
    },
    security: {
      email: [
        'security@pingbuoy.com'
      ],
      web: [
        'https://pingbuoy.com/contact?type=security'
      ],
      policy: 'https://pingbuoy.com/security/policy',
      acknowledgments: 'https://pingbuoy.com/security/acknowledgments',
      expires: '2026-12-31T23:59:59.000Z'
    },
    support: {
      email: [
        'support@pingbuoy.com'
      ],
      web: [
        'https://pingbuoy.com/contact',
        'https://pingbuoy.com/help'
      ],
      hours: 'Monday-Friday 9:00-17:00',
      timezone: 'UTC'
    },
    business: {
      name: 'PingBuoy',
      legal_name: 'PingBuoy LLC',
      website: 'https://pingbuoy.com',
      address: {
        country: 'United States'
      }
    },
    social: {
      twitter: 'https://twitter.com/pingbuoy',
      linkedin: 'https://linkedin.com/company/pingbuoy',
      github: 'https://github.com/pingbuoy'
    }
  }

  return NextResponse.json(contactInfo, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*', // Allow CORS for contact info
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// Handle HEAD requests
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}