import { Metadata } from 'next'

// Base SEO configuration
export const seoConfig = {
  siteName: 'PingBuoy',
  siteUrl: 'https://pingbuoy.com',
  defaultTitle: 'PingBuoy - Website Monitoring & Uptime Tracking',
  defaultDescription: 'Monitor your website uptime, detect dead links, and get instant alerts. Never let your site sink again with PingBuoy\'s comprehensive monitoring tools.',
  defaultKeywords: [
    'website monitoring',
    'uptime tracking',
    'dead link checker',
    'website alerts',
    'site monitoring',
    'downtime alerts',
    'website uptime',
    'monitoring service',
    'web monitoring',
    'site health'
  ],
  defaultImage: '/og-image.png',
  twitterHandle: '@pingbuoy',
  author: 'PingBuoy Team',
  language: 'en',
  locale: 'en_US',
  themeColor: '#1E3A8A'
}

// Generate comprehensive metadata for pages
export function generateMetadata({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  noIndex = false,
  canonicalUrl
}: {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  noIndex?: boolean
  canonicalUrl?: string
}): Metadata {
  const fullTitle = title 
    ? `${title} | ${seoConfig.siteName}`
    : seoConfig.defaultTitle
  
  const fullDescription = description || seoConfig.defaultDescription
  const fullKeywords = [...seoConfig.defaultKeywords, ...keywords]
  const fullImage = image ? `${seoConfig.siteUrl}${image}` : `${seoConfig.siteUrl}${seoConfig.defaultImage}`
  const fullUrl = url ? `${seoConfig.siteUrl}${url}` : seoConfig.siteUrl

  const metadata: Metadata = {
    title: fullTitle,
    description: fullDescription,
    keywords: fullKeywords.join(', '),
    authors: [{ name: author || seoConfig.author }],
    creator: seoConfig.author,
    publisher: seoConfig.siteName,
    
    // Basic meta tags
    metadataBase: new URL(seoConfig.siteUrl),
    alternates: {
      canonical: canonicalUrl || fullUrl
    },
    
    // Open Graph
    openGraph: {
      type: type === 'product' ? 'website' : type,
      siteName: seoConfig.siteName,
      title: fullTitle,
      description: fullDescription,
      url: fullUrl,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: fullTitle
        }
      ],
      locale: seoConfig.locale,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime })
    },
    
    // Twitter
    twitter: {
      card: 'summary_large_image',
      site: seoConfig.twitterHandle,
      creator: seoConfig.twitterHandle,
      title: fullTitle,
      description: fullDescription,
      images: [fullImage]
    },
    
    // Additional meta tags
    other: {
      'theme-color': seoConfig.themeColor,
      'application-name': seoConfig.siteName,
      'apple-mobile-web-app-title': seoConfig.siteName,
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
      'msapplication-TileColor': seoConfig.themeColor,
      'msapplication-tap-highlight': 'no'
    }
  }

  // Add robots meta tag if needed
  if (noIndex) {
    metadata.robots = {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    }
  } else {
    metadata.robots = {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    }
  }

  return metadata
}

// Predefined metadata for common pages
export const pageMetadata = {
  home: generateMetadata({
    title: '',
    description: 'Monitor your website uptime, detect dead links, and get instant alerts. Never let your site sink again with PingBuoy\'s comprehensive monitoring tools.',
    keywords: ['website monitoring', 'uptime tracking', 'site monitoring', 'downtime alerts'],
    url: '/'
  }),

  about: generateMetadata({
    title: 'About Us',
    description: 'Learn about PingBuoy\'s mission to keep websites afloat. Discover our story, values, and commitment to reliable website monitoring.',
    keywords: ['about pingbuoy', 'website monitoring company', 'uptime monitoring service'],
    url: '/about'
  }),

  pricing: generateMetadata({
    title: 'Pricing Plans',
    description: 'Choose the perfect PingBuoy plan for your needs. Free monitoring for 3 websites or upgrade to Pro for advanced features and unlimited monitoring.',
    keywords: ['website monitoring pricing', 'uptime monitoring cost', 'monitoring service plans'],
    url: '/pricing'
  }),

  faq: generateMetadata({
    title: 'Frequently Asked Questions',
    description: 'Find answers to common questions about PingBuoy website monitoring, uptime tracking, dead link detection, pricing, and security features.',
    keywords: ['pingbuoy faq', 'website monitoring questions', 'uptime tracking help'],
    url: '/faq'
  }),

  contact: generateMetadata({
    title: 'Contact Us',
    description: 'Get in touch with PingBuoy support. We\'re here to help with your website monitoring needs and answer any questions.',
    keywords: ['contact pingbuoy', 'website monitoring support', 'uptime monitoring help'],
    url: '/contact'
  }),

  privacy: generateMetadata({
    title: 'Privacy Policy',
    description: 'Learn how PingBuoy protects your privacy and handles your data. Our commitment to keeping your information secure and private.',
    keywords: ['privacy policy', 'data protection', 'website monitoring privacy'],
    url: '/privacy',
    noIndex: true
  }),

  terms: generateMetadata({
    title: 'Terms of Service',
    description: 'PingBuoy Terms of Service. Review our terms and conditions for using our website monitoring and uptime tracking services.',
    keywords: ['terms of service', 'website monitoring terms', 'service agreement'],
    url: '/terms',
    noIndex: true
  }),

  cookies: generateMetadata({
    title: 'Cookie Policy',
    description: 'Learn about how PingBuoy uses cookies, what data we collect, and how you can manage your cookie preferences.',
    keywords: ['cookie policy', 'website cookies', 'data collection'],
    url: '/cookies',
    noIndex: true
  }),

  status: generateMetadata({
    title: 'System Status',
    description: 'Check PingBuoy\'s current system status, uptime, and any ongoing incidents. Real-time status updates for our monitoring services.',
    keywords: ['pingbuoy status', 'system status', 'service uptime', 'monitoring status'],
    url: '/status'
  }),

  dashboard: generateMetadata({
    title: 'Dashboard',
    description: 'PingBuoy monitoring dashboard. View your website uptime statistics, manage monitored sites, and configure alerts.',
    keywords: ['monitoring dashboard', 'website analytics', 'uptime dashboard'],
    url: '/dashboard',
    noIndex: true
  }),

  login: generateMetadata({
    title: 'Sign In',
    description: 'Sign in to your PingBuoy account to access your website monitoring dashboard and manage your monitored sites.',
    keywords: ['login', 'sign in', 'account access'],
    url: '/login',
    noIndex: true
  }),

  signup: generateMetadata({
    title: 'Get Started',
    description: 'Start monitoring your websites for free with PingBuoy. Sign up now and get instant uptime alerts and dead link detection.',
    keywords: ['sign up', 'create account', 'free monitoring', 'website monitoring signup'],
    url: '/signup'
  }),

  integrations: generateMetadata({
    title: 'Integrations',
    description: 'Connect PingBuoy with Slack, Discord, webhooks, and other services. Get monitoring alerts where you work.',
    keywords: ['slack integration', 'webhook monitoring', 'discord alerts', 'monitoring integrations'],
    url: '/dashboard/integrations',
    noIndex: true
  }),

  api: generateMetadata({
    title: 'API Documentation',
    description: 'Complete API reference for PingBuoy monitoring service. Manage websites, alerts, and integrations programmatically.',
    keywords: ['api documentation', 'monitoring api', 'rest api', 'developer tools'],
    url: '/dashboard/api',
    noIndex: true
  })
}

// Generate JSON-LD structured data
export function generateStructuredData(type: 'Organization' | 'WebSite' | 'SoftwareApplication' | 'Article', data: any) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type
  }

  switch (type) {
    case 'Organization':
      return {
        ...baseData,
        name: seoConfig.siteName,
        url: seoConfig.siteUrl,
        logo: `${seoConfig.siteUrl}/logo.png`,
        description: seoConfig.defaultDescription,
        foundingDate: '2025',
        founders: [
          {
            '@type': 'Person',
            name: 'PingBuoy Team'
          }
        ],
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'US'
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: 'support@pingbuoy.com',
          url: `${seoConfig.siteUrl}/contact`
        },
        sameAs: [
          `https://twitter.com/${seoConfig.twitterHandle.replace('@', '')}`
        ],
        ...data
      }

    case 'WebSite':
      return {
        ...baseData,
        name: seoConfig.siteName,
        url: seoConfig.siteUrl,
        description: seoConfig.defaultDescription,
        publisher: {
          '@type': 'Organization',
          name: seoConfig.siteName
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${seoConfig.siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        },
        ...data
      }

    case 'SoftwareApplication':
      return {
        ...baseData,
        name: seoConfig.siteName,
        description: seoConfig.defaultDescription,
        url: seoConfig.siteUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          category: 'Free with Premium Options'
        },
        featureList: [
          'Website Uptime Monitoring',
          'Dead Link Detection',
          'Instant Alerts',
          'Dashboard Analytics',
          'Slack Integration',
          'API Access'
        ],
        screenshot: `${seoConfig.siteUrl}/screenshot.png`,
        ...data
      }

    case 'Article':
      return {
        ...baseData,
        headline: data.title,
        description: data.description,
        image: data.image ? `${seoConfig.siteUrl}${data.image}` : `${seoConfig.siteUrl}${seoConfig.defaultImage}`,
        author: {
          '@type': 'Organization',
          name: seoConfig.siteName
        },
        publisher: {
          '@type': 'Organization',
          name: seoConfig.siteName,
          logo: {
            '@type': 'ImageObject',
            url: `${seoConfig.siteUrl}/logo.png`
          }
        },
        datePublished: data.publishedTime,
        dateModified: data.modifiedTime || data.publishedTime,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${seoConfig.siteUrl}${data.url}`
        },
        ...data
      }

    default:
      return baseData
  }
}

// SEO utility functions
export const seoUtils = {
  // Clean and optimize title
  optimizeTitle: (title: string, maxLength = 60): string => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength - 3) + '...'
  },

  // Clean and optimize description
  optimizeDescription: (description: string, maxLength = 160): string => {
    if (description.length <= maxLength) return description
    return description.substring(0, maxLength - 3) + '...'
  },

  // Generate breadcrumb structured data
  generateBreadcrumbs: (items: Array<{ name: string; url: string }>) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${seoConfig.siteUrl}${item.url}`
      }))
    }
  },

  // Generate FAQ structured data
  generateFAQStructuredData: (faqs: Array<{ question: string; answer: string }>) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    }
  }
}