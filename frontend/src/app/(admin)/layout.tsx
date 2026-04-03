'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from 'frontend-lib'
import NavBar from '@/components/NavBar'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login')
      } else if (user?.platform_role !== 'super_admin') {
        router.replace('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

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
