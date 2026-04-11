'use client'

import { Suspense, useState, FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { usePasswordReset } from 'fsdk-ts'
import FormField from '@/components/FormField'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const { confirmReset, isLoading, error, success, clearError } = usePasswordReset()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) {
      setLocalError('Passwords do not match')
      return
    }
    if (!token) {
      setLocalError('Missing reset token')
      return
    }
    await confirmReset(token, password)
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold">New password</h1>
      </div>

      <ErrorMessage error={error || localError} onDismiss={() => { clearError(); setLocalError(null) }} />

      {success ? (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
            Password reset successfully.
          </div>
          <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">
            Sign in with your new password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
          />
          <FormField
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<LoadingSpinner />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
