import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://pingbuoy.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/pricing',
          '/faq',
          '/contact',
          '/status',
          '/signup',
          '/login'
        ],
        disallow: [
          '/dashboard/*',
          '/api/*',
          '/admin/*',
          '/private/*',
          '/_next/',
          '/.*'
        ],
        crawlDelay: 1
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/about',
          '/pricing',
          '/faq',
          '/contact',
          '/status',
          '/signup',
          '/login'
        ],
        disallow: [
          '/dashboard/*',
          '/api/*',
          '/admin/*',
          '/private/*',
          '/_next/'
        ]
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/about',
          '/pricing',
          '/faq',
          '/contact',
          '/status',
          '/signup',
          '/login'
        ],
        disallow: [
          '/dashboard/*',
          '/api/*',
          '/admin/*',
          '/private/*',
          '/_next/'
        ],
        crawlDelay: 2
      },
      {
        userAgent: [
          'GPTBot',
          'Google-Extended',
          'CCBot',
          'anthropic-ai'
        ],
        disallow: ['/']
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  }
}