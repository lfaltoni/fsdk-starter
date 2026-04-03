'use client'

import { useState, FormEvent } from 'react'
import { useAudit } from 'frontend-lib'
import PageHeader from '@/components/PageHeader'
import FormField from '@/components/FormField'
import DataTable from '@/components/DataTable'
import Pagination from '@/components/Pagination'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AuditPage() {
  const { entries, meta, isLoading, error, query, clearError } = useAudit()
  const [action, setAction] = useState('')
  const [actorId, setActorId] = useState('')
  const [page, setPage] = useState(1)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    query({
      ...(action && { action }),
      ...(actorId && { actor_id: actorId }),
      page: 1,
      per_page: 25,
    })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    query({
      ...(action && { action }),
      ...(actorId && { actor_id: actorId }),
      page: newPage,
      per_page: 25,
    })
  }

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="View system activity" />

      <ErrorMessage error={error} onDismiss={clearError} />

      <form onSubmit={handleSearch} className="mb-6 flex items-end gap-3">
        <FormField label="Action" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. auth.login" />
        <FormField label="Actor ID" value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="user ID" />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            headers={['Time', 'Action', 'Actor', 'Entity', 'IP']}
            rows={(entries || []).map((e: any) => [
              e.created_at ? new Date(e.created_at).toLocaleString() : '—',
              e.action || '—',
              e.actor_label || e.actor_id || '—',
              e.entity_label || e.entity_id || '—',
              e.ip_address || '—',
            ])}
            emptyMessage="No audit entries. Run a search to load data."
          />
          {entries.length > 0 && (
            <Pagination
              page={page}
              hasNext={meta?.has_next ?? false}
              onPrev={() => handlePageChange(Math.max(1, page - 1))}
              onNext={() => handlePageChange(page + 1)}
            />
          )}
        </>
      )}
    </div>
  )
}
