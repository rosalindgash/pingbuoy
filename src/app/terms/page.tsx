import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPath="/terms" />

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Terms of Service
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Please read these terms carefully before using PingBuoy monitoring services.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-gray-600 mb-8">Last updated: January 1, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using PingBuoy ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">2. Description of Service</h2>
            <p className="mb-4">
              PingBuoy provides website monitoring services including uptime monitoring, page speed monitoring, SSL certificate monitoring, and API monitoring. We offer both free and paid subscription plans.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">3. User Accounts</h2>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">4. Acceptable Use Policy</h2>
            <p className="mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Monitor websites that contain illegal content or violate applicable laws</li>
              <li>Attempt to interfere with, compromise the security of, or decipher any transmissions to or from the servers running the Service</li>
              <li>Take any action that imposes an unreasonable or disproportionately large load on our infrastructure</li>
              <li>Upload invalid data, viruses, worms, or other software agents through the Service</li>
              <li>Collect or harvest any personally identifiable information from the Service</li>
              <li>Use the Service for any commercial solicitation purposes</li>
              <li>Impersonate another person or otherwise misrepresent your affiliation with a person or entity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">5. Refund Policy</h2>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-[#111827] mb-2">Subscription Billing</h3>
              <p className="mb-4">
                Subscriptions renew monthly until canceled. You may cancel your subscription at any time. Upon cancellation, your service will remain active until the end of your current billing cycle.
              </p>
              
              <h3 className="text-lg font-medium text-[#111827] mb-2">Refund Terms</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>If you cancel within 7 days of your first payment, you may request a full refund</li>
                <li>After 7 days, no refunds will be issued except in cases of billing errors</li>
                <li>Refunds for billing errors will be processed within 5-10 business days</li>
                <li>To request a refund, contact us at legal@pingbuoy.com</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">6. Service Availability</h2>
            <p className="mb-4">
              We strive to provide reliable service but do not guarantee 100% uptime. Scheduled maintenance and unexpected outages may occur. We will make reasonable efforts to provide advance notice of scheduled maintenance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">7. Limitation of Liability</h2>
            <p className="mb-4">
              PingBuoy shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">8. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">9. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through our service. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">10. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at:
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