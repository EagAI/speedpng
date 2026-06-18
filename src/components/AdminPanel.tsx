import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import './AdminPanel.css'

interface StorageFile {
  name: string
  created_at: string | null
  updated_at: string | null
  metadata: Record<string, unknown> | null
}

interface AdminPanelProps {
  onLogout: () => void
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<StorageFile | null>(null)
  const [lbConfirmDelete, setLbConfirmDelete] = useState(false)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.storage.from('images').list('img', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error) {
      setError(error.message)
    } else {
      setFiles((data ?? []) as StorageFile[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  // Close lightbox on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightbox(null); setLbConfirmDelete(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleDelete = async (filename: string, fromLightbox = false) => {
    setDeleting(filename)
    setError(null)
    const { error } = await supabase.storage.from('images').remove([`img/${filename}`])
    if (error) {
      setError(`Delete failed: ${error.message}`)
      setDeleting(null)
      setLbConfirmDelete(false)
      return
    }
    setFiles((prev) => prev.filter((f) => f.name !== filename))
    setDeleting(null)
    setLbConfirmDelete(false)
    if (fromLightbox) setLightbox(null)
  }

  const openLightbox = (file: StorageFile) => {
    setLightbox(file)
    setLbConfirmDelete(false)
  }

  const closeLightbox = () => {
    setLightbox(null)
    setLbConfirmDelete(false)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const imgUrl = (filename: string) =>
    `https://vcctxjihxpzefqxdeddm.supabase.co/storage/v1/object/public/images/img/${filename}`

  return (
    <div className="admin-root">
      {/* Lightbox */}
      {lightbox && (
        <div className="lb-backdrop" onClick={closeLightbox}>
          <div className="lb-panel" onClick={(e) => e.stopPropagation()}>
            <div className="lb-header">
              <span className="lb-filename">{lightbox.name}</span>
              <button className="lb-close" onClick={closeLightbox} title="Close (Esc)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="lb-img-wrap">
              <img src={imgUrl(lightbox.name)} alt={lightbox.name} className="lb-img" />
            </div>
            <div className="lb-footer">
              <span className="lb-date">{formatDate(lightbox.created_at)}</span>
              <div className="lb-actions">
                {lbConfirmDelete ? (
                  <>
                    <span className="lb-confirm-label">Delete this image?</span>
                    <button
                      className="lb-btn-confirm-yes"
                      onClick={() => handleDelete(lightbox.name, true)}
                      disabled={deleting === lightbox.name}
                    >
                      {deleting === lightbox.name ? '…' : 'Yes, delete'}
                    </button>
                    <button className="lb-btn-cancel" onClick={() => setLbConfirmDelete(false)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="lb-btn-delete" onClick={() => setLbConfirmDelete(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            uzgrudinti<span className="admin-brand-accent">.dev</span>
            <span className="admin-badge">Admin</span>
          </div>
          <div className="admin-header-right">
            <span className="admin-count">{files.length} image{files.length !== 1 ? 's' : ''}</span>
            <button className="admin-refresh" onClick={loadFiles} title="Refresh">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button className="admin-logout" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {error && (
          <div className="admin-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <span className="admin-spinner" />
            Loading images…
          </div>
        ) : files.length === 0 ? (
          <div className="admin-empty">No images uploaded yet.</div>
        ) : (
          <div className="admin-grid">
            {files.map((file) => (
              <div key={file.name} className="admin-card" onClick={() => openLightbox(file)}>
                <div className="admin-thumb-wrap">
                  <img
                    src={imgUrl(file.name)}
                    alt={file.name}
                    className="admin-thumb"
                    loading="lazy"
                  />
                  <div className="admin-thumb-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    View
                  </div>
                </div>
                <div className="admin-card-body">
                  <p className="admin-filename">{file.name}</p>
                  <p className="admin-date">{formatDate(file.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
