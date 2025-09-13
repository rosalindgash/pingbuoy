import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pingbuoy.com'
  const currentDate = new Date()

  // Static pages with their priorities and change frequencies
  const staticPages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1.0
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6
    },
    {
      url: `${baseUrl}/status`,
      lastModified: currentDate,
      changeFrequency: 'hourly' as const,
      priority: 0.8
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.9
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.5
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'yearly' as const,
      priority: 0.3
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'yearly' as const,
      priority: 0.3
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'yearly' as const,
      priority: 0.3
    }
  ]

  // Dynamic pages (would be populated from database in production)
  const dynamicPages = [
    // Blog posts (if we add a blog)
    // {
    //   url: `${baseUrl}/blog`,
    //   lastModified: currentDate,
    //   changeFrequency: 'daily' as const,
    //   priority: 0.8
    // },
    // Documentation pages
    // {
    //   url: `${baseUrl}/docs`,
    //   lastModified: currentDate,
    //   changeFrequency: 'weekly' as const,
    //   priority: 0.7
    // }
  ]

  return [
    ...staticPages,
    ...dynamicPages
  ]
}