'use client'

import Link from 'next/link'
import { useAuth } from 'fsdk-ts'

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth()
  const isAdmin = user?.platform_role === 'super_admin'
  const billingEnabled = typeof window !== 'undefined' && (window as any).__ENABLE_BILLING__ === 'true'

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold text-gray-900">
              FSDK Starter
            </Link>

            {isAuthenticated && (
              <>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link href="/profile" className="text-sm text-gray-600 hover:text-gray-900">Profile</Link>
                <Link href="/mfa" className="text-sm text-gray-600 hover:text-gray-900">MFA</Link>
                <Link href="/reviews" className="text-sm text-gray-600 hover:text-gray-900">Reviews</Link>
                <Link href="/media" className="text-sm text-gray-600 hover:text-gray-900">Media</Link>
                {billingEnabled && (
                  <Link href="/billing" className="text-sm text-gray-600 hover:text-gray-900">Billing</Link>
                )}
              </>
            )}

            {isAdmin && (
              <>
                <span className="text-gray-300">|</span>
                <Link href="/users" className="text-sm text-indigo-600 hover:text-indigo-800">Users</Link>
                <Link href="/audit" className="text-sm text-indigo-600 hover:text-indigo-800">Audit</Link>
                <Link href="/invites" className="text-sm text-indigo-600 hover:text-indigo-800">Invites</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-500">{user?.email}</span>
                <button
                  onClick={() => logout()}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Login</Link>
                <Link href="/register" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
