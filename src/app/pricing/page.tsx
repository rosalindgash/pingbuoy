import { PLANS, PRICE_IDS } from '@/lib/stripe'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CheckoutButton from '@/components/billing/CheckoutButton'
import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import BetaPromoBadge from '@/components/BetaPromoBadge'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPath="/pricing" />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Pricing Plans
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Simple, transparent pricing. Choose the plan that's right for your monitoring needs.
            </p>
          </div>
        </div>
      </section>

      <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {/* Free Plan */}
          <div className="border border-white/20 bg-white rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-[#111827]">
                {PLANS.FREE.name}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-[#111827]">
                  ${PLANS.FREE.price}
                </span>
                <span className="text-base font-medium text-[#111827]/60">/mo</span>
              </div>
              <p className="mt-4 text-sm text-[#111827]/70">
                Perfect for hobbyists, solo founders, and early projects needing basic monitoring
              </p>
            </div>
            <div className="pt-6 pb-8 px-6">
              <h4 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                What&apos;s included
              </h4>
              <ul className="mt-6 space-y-4">
                {PLANS.FREE.features.map((feature) => (
                  <li key={feature} className="flex space-x-3">
                    {feature.startsWith('No ') ? (
                      <X className="flex-shrink-0 h-5 w-5 text-red-500" />
                    ) : (
                      <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                    )}
                    <span className="text-sm text-gray-500">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link href="/signup">
                  <Button className="bg-[#F97316] text-white hover:bg-white hover:text-[#F97316] border-2 border-[#F97316] w-full">
                    Get Started for Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-[#F97316] bg-white rounded-lg shadow-sm divide-y divide-gray-200 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-[#F97316] text-white">
                Most Popular
              </span>
            </div>
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-[#111827]">
                {PLANS.PRO.name}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-[#111827]">
                  ${PLANS.PRO.price}
                </span>
                <span className="text-base font-medium text-[#111827]/60">/mo</span>
              </div>
              <p className="mt-4 text-sm text-[#111827]/70">
                Advanced monitoring for small businesses, SaaS founders, and agencies with modest portfolios
              </p>
            </div>
            <div className="pt-6 pb-8 px-6">
              <BetaPromoBadge />

              <h4 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                What&apos;s included
              </h4>
              <ul className="mt-6 space-y-4">
                {PLANS.PRO.features.map((feature) => (
                  <li key={feature} className="flex space-x-3">
                    <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-500">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CheckoutButton 
                  priceId={PRICE_IDS.PRO_MONTHLY} 
                  planName="Pro" 
                />
              </div>
            </div>
          </div>

        </div>

        <div className="mt-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Both plans include
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">24/7</div>
              <div className="text-sm text-gray-500">Continuous uptime monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Fast</div>
              <div className="text-sm text-gray-500">Reliable notifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Public</div>
              <div className="text-sm text-gray-500">Status pages</div>
            </div>
          </div>
        </div>

      </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}