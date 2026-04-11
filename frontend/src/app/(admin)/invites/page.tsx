'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useInvites } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import FormField from '@/components/FormField'
import DataTable from '@/components/DataTable'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function InvitesPage() {
  const {
    invites, isLoading, isSubmitting, error,
    create, listAll, listPending, revoke, clearError,
  } = useInvites()

  const [email, setEmail] = useState('')
  const [tab, setTab] = useState<'all' | 'pending'>('all')

  useEffect(() => {
    tab === 'all' ? listAll() : listPending()
  }, [tab, listAll, listPending])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    await create({ email })
    setEmail('')
    tab === 'all' ? listAll() : listPending()
  }

  const handleRevoke = async (inviteId: string) => {
    await revoke(inviteId)
  }

  return (
    <div>
      <PageHeader title="Platform Invites" subtitle="Manage invite codes" />

      <ErrorMessage error={error} onDismiss={clearError} />

      {/* Create invite */}
      <form onSubmit={handleCreate} className="mb-6 flex items-end gap-3">
        <FormField
          label="Invite email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create invite'}
        </button>
      </form>

      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-gray-200">
        {(['all', 'pending'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'all' ? 'All' : 'Pending'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          headers={['Email', 'Token', 'Status', 'Created', '']}
          rows={(invites || []).map((inv: any) => [
            inv.email || '—',
            <code key="token" className="text-xs bg-gray-100 px-1 py-0.5 rounded">{inv.token?.slice(0, 12)}...</code>,
            inv.status || '—',
            inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—',
            inv.status === 'pending' ? (
              <button
                key="revoke"
                onClick={() => handleRevoke(inv.invite_id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Revoke
              </button>
            ) : null,
          ])}
          emptyMessage="No invites"
        />
      )}
    </div>
  )
}
