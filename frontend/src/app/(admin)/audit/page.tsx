'use client'

import { useState, FormEvent } from 'react'
import { useAudit } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import FormField from '@/components/FormField'
import Pagination from '@/components/Pagination'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

function ChangeBadge({ before, after }: { before: unknown; after: unknown }) {
  const fmt = (v: unknown) => (v === null || v === undefined ? 'null' : String(v))
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through">{fmt(before)}</span>
      <span className="text-gray-400">&rarr;</span>
      <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">{fmt(after)}</span>
    </span>
  )
}

export default function AuditPage() {
  const { entries, meta, isLoading, error, query, clearError } = useAudit()
  const [action, setAction] = useState('')
  const [actorId, setActorId] = useState('')
  const [page, setPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    setExpandedRow(null)
    query({
      ...(action && { action }),
      ...(actorId && { actor_id: actorId }),
      page: 1,
      per_page: 25,
    })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setExpandedRow(null)
    query({
      ...(action && { action }),
      ...(actorId && { actor_id: actorId }),
      page: newPage,
      per_page: 25,
    })
  }

  const getChanges = (entry: any): Record<string, { before: unknown; after: unknown }> | null => {
    return entry.extra_data?.changes || null
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
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Time', 'Action', 'Actor', 'Entity', 'IP', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {(entries || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">
                      No audit entries. Run a search to load data.
                    </td>
                  </tr>
                ) : (
                  (entries || []).map((entry: any, i: number) => {
                    const changes = getChanges(entry)
                    const isExpanded = expandedRow === i
                    const hasDetails = changes || entry.extra_data
                    return (
                      <>
                        <tr key={entry.entry_id || i} className={`hover:bg-gray-50 ${hasDetails ? 'cursor-pointer' : ''}`} onClick={() => hasDetails && setExpandedRow(isExpanded ? null : i)}>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800">
                              {entry.action || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {entry.actor_label || entry.actor_id || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {entry.entity_label || entry.entity_id || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {entry.ip_address || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {hasDetails && (
                              <span className={`text-xs ${changes ? 'text-blue-600' : 'text-gray-400'}`}>
                                {isExpanded ? 'Hide' : changes ? 'Details' : 'JSON'}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${entry.entry_id || i}-detail`} className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3">
                              {changes ? (
                                <div className="space-y-1">
                                  {Object.entries(changes).map(([field, { before, after }]) => (
                                    <div key={field} className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-600 w-28">{field}</span>
                                      <ChangeBadge before={before} after={after} />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <pre className="text-xs text-gray-600 overflow-x-auto">
                                  {JSON.stringify(entry.extra_data, null, 2)}
                                </pre>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
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
