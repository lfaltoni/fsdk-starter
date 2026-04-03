'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { usePasswordReset } from 'frontend-lib'
import FormField from '@/components/FormField'
import ErrorMessage from '@/components/ErrorMessage'

export default function ForgotPasswordPage() {
  const { requestReset, isLoading, error, success, clearError } = usePasswordReset()
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await requestReset(email)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="mt-1 text-sm text-gray-500">We&apos;ll send you a reset link</p>
        </div>

        <ErrorMessage error={error} onDismiss={clearError} />

        {success ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
            Check your email for a password reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
