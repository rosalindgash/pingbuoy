import SignupForm from '@/components/auth/SignupForm'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <Link href="/" className="text-sm text-[#F97316] hover:text-[#F97316]/80 mb-4 inline-block">
            ← Back to PingBuoy
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start monitoring your websites for free
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}