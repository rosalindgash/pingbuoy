import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src="/ping-buoy-header-logo.png"
                alt="PingBuoy"
                width={150}
                height={40}
                className="h-10 w-auto mb-4 hover:opacity-80 transition-opacity"
              />
            </Link>
            <p className="text-gray-600 max-w-md">
              Reliable website monitoring and uptime tracking to keep your online presence strong.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-2 text-gray-600">
              <li><Link href="/pricing" className="hover:text-gray-900">Pricing</Link></li>
              <li><Link href="/faq" className="hover:text-gray-900">FAQ</Link></li>
              <li><Link href="/status" className="hover:text-gray-900">Status</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2 text-gray-600">
              <li><Link href="/contact" className="hover:text-gray-900">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900">Terms</Link></li>
              <li><Link href="/cookies" className="hover:text-gray-900">Cookies</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            &copy; 2025 PingBuoy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}