'use client'

import { useState, useEffect, useRef } from 'react'
import { mediaApi, useAuth } from 'fsdk-ts'
import type { MediaItem } from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

const ENTITY_TYPE = 'demo_items'
const ENTITY_ID = 'demo-1'

export default function MediaPage() {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMedia = async () => {
    setIsLoading(true)
    try {
      const gallery = await mediaApi.getGallery(ENTITY_TYPE, ENTITY_ID)
      setItems(gallery.items || gallery)
    } catch (e: any) {
      // 404 means no media yet — not an error
      if (e.status === 404 || e.message?.includes('404')) {
        setItems([])
      } else {
        setError(e.message || 'Failed to load media')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await mediaApi.upload(file, ENTITY_TYPE, ENTITY_ID)
      loadMedia()
      if (fileRef.current) fileRef.current.value = ''
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (mediaId: string) => {
    try {
      await mediaApi.delete(mediaId)
      setItems(items.filter((i) => (i as any).media_id !== mediaId && (i as any).mediaId !== mediaId))
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader title="Media" subtitle={`Files for ${ENTITY_TYPE}/${ENTITY_ID}`} />

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      <div className="mb-6 flex items-center gap-3">
        <input ref={fileRef} type="file" className="text-sm" />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">No media uploaded yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item: any) => {
            const id = item.media_id || item.mediaId
            const url = item.url || item.file_url
            return (
              <div key={id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                {url && (
                  <img src={url} alt={item.filename || 'media'} className="h-40 w-full object-cover" />
                )}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate">{item.filename || id}</span>
                  <button
                    onClick={() => handleDelete(id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
