'use client'

import { useRouter } from 'next/navigation'
import { useRequireAuth } from 'fsdk-ts'
import NavBar from '@/components/NavBar'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Centralized guard: gates on authResolved (not the action-feedback isLoading),
  // so a valid-but-unrevalidated session is not kicked to /login on first paint.
  const { isAuthenticated, isLoading } = useRequireAuth({
    onUnauthenticated: () => router.replace('/login'),
  })

  if (isLoading) return <LoadingSpinner className="mt-32" />
  if (!isAuthenticated) return null

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  )
}
