'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Cookie, Shield, Settings, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useEffect } from 'react'

export default function CookiePolicyPage() {
  useEffect(() => {
    document.title = 'Cookie Policy - PingBuoy'
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn about how PingBuoy uses cookies, what data we collect, and how you can manage your cookie preferences for our website monitoring service.')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPath="/cookies" />

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                <Cookie className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Cookie Policy
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Learn how PingBuoy uses cookies to provide and improve our website monitoring services.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Last updated: January 2025
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            
            {/* What Are Cookies */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Cookie className="h-6 w-6 text-blue-600 mr-3" />
                What Are Cookies?
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Cookies are small text files that are placed on your device when you visit a website. 
                  They are widely used to make websites work efficiently and provide a better user experience, 
                  as well as to provide information to website owners.
                </p>
                <p>
                  We use cookies and similar tracking technologies to track activity on our service and 
                  hold certain information to improve your experience with PingBuoy.
                </p>
              </div>
            </div>

            {/* Types of Cookies */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Settings className="h-6 w-6 text-blue-600 mr-3" />
                Types of Cookies We Use
              </h2>
              
              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Essential Cookies (Always Active)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    These cookies are necessary for our website to function properly. They enable basic 
                    functions like page navigation, access to secure areas, and authentication.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">Examples:</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li><strong>Session cookies:</strong> Keep you logged in during your visit</li>
                      <li><strong>Security cookies:</strong> Protect against cross-site request forgery</li>
                      <li><strong>Load balancing cookies:</strong> Distribute requests across our servers</li>
                      <li><strong>Cookie consent:</strong> Remember your cookie preferences</li>
                    </ul>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Analytics Cookies (Optional)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    These cookies help us understand how visitors interact with our website by collecting 
                    and reporting information anonymously.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">What we track:</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Number of visitors and page views</li>
                      <li>Time spent on different pages</li>
                      <li>Popular features and content</li>
                      <li>Error rates and performance metrics</li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Provider:</strong> Google Analytics (anonymized data)
                    </p>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="border-l-4 border-orange-500 pl-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Marketing Cookies (Optional)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    These cookies are used to track visitors across websites to display relevant 
                    advertisements and measure the effectiveness of our marketing campaigns.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">Used for:</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Showing relevant ads on other websites</li>
                      <li>Measuring ad campaign performance</li>
                      <li>Retargeting website visitors</li>
                      <li>Social media integration features</li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Providers:</strong> Google Ads, Facebook Pixel, LinkedIn Insight Tag
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Managing Cookies */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Shield className="h-6 w-6 text-blue-600 mr-3" />
                Managing Your Cookie Preferences
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  You have several options to control and manage cookies:
                </p>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">On Our Website</h3>
                  <p className="text-gray-700 mb-4">
                    You can manage your cookie preferences using our cookie banner that appears 
                    on your first visit, or by clicking the button below:
                  </p>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('cookie-consent')
                        window.location.reload()
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Update Cookie Preferences
                  </button>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">In Your Browser</h3>
                  <p className="text-gray-700 mb-3">
                    Most browsers allow you to control cookies through their settings:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                    <li><strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
                    <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                    <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-3">
                    Note: Disabling essential cookies may affect website functionality.
                  </p>
                </div>
              </div>
            </div>

            {/* Third-Party Services */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Eye className="h-6 w-6 text-blue-600 mr-3" />
                Third-Party Services
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  We use trusted third-party services that may set cookies. Each service has its own 
                  privacy policy and cookie usage:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Google Analytics</h3>
                    <p className="text-sm text-gray-600 mb-2">Website analytics and performance tracking</p>
                    <a 
                      href="https://policies.google.com/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Google Privacy Policy →
                    </a>
                  </div>
                  
                  <div className="border border-gray-200 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Google Ads</h3>
                    <p className="text-sm text-gray-600 mb-2">Advertising and conversion tracking</p>
                    <a 
                      href="https://policies.google.com/technologies/ads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Google Ads Policy →
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Cookie Retention Periods
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Cookie Type</th>
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Retention Period</th>
                      <th className="text-left py-2 px-4 font-semibold text-gray-900">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-4">Session cookies</td>
                      <td className="py-2 px-4">Until browser closes</td>
                      <td className="py-2 px-4">Authentication, security</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-4">Consent preferences</td>
                      <td className="py-2 px-4">12 months</td>
                      <td className="py-2 px-4">Remember cookie choices</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-4">Analytics cookies</td>
                      <td className="py-2 px-4">2 years</td>
                      <td className="py-2 px-4">Usage analysis, improvements</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Marketing cookies</td>
                      <td className="py-2 px-4">30-90 days</td>
                      <td className="py-2 px-4">Advertising, retargeting</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-blue-50 p-8 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Questions About Cookies?
              </h2>
              <p className="text-gray-700 mb-6">
                If you have any questions about our use of cookies or this Cookie Policy, 
                please don&apos;t hesitate to contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/contact">
                  <Button className="flex items-center">
                    Contact Support
                  </Button>
                </Link>
                <Link href="/privacy">
                  <Button variant="outline">
                    Privacy Policy
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}