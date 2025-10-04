'use client'

import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  BarChart3,
  AlertTriangle,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    // Random time between 30-45 seconds (30000-45000ms)
    const timeout = Math.floor(Math.random() * 15000) + 30000
    
    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, timeout)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-white">
      <Header currentPath="/" />

      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-[#111827] sm:text-5xl md:text-6xl">
                  Never let your site sink again.
                </h1>
                <p className="mt-3 text-base text-[#111827]/70 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Simple, affordable website monitoring for solopreneurs and small businesses. Get the insights you need without enterprise complexity or costs.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link href="/signup">
                      <Button size="lg" className="bg-[#F97316] text-white hover:bg-white hover:text-[#F97316] border-2 border-[#F97316] w-full flex items-center justify-center px-8 py-3 text-base">
                        Get Started for Free
                        <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link href="/pricing">
                      <Button variant="outline" size="lg" className="border-2 border-[#F97316] text-[#F97316] bg-white hover:bg-[#F97316] hover:text-white w-full flex items-center justify-center px-8 py-3 text-base">
                        View Pricing
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <Image
              src="/buoy.png"
              alt="PingBuoy"
              width={300}
              height={300}
              className={`max-w-full max-h-full object-contain ${isAnimating ? 'buoy-bobbing' : ''}`}
              priority
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-[#F3F4F6]" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-[#1E3A8A] font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-[#111827] sm:text-4xl">
              Essential monitoring without the enterprise price tag
            </p>
            <p className="mt-4 max-w-2xl text-xl text-[#111827]/70 lg:mx-auto">
              Powerful tools designed for indie makers, freelancers, and growing teams who need reliable monitoring on a budget
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#1E3A8A] text-white mx-auto mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-[#111827] mb-2">Uptime Monitoring</h3>
                <p className="text-base text-[#111827]/70">
                  Keep your websites online and ensure they're always accessible to your visitors with reliable uptime monitoring.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#1E3A8A] text-white mx-auto mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-[#111827] mb-2">Page Speed Monitoring</h3>
                <p className="text-base text-[#111827]/70">
                  Track your website's performance and loading speed to provide the best user experience and improve search rankings.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#1E3A8A] text-white mx-auto mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-[#111827] mb-2">SSL & API Monitoring</h3>
                <p className="text-base text-[#111827]/70">
                  Keep your SSL certificates up to date and monitor critical endpoints like payments to ensure secure, uninterrupted service.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#1E3A8A] text-white mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-[#111827] mb-2">Smart Alerts & Reports</h3>
                <p className="text-base text-[#111827]/70">
                  Get instant notifications via email, Slack, Discord, or webhooks when issues are detected, plus detailed reports to track your site's health.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value Proposition Section */}
      <div className="bg-[#1E3A8A]">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Why choose PingBuoy?
            </h2>
            <p className="mt-3 text-xl text-[#F97316] sm:mt-4">
              Built for solopreneurs and small businesses who need professional monitoring without the enterprise overhead
            </p>
          </div>
          <dl className="mt-10 text-center sm:max-w-3xl sm:mx-auto sm:grid sm:grid-cols-3 sm:gap-8">
            <div className="flex flex-col">
              <dt className="order-2 mt-2 text-lg leading-6 font-medium text-white/70">
                Setup Time
              </dt>
              <dd className="order-1 text-5xl font-extrabold text-white">2 min</dd>
            </div>
            <div className="flex flex-col mt-10 sm:mt-0">
              <dt className="order-2 mt-2 text-lg leading-6 font-medium text-white/70">
                Monitoring Accuracy Goal
              </dt>
              <dd className="order-1 text-5xl font-extrabold text-white">99.9%</dd>
            </div>
            <div className="flex flex-col mt-10 sm:mt-0">
              <dt className="order-2 mt-2 text-lg leading-6 font-medium text-white/70">
                Free Plan Sites
              </dt>
              <dd className="order-1 text-5xl font-extrabold text-white">2</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Testimonial CTA Section */}
      <div className="bg-white py-16 lg:py-24">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative py-24 px-8 bg-[#1E3A8A] rounded-xl shadow-2xl overflow-hidden lg:px-16 text-center">
            <div className="absolute inset-0 opacity-50 filter saturate-0 mix-blend-multiply">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A8A] to-[#F97316]"></div>
            </div>
            <div className="relative">
              <div className="flex justify-center space-x-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[#F97316] fill-current" />
                ))}
              </div>
              <h3 className="text-2xl font-bold text-white sm:text-3xl mb-4">
                Share Your PingBuoy Success Story
              </h3>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Has PingBuoy helped your business stay online? We&apos;d love to feature your positive experience and help other customers discover our service.
              </p>
              <div className="space-y-4">
                <a 
                  // eslint-disable-next-line no-secrets/no-secrets
                  href="mailto:testimonials@pingbuoy.com?subject=My PingBuoy Success Story"
                  className="inline-flex items-center px-6 py-3 text-lg font-medium text-[#1E3A8A] bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Contact testimonials@pingbuoy.com
                </a>
                <p className="text-sm text-white/70">
                  Tell us how PingBuoy has made a difference for your website monitoring
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#F3F4F6]">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl">
            <span className="block">Ready to monitor your websites?</span>
            <span className="block text-[#F97316]">Get started with our free plan.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link href="/signup">
                <Button size="lg" className="bg-[#F97316] text-white hover:bg-white hover:text-[#F97316] border-2 border-[#F97316] px-8 py-3">
                  Get Started Free
                </Button>
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="border-2 border-[#F97316] text-[#F97316] bg-white hover:bg-[#F97316] hover:text-white px-8 py-3">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
