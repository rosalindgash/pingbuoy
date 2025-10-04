'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  AlertTriangle,
  Shield,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@supabase/ssr'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Uptime', href: '/dashboard/uptime', icon: BarChart3 },
  { name: 'Dead Links', href: '/dashboard/dead-links', icon: AlertTriangle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Privacy', href: '/dashboard/privacy', icon: Shield },
]

const founderOnlyNav = [
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Incidents', href: '/admin/incidents', icon: AlertCircle },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/user/is-admin', {
          credentials: 'include'
        })

        if (response.ok) {
          const { isAdmin: adminStatus } = await response.json()
          setIsAdmin(adminStatus)
        }
      } catch (err) {
        console.error('Admin check failed:', err)
        setIsAdmin(false)
      }
    }
    checkAdminStatus()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center">
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
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'border-[#1E3A8A] text-[#111827]'
                        : 'border-transparent text-[#111827]/60 hover:border-[#111827]/30 hover:text-[#111827]'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
              {isAdmin && founderOnlyNav.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'border-[#F97316] text-[#F97316]'
                        : 'border-transparent text-[#F97316]/60 hover:border-[#F97316]/30 hover:text-[#F97316]'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>

          <div className="sm:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-[#1E3A8A]/10 border-[#1E3A8A] text-[#1E3A8A]'
                      : 'border-transparent text-[#111827]/60 hover:bg-[#F3F4F6] hover:border-[#111827]/30 hover:text-[#111827]'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-4 h-4 mr-2 inline" />
                  {item.name}
                </Link>
              )
            })}
            {isAdmin && founderOnlyNav.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-[#F97316]/10 border-[#F97316] text-[#F97316]'
                      : 'border-transparent text-[#F97316]/60 hover:bg-[#F3F4F6] hover:border-[#F97316]/30 hover:text-[#F97316]'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-4 h-4 mr-2 inline" />
                  {item.name}
                </Link>
              )
            })}
            <button
              onClick={handleSignOut}
              className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-[#111827]/60 hover:bg-[#F3F4F6] hover:border-[#111827]/30 hover:text-[#111827] text-base font-medium"
            >
              <LogOut className="w-4 h-4 mr-2 inline" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}