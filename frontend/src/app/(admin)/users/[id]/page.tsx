'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAdmin } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { selectedUser, isLoading, isSubmitting, error, getUserDetail, setAccountStatus, resendMfa, clearError } = useAdmin()

  useEffect(() => {
    if (id) getUserDetail(id)
  }, [id, getUserDetail])

  const user = selectedUser as any

  if (isLoading && !user) return <LoadingSpinner className="mt-16" />

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 text-sm text-blue-600 hover:underline">&larr; Back</button>

      <PageHeader title={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'User'} />

      <ErrorMessage error={error} onDismiss={clearError} />

      {user && (
        <div className="max-w-lg space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
            <Row label="Email" value={user.email} />
            <Row label="User ID" value={user.user_id} />
            <Row label="Role" value={user.platform_role || 'user'} />
            <Row label="Status" value={user.is_active !== false ? 'Active' : 'Disabled'} />
            <Row label="Created" value={user.created_at || '—'} />
            {user.mfa_enrolled !== undefined && (
              <Row label="MFA" value={user.mfa_enrolled ? 'Enrolled' : 'Not enrolled'} />
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAccountStatus(user.user_id, !user.is_active)}
              disabled={isSubmitting}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                user.is_active !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {user.is_active !== false ? 'Disable account' : 'Enable account'}
            </button>
            <button
              onClick={() => resendMfa(user.user_id)}
              disabled={isSubmitting}
              className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Resend MFA
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
