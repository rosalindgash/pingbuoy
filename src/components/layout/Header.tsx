'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

interface HeaderProps {
  currentPath?: string
}

export function Header({ currentPath }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getNavLinkClass = (path: string) => {
    const isActive = currentPath === path
    return `relative text-[#111827]/60 hover:text-[#111827] transition-colors ${
      isActive ? 'text-[#111827] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#F97316]' : ''
    }`
  }

  const getMobileNavLinkClass = (path: string) => {
    const isActive = currentPath === path
    return `block px-3 py-2 text-base font-medium ${
      isActive ? 'text-[#F97316]' : 'text-[#111827]/60'
    } hover:text-[#111827]`
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/ping-buoy-header-logo.png"
                alt="PingBuoy"
                width={254}
                height={68}
                className="h-10 w-auto sm:h-12 md:h-16"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link href="/pricing" className={getNavLinkClass('/pricing')}>
              Pricing
            </Link>
            <Link href="/faq" className={getNavLinkClass('/faq')}>
              FAQ
            </Link>
            <Link href="/contact" className={getNavLinkClass('/contact')}>
              Contact
            </Link>
            <Link href="/status" className={getNavLinkClass('/status')}>
              Status
            </Link>
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-[#111827] hover:text-[#F97316] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#F97316]"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/pricing" className={getMobileNavLinkClass('/pricing')}>
              Pricing
            </Link>
            <Link href="/faq" className={getMobileNavLinkClass('/faq')}>
              FAQ
            </Link>
            <Link href="/contact" className={getMobileNavLinkClass('/contact')}>
              Contact
            </Link>
            <Link href="/status" className={getMobileNavLinkClass('/status')}>
              Status
            </Link>
            <div className="px-3 py-2 space-y-2">
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
              <Link href="/signup" className="block">
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}