'use client'

interface PaginationProps {
  page: number
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

export default function Pagination({ page, hasNext, onPrev, onNext }: PaginationProps) {
  return (
    <div className="flex items-center justify-between pt-4">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-gray-500">Page {page}</span>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  )
}
