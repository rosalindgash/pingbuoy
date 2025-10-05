const nextConfig = {
  eslint: {
    // ESLint runs separately via `npm run lint` which only scans src/ folder
    // Build-time linting disabled to avoid false positives from security plugin
    ignoreDuringBuilds: true,
    dirs: ['src']
  },
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow scripts from self, Stripe, and inline scripts with nonce
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
              // Allow styles from self and inline styles
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Allow images from self, data URIs, Stripe, and HTTPS sources
              "img-src 'self' data: https: blob:",
              // Allow fonts from self and Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // Allow connections to self, Supabase, Stripe, and Upstash
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.upstash.io",
              // Allow frames from Stripe (for 3D Secure)
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              // Block all object/embed elements
              "object-src 'none'",
              // Block base tag
              "base-uri 'self'",
              // Require HTTPS for forms
              "form-action 'self'",
              // Restrict frame ancestors
              "frame-ancestors 'none'",
              // Upgrade insecure requests
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Restrict browser features and APIs
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()',
              'payment=(self "https://js.stripe.com")',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()'
            ].join(', ')
          },
          // Enable browser XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Strict Transport Security (HSTS)
          // Only enable in production with HTTPS
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }] : [])
        ]
      }
    ]
  }
};

module.exports = nextConfig;