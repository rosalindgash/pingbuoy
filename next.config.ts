import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily disable ESLint and TypeScript errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Security configurations
  poweredByHeader: false,
  
  // HTTPS redirect in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://pingbuoy.com/:path*',
          permanent: true,
        },
      ]
    }
    return []
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel-insights.com js.stripe.com",
              "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' vercel-insights.com js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://*.upstash.io https://api.stripe.com",
              "frame-src https://js.stripe.com",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS header for production
          ...(process.env.NODE_ENV === 'production' 
            ? [{
                key: 'Strict-Transport-Security',
                value: 'max-age=31536000; includeSubDomains; preload',
              }]
            : []
          ),
        ],
      },
    ]
  },
};

export default nextConfig;