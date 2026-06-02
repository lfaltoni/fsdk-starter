'use client'

import { useState, FormEvent } from 'react'
import { useMfa, useAuth } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import FormField from '@/components/FormField'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function MfaPage() {
  const { user } = useAuth()
  const {
    enrolled, isLoading, isSubmitting, error,
    beginEnrollment, confirmEnrollment, unenroll,
    sendChallenge, verifyChallenge, clearError,
  } = useMfa()

  const [code, setCode] = useState('')
  const [step, setStep] = useState<'idle' | 'enrolling' | 'verifying'>('idle')

  const handleBeginEnroll = async () => {
    if (!user?.email) return
    const result = await beginEnrollment(user.email)
    if (result) setStep('enrolling')
  }

  const handleConfirmEnroll = async (e: FormEvent) => {
    e.preventDefault()
    const result = await confirmEnrollment(code)
    if (result) {
      setStep('idle')
      setCode('')
    }
  }

  const handleUnenroll = async () => {
    await unenroll()
    setStep('idle')
  }

  if (isLoading) return <LoadingSpinner className="mt-16" />

  return (
    <div>
      <PageHeader title="Multi-Factor Authentication" subtitle="Add an extra layer of security to your account" />

      <div className="max-w-md space-y-6">
        {error && (error.includes('404') || error.includes('Not Found') || error.includes('not configured') || error.includes('Failed to load MFA status')) ? (
          <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
            MFA is not enabled on this server. Set <code className="bg-yellow-100 px-1 rounded">MFA_HMAC_KEY</code> in your backend <code className="bg-yellow-100 px-1 rounded">.env</code> to enable it.
          </div>
        ) : (
          <ErrorMessage error={error} onDismiss={clearError} />
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">MFA Status</span>
            <span className={`text-sm font-semibold ${enrolled ? 'text-green-600' : 'text-gray-400'}`}>
              {enrolled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {!enrolled && step === 'idle' && (
            <button
              onClick={handleBeginEnroll}
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Starting...' : 'Enable MFA'}
            </button>
          )}

          {step === 'enrolling' && (
            <form onSubmit={handleConfirmEnroll} className="space-y-4">
              <p className="text-sm text-gray-600">A verification code has been sent to your email. Enter it below to confirm enrollment.</p>
              <FormField
                label="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                placeholder="123456"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Confirm enrollment'}
              </button>
            </form>
          )}

          {enrolled && step === 'idle' && (
            <button
              onClick={handleUnenroll}
              disabled={isSubmitting}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Disabling...' : 'Disable MFA'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
