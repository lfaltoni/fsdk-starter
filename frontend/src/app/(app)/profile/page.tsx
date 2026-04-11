'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useAccount } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import FormField from '@/components/FormField'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ProfilePage() {
  const { user, profile, isLoading, error, updateProfile, refreshProfile, clearAllErrors } = useAccount()
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    refreshProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    try {
      await updateProfile({ ...profile, bio, phone })
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
          <div className="space-y-2 mb-6">
            <p className="text-sm text-gray-500">Email: <span className="font-medium text-gray-900">{user?.email}</span></p>
            <p className="text-sm text-gray-500">Name: <span className="font-medium text-gray-900">{user?.first_name} {user?.last_name}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
            />
            <FormField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
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
