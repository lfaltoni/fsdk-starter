'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useRequireAuth } from 'fsdk-ts'
import NavBar from '@/components/NavBar'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // useRequireAuth owns the authenticated/unauthenticated redirect (gated on
  // authResolved). The super_admin role gate is app-specific, so it stays here,
  // layered on top of the guard's resolved state via useAuth().user.
  const { user } = useAuth()
  const { isAuthenticated, isLoading } = useRequireAuth({
    onUnauthenticated: () => router.replace('/login'),
  })

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.platform_role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) return <LoadingSpinner className="mt-32" />
  if (!isAuthenticated || user?.platform_role !== 'super_admin') return null

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  )
}
