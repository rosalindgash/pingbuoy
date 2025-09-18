import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  currentPath?: string
}

export function Header({ currentPath }: HeaderProps) {
  const getNavLinkClass = (path: string) => {
    const isActive = currentPath === path
    return `relative text-[#111827]/60 hover:text-[#111827] transition-colors ${
      isActive ? 'text-[#111827] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#F97316]' : ''
    }`
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
                width={150}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>
          <div className="flex items-center space-x-4">
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
        </div>
      </div>
    </nav>
  )
}