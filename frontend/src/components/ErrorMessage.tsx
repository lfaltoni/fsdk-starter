'use client'

interface ErrorMessageProps {
  error: string | null
  onDismiss?: () => void
}

export default function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
  if (!error) return null
  return (
    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
      <span>{error}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-4 text-red-500 hover:text-red-700 font-bold">
          &times;
        </button>
      )}
    </div>
  )
}
