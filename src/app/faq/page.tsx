import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, HelpCircle, Shield, Zap, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions - PingBuoy',
  description: 'Find answers to common questions about PingBuoy website monitoring, uptime tracking, dead link detection, pricing, and security features.',
  openGraph: {
    title: 'FAQ - PingBuoy Website Monitoring',
    description: 'Get quick answers about website monitoring, pricing plans, security features, and how PingBuoy keeps your websites online.',
  },
}

// FAQ Data with security-safe content
const faqCategories = [
  {
    title: 'Getting Started',
    icon: Zap,
    faqs: [
      {
        question: 'What is PingBuoy?',
        answer: 'PingBuoy is a comprehensive website monitoring service that tracks your website uptime, monitors SSL certificates, detects dead links, tests API endpoints, and sends instant alerts when issues are found. We help ensure your websites stay online and perform optimally for your users.'
      },
      {
        question: 'How quickly can I get started?',
        answer: 'You can start monitoring your websites in under 2 minutes. Simply sign up, add your website URL, and we will begin monitoring immediately. No complex setup or technical configuration required.'
      },
      {
        question: 'Do I need to install anything on my website?',
        answer: 'No installation required! PingBuoy monitors your websites externally by checking them from our global network of servers. There is no code to install or plugins to configure.'
      },
      {
        question: 'What types of websites can I monitor?',
        answer: 'PingBuoy can monitor any publicly accessible website or web application, including e-commerce stores, blogs, corporate websites, APIs, and web applications. We support HTTP and HTTPS protocols.'
      }
    ]
  },
  {
    title: 'Monitoring & Features',
    icon: BarChart3,
    faqs: [
      {
        question: 'How often do you check my website?',
        answer: 'Free plan users receive checks every 10 minutes, while Pro plan users receive checks every 3 minutes from multiple locations worldwide. This ensures rapid detection of any downtime or performance issues.'
      },
      {
        question: 'What is dead link detection?',
        answer: 'Our dead link scanner crawls your website to find broken internal and external links. This helps maintain good user experience and SEO rankings by identifying links that return 404 errors or other issues.'
      },
      {
        question: 'Where are your monitoring servers located?',
        answer: 'We monitor from multiple global locations including North America, Europe, and Asia. This provides accurate monitoring regardless of your visitors geographic location and helps identify regional connectivity issues.'
      },
      {
        question: 'What happens if my website goes down?',
        answer: 'When downtime is detected, we immediately send alerts via email and can integrate with other notification services. We also provide detailed incident reports and uptime statistics to help you understand and resolve issues quickly.'
      },
    ]
  },
  {
    title: 'Pricing & Plans',
    icon: HelpCircle,
    faqs: [
      {
        question: 'What is included in the free plan?',
        answer: 'The free plan includes monitoring for up to 2 websites, 1 API endpoint, 10-minute check intervals, email alerts, 7-day history, basic uptime reporting, and dead link detection. Ideal for solopreneurs getting started with website monitoring.'
      },
      {
        question: 'What are the benefits of upgrading to Pro?',
        answer: 'Pro plan includes up to 15 websites, 3 API endpoints, 3-minute monitoring intervals, SSL certificate monitoring, Email/Slack/Discord/Webhook alerts, 60-days history, and priority email support. Ideal for growing businesses and agencies.'
      },
      {
        question: 'Can I change or cancel my plan anytime?',
        answer: 'Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we provide prorated billing for downgrades. No long-term contracts or cancellation fees.'
      },
      {
        question: 'How do I cancel or downgrade my subscription?',
        answer: 'To cancel or downgrade, go to Settings in your dashboard and click the "Manage Subscription" button under Billing. You will be redirected to the Stripe secure customer portal where you can cancel your subscription or downgrade to the Free plan. Cancellations take effect at the end of your current billing period, so you can continue using Pro features until then.'
      },
      {
        question: 'Do you offer coupon codes or promotional discounts?',
        answer: 'Yes! We occasionally offer promotional discounts and coupon codes. When upgrading to Pro, you can enter your promo code during checkout. Follow us on social media to stay updated on special offers and discounts.'
      },
      {
        question: 'Is there a free trial for the Pro plan?',
        answer: 'While we do not offer a separate trial, you can start with our free plan and upgrade to Pro at any time. This lets you test our monitoring capabilities before committing to a paid plan.'
      }
    ]
  },
  {
    title: 'Security & Privacy',
    icon: Shield,
    faqs: [
      {
        question: 'How do you protect my data?',
        answer: 'We use enterprise-grade security including end-to-end encryption, secure data centers, regular security audits, and compliance with GDPR standards. Your monitoring data and personal information are fully protected.'
      },
      {
        question: 'Do you store my website content?',
        answer: 'We only store minimal metadata needed for monitoring (response times, status codes, basic headers). We do not store your website content, user data, or any sensitive information from your sites.'
      },
      {
        question: 'Can I enable two-factor authentication?',
        answer: 'Yes! We strongly recommend enabling two-factor authentication (2FA) for your PingBuoy account. You can use any TOTP authenticator app like Google Authenticator or Authy for enhanced security.'
      },
      {
        question: 'How do you handle website credentials for authenticated monitoring?',
        answer: 'All authentication credentials are encrypted using industry-standard AES-256 encryption and stored in secure, isolated environments. Credentials are only used for monitoring purposes and are never shared or exposed.'
      },
      {
        question: 'Do you share data with third parties?',
        answer: 'We never sell or share your monitoring data with third parties. We may use aggregated, anonymized data for service improvement, but your specific website information remains completely private.'
      },
      {
        question: 'How do I delete my account and data?',
        answer: 'You can permanently delete your account from the Settings page in your dashboard. Look for the "Danger Zone" section and click "Delete Account". This will permanently remove all your data, including monitored websites, uptime history, and account information. This action cannot be undone, so please make sure to export any data you want to keep before deleting your account.'
      }
    ]
  },
  {
    title: 'Technical Support',
    icon: HelpCircle,
    faqs: [
      {
        question: 'What support options are available?',
        answer: 'We provide email support for all users, with priority support for Pro subscribers.'
      },
      {
        question: 'Do you provide API access?',
        answer: 'Yes, Pro plan subscribers get API access to retrieve monitoring data, manage websites, and integrate PingBuoy with other tools and services. Pro users can make up to 10 API calls to PingBuoy endpoints. Complete API documentation is available in your dashboard.'
      },
      {
        question: 'Can I export my monitoring data?',
        answer: 'Absolutely! You can export your uptime statistics, incident reports, and dead link data in CSV or JSON formats. This helps with reporting and ensures you always have access to your historical data.'
      },
      {
        question: 'What if I need help with setup?',
        answer: 'Our setup process is designed to be intuitive, but if you need assistance, our support team is happy to help. Pro subscribers receive priority setup assistance.'
      },
      {
        question: 'Do you have a status page?',
        answer: 'Yes, you can check our system status and any ongoing incidents at our status page, which is linked at the top of the landing page and in the footer of all pages. We maintain 99.9% uptime for our monitoring service and provide transparent communication about any service issues.',
        link: { text: 'system status', url: '/status' }
      }
    ]
  }
]

// Client-side FAQ component for interactivity
function FAQSection() {
  return (
    <>
      {faqCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-12">
          <div className="flex items-center mb-6">
            <category.icon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
          </div>
          
          <div className="space-y-4">
            {category.faqs.map((faq, faqIndex) => (
              <details 
                key={faqIndex}
                className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
                  <h3 className="text-lg font-medium text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown className="h-5 w-5 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 pt-2">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.link ? (
                      <>
                        {faq.answer.split(faq.link.text)[0]}
                        <Link href={faq.link.url} className="text-blue-600 hover:text-blue-800 underline">
                          {faq.link.text}
                        </Link>
                        {faq.answer.split(faq.link.text)[1]}
                      </>
                    ) : (
                      faq.answer
                    )}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPath="/faq" />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Find answers to common questions about PingBuoy website monitoring.
              Cannot find what you are looking for? Feel free to contact our support team.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FAQSection />
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Our support team is here to help. Get in touch and we will respond quickly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button className="bg-[#F97316] text-white hover:bg-white hover:text-[#F97316] border-2 border-[#F97316]">
                Contact Support
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="border-2 border-[#F97316] text-[#F97316] bg-white hover:bg-[#F97316] hover:text-white">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}