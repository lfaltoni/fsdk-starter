'use client'

import { useBilling } from 'fsdk-ts'
import NavBar from '@/components/NavBar'
import PageHeader from '@/components/PageHeader'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function BillingPage() {
  const { subscription, plans, isLoading, error, checkout, manageSubscription, clearError } = useBilling()

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Billing" subtitle="Manage your subscription" />

        <ErrorMessage error={error} onDismiss={clearError} />

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="max-w-lg space-y-6">
            {/* Current subscription */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Current Plan</h2>
              {subscription ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-500">Plan:</span>{' '}
                    <span className="font-medium">{(subscription as any).plan_name || 'Active'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500">Status:</span>{' '}
                    <span className="font-medium">{(subscription as any).status || 'active'}</span>
                  </p>
                  <button
                    onClick={() => manageSubscription()}
                    className="mt-3 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Manage subscription
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No active subscription</p>
              )}
            </div>

            {/* Plans */}
            {plans && (plans as any[]).length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-gray-900">Available Plans</h2>
                {(plans as any[]).map((plan: any) => (
                  <div key={plan.id || plan.price_id} className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">{plan.description || ''}</p>
                    </div>
                    <button
                      onClick={() => checkout(plan.price_id || plan.id)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Subscribe
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
