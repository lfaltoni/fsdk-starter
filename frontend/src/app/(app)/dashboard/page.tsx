'use client'

import { useAuth } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'

const sections = [
  { name: 'Profile', href: '/profile', desc: 'View and edit your profile' },
  { name: 'MFA', href: '/mfa', desc: 'Multi-factor authentication settings' },
  { name: 'Reviews', href: '/reviews', desc: 'Browse and write reviews' },
  { name: 'Media', href: '/media', desc: 'Upload and manage files' },
]

const adminSections = [
  { name: 'Users', href: '/users', desc: 'Manage platform users' },
  { name: 'Audit Log', href: '/audit', desc: 'View system activity' },
  { name: 'Invites', href: '/invites', desc: 'Manage platform invites' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.platform_role === 'super_admin'

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.first_name || 'User'}`} subtitle="FSDK Starter Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition"
          >
            <h2 className="font-semibold text-gray-900">{s.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <>
          <h2 className="mt-10 mb-4 text-lg font-semibold text-gray-900">Admin</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adminSections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 hover:border-indigo-400 hover:shadow-sm transition"
              >
                <h2 className="font-semibold text-indigo-900">{s.name}</h2>
                <p className="mt-1 text-sm text-indigo-600">{s.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
