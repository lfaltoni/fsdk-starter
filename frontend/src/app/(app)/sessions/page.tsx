'use client'

import { useState } from 'react'
import { useSessions } from 'fsdk-ts'
import type { Session } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

function formatWhen(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function deviceLabel(s: Session): string {
  const parts = [s.browser, s.os].filter(Boolean)
  if (parts.length) return parts.join(' on ')
  return s.device || 'Unknown device'
}

export default function SessionsPage() {
  const { sessions, isLoading, error, clearError, revoke, revokeAll } = useSessions()

  const [busySid, setBusySid] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  const handleRevoke = async (sid: string) => {
    setBusySid(sid)
    try {
      await revoke(sid)
    } catch {
      // error set by hook
    } finally {
      setBusySid(null)
    }
  }

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    try {
      // Default: log out everywhere *else*, keep this device signed in.
      await revokeAll()
    } catch {
      // error set by hook
    } finally {
      setRevokingAll(false)
    }
  }

  if (isLoading) return <LoadingSpinner className="mt-16" />

  const hasOthers = sessions.some((s) => !s.is_current)

  return (
    <div>
      <PageHeader
        title="Active Sessions"
        subtitle="Devices and browsers currently signed in to your account"
      />

      <div className="max-w-3xl space-y-6">
        <ErrorMessage error={error} onDismiss={clearError} />

        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No active sessions found.</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => (
              <div
                key={s.sid}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {deviceLabel(s)}
                      </span>
                      {s.is_current && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {s.location || 'Unknown location'}
                      {s.ip_address ? ` · ${s.ip_address}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      Last active {formatWhen(s.last_seen_at)}
                    </p>
                  </div>

                  {!s.is_current && (
                    <button
                      onClick={() => handleRevoke(s.sid)}
                      disabled={busySid === s.sid}
                      className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busySid === s.sid ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasOthers && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">Log out everywhere</h2>
                <p className="text-sm text-gray-500">
                  Sign out of all other devices. This device stays signed in.
                </p>
              </div>
              <button
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="shrink-0 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {revokingAll ? 'Signing out...' : 'Log out everywhere'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
