'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAdmin } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import DataTable from '@/components/DataTable'
import Pagination from '@/components/Pagination'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function UsersPage() {
  const { users, meta, isLoading, error, listUsers, clearError } = useAdmin()
  const [page, setPage] = useState(1)

  useEffect(() => {
    listUsers({ page, per_page: 20 })
  }, [page, listUsers])

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage platform users" />
      <ErrorMessage error={error} onDismiss={clearError} />

      {isLoading && !users.length ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            headers={['Name', 'Email', 'Role', 'Status', '']}
            rows={users.map((u: any) => [
              `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—',
              u.email,
              u.platform_role || 'user',
              u.is_active !== false ? 'Active' : 'Disabled',
              <Link key={u.user_id} href={`/users/${u.user_id}`} className="text-blue-600 hover:underline text-xs">
                View
              </Link>,
            ])}
            emptyMessage="No users found"
          />
          <Pagination
            page={page}
            hasNext={meta?.has_next ?? false}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  )
}
