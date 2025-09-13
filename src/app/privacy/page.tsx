import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPath="/privacy" />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Learn how we protect your privacy and handle your data with care and transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-gray-600 mb-8">Last updated: January 1, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">1. Introduction</h2>
            <p className="mb-4">
              PingBuoy ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website monitoring service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-[#111827] mb-2">Personal Information</h3>
            <p className="mb-4">When you create an account, we collect:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Email address</li>
              <li>Full name (optional)</li>
              <li>Password (encrypted)</li>
              <li>Payment information (processed by Stripe)</li>
            </ul>

            <h3 className="text-lg font-medium text-[#111827] mb-2">Website Monitoring Data</h3>
            <p className="mb-4">To provide our service, we collect:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>URLs of websites you choose to monitor</li>
              <li>Uptime and response time data</li>
              <li>Page speed and performance metrics</li>
              <li>SSL certificate information</li>
              <li>API endpoint monitoring data</li>
            </ul>

            <h3 className="text-lg font-medium text-[#111827] mb-2">Usage Information</h3>
            <p className="mb-4">We automatically collect:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Pages visited and time spent</li>
              <li>Referral sources</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Provide and maintain our monitoring services</li>
              <li>Send alerts and notifications about your monitored websites</li>
              <li>Process payments and manage subscriptions</li>
              <li>Communicate with you about service updates</li>
              <li>Improve our service and develop new features</li>
              <li>Provide customer support</li>
              <li>Prevent fraud and abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">4. Information Sharing</h2>
            <p className="mb-4">We do not sell or rent your personal information. We may share information in the following circumstances:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Service Providers:</strong> We use Stripe for payment processing and may use other third-party services</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>Consent:</strong> When you explicitly consent to sharing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">5. Cookies and Tracking Technologies</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns.
            </p>
            
            <h3 className="text-lg font-medium text-[#111827] mb-2">Types of Cookies We Use</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for basic site functionality and security</li>
              <li><strong>Authentication Cookies:</strong> Keep you logged in to your account</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
            </ul>

            <h3 className="text-lg font-medium text-[#111827] mb-2">Managing Cookies</h3>
            <p className="mb-4">
              You can control cookies through your browser settings. However, disabling certain cookies may affect the functionality of our service. Essential cookies cannot be disabled if you want to use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">6. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication systems</li>
              <li>Regular security audits</li>
              <li>Limited access to personal data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">7. Data Retention</h2>
            <p className="mb-4">
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Monitoring data is retained according to your subscription plan:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Free plan: 7 days of monitoring history</li>
              <li>Pro plan: 90 days of monitoring history</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">8. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mb-4">
              To exercise these rights, contact us at legal@pingbuoy.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">9. International Data Transfers</h2>
            <p className="mb-4">
              Our services are hosted in the United States. By using our service, you consent to the transfer of your information to the United States, which may have different data protection laws than your country.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">10. Children's Privacy</h2>
            <p className="mb-4">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">11. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. Significant changes will be communicated via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">12. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mb-4">
              <strong>Email:</strong> legal@pingbuoy.com
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}