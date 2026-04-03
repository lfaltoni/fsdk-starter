'use client'

import { useState, FormEvent } from 'react'
import { useReviews, useAuth } from 'frontend-lib'
import PageHeader from '@/components/PageHeader'
import FormField from '@/components/FormField'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'
import Pagination from '@/components/Pagination'

// Demo target — reviews are polymorphic, so we use a synthetic entity
const TARGET_TABLE = 'demo_items'
const TARGET_ID = 'demo-1'
const PER_PAGE = 10

export default function ReviewsPage() {
  const { user } = useAuth()
  const {
    reviews, stats, total, isLoading, isSubmitting, error, page, isEmpty,
    setPage, createReview, toggleHelpful, refetch, clearError,
  } = useReviews(TARGET_TABLE, TARGET_ID, PER_PAGE)

  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')

  const totalPages = Math.ceil(total / PER_PAGE)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await createReview({ rating, title, comment })
      setTitle('')
      setComment('')
      setRating(5)
    } catch {
      // error set by hook
    }
  }

  return (
    <div>
      <PageHeader title="Reviews" subtitle={`Demo reviews for ${TARGET_TABLE}/${TARGET_ID}`} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Stats */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Stats</h2>
            {stats ? (
              <>
                <p className="text-3xl font-bold text-gray-900">{stats.averageRating?.toFixed(1) || '—'}</p>
                <p className="text-sm text-gray-500">{stats.totalReviews || 0} reviews</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No stats yet</p>
            )}
          </div>

          {/* Write review */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Write a review</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} star{r !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <FormField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit review'}
              </button>
            </form>
          </div>
        </div>

        {/* Review list */}
        <div className="lg:col-span-2 space-y-4">
          <ErrorMessage error={error} onDismiss={clearError} />

          {isLoading ? (
            <LoadingSpinner />
          ) : isEmpty ? (
            <p className="text-sm text-gray-400">No reviews yet. Be the first!</p>
          ) : (
            <>
              {reviews.map((review) => (
                <div key={review.reviewId} className="rounded-lg border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{review.title}</span>
                      <span className="ml-2 text-xs text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    </div>
                    <button
                      onClick={() => toggleHelpful(review.reviewId)}
                      className="text-xs text-gray-400 hover:text-blue-600"
                    >
                      Helpful ({review.helpfulCount ?? 0})
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{review.comment}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    by {review.reviewerName || 'Anonymous'}
                  </p>
                </div>
              ))}
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  hasNext={page < totalPages}
                  onPrev={() => setPage(page - 1)}
                  onNext={() => setPage(page + 1)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
