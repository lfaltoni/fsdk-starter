'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useAccount } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import FormField from '@/components/FormField'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ProfilePage() {
  const { user, profile, isLoading, error, updateUser, refreshUser, clearAllErrors } = useAccount()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
    }
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    try {
      await updateUser({ first_name: firstName, last_name: lastName })
      setSuccess(true)
    } catch {
      // error set by hook
    } finally {
      setSaving(false)
    }
  }

  if (isLoading && !user) return <LoadingSpinner className="mt-16" />

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account information" />

      <div className="max-w-md space-y-6">
        <ErrorMessage error={error} onDismiss={clearAllErrors} />

        {success && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">Profile updated.</div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500 mb-4">Email: <span className="font-medium text-gray-900">{user?.email}</span></p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <FormField
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
