import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './UserDashboard.css'

interface Upload {
  id: string
  filename: string
  created_at: string
}

interface UserDashboardProps {
  user: User
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Upload | null>(null)
  const [lbConfirmDelete, setLbConfirmDelete] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const loadUploads = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('uploads')
      .select('id, filename, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setUploads(data ?? [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { loadUploads() }, [loadUploads])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightbox(null); setLbConfirmDelete(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleDelete = async (upload: Upload, fromLightbox = false) => {
    setDeleting(upload.id)
    setError(null)
    const { error: storageErr } = await supabase.storage
      .from('images')
      .remove([`img/${upload.filename}`])
    if (storageErr) {
      setError(`Delete failed: ${storageErr.message}`)
      setDeleting(null)
      setLbConfirmDelete(false)
      return
    }
    await supabase.from('uploads').delete().eq('id', upload.id)
    setUploads((prev) => prev.filter((u) => u.id !== upload.id))
    setDeleting(null)
    setLbConfirmDelete(false)
    if (fromLightbox) setLightbox(null)
  }

  const copyUrl = async (filename: string) => {
    const url = `https://uzgrudinti.dev/img/${filename}`
    await navigator.clipboard.writeText(url)
    setCopied(filename)
    setTimeout(() => setCopied(null), 2000)
  }

  const imgUrl = (filename: string) =>
    `https://vcctxjihxpzefqxdeddm.supabase.co/storage/v1/object/public/images/img/${filename}`

  const pubUrl = (filename: string) => `https://uzgrudinti.dev/img/${filename}`

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="ud-root">
      {lightbox && (
        <div className="lb-backdrop" onClick={() => { setLightbox(null); setLbConfirmDelete(false) }}>
          <div className="lb-panel" onClick={(e) => e.stopPropagation()}>
            <div className="lb-header">
              <span className="lb-filename">{lightbox.filename}</span>
              <button className="lb-close" onClick={() => { setLightbox(null); setLbConfirmDelete(false) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="lb-img-wrap">
              <img src={imgUrl(lightbox.filename)} alt={lightbox.filename} className="lb-img" />
            </div>
            <div className="lb-footer">
              <span className="lb-date">{formatDate(lightbox.created_at)}</span>
              <div className="lb-actions">
                <button
                  className={`lb-btn-copy ${copied === lightbox.filename ? 'lb-btn-copy--done' : ''}`}
                  onClick={() => copyUrl(lightbox.filename)}
                >
                  {copied === lightbox.filename ? 'Copied!' : 'Copy link'}
                </button>
                {lbConfirmDelete ? (
                  <>
                    <span className="lb-confirm-label">Delete?</span>
                    <button className="lb-btn-confirm-yes" onClick={() => handleDelete(lightbox, true)} disabled={deleting === lightbox.id}>
                      {deleting === lightbox.id ? '…' : 'Yes'}
                    </button>
                    <button className="lb-btn-cancel" onClick={() => setLbConfirmDelete(false)}>Cancel</button>
                  </>
                ) : (
                  <button className="lb-btn-delete" onClick={() => setLbConfirmDelete(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="ud-header">
        <h2 className="ud-title">My Images</h2>
        <span className="ud-count">{uploads.length} upload{uploads.length !== 1 ? 's' : ''}</span>
      </div>

      {error && <div className="ud-error">{error}</div>}

      {loading ? (
        <div className="ud-loading"><span className="ud-spinner" /> Loading…</div>
      ) : uploads.length === 0 ? (
        <div className="ud-empty">You haven't uploaded any images yet.</div>
      ) : (
        <div className="ud-grid">
          {uploads.map((upload) => (
            <div key={upload.id} className="ud-card" onClick={() => { setLightbox(upload); setLbConfirmDelete(false) }}>
              <div className="ud-thumb-wrap">
                <img src={imgUrl(upload.filename)} alt={upload.filename} className="ud-thumb" loading="lazy" />
                <div className="ud-thumb-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  View
                </div>
              </div>
              <div className="ud-card-body">
                <p className="ud-filename">{pubUrl(upload.filename)}</p>
                <p className="ud-date">{formatDate(upload.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
