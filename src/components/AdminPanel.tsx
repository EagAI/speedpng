import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import './AdminPanel.css'

interface UploadRow {
  id: string
  filename: string
  user_id: string | null
  created_at: string
  profiles: { email: string } | null
}

export default function AdminPanel() {
  const [uploads, setUploads] = useState<UploadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<UploadRow | null>(null)
  const [lbConfirmDelete, setLbConfirmDelete] = useState(false)
  const [filter, setFilter] = useState<'all' | 'anon' | 'users'>('all')
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [togglingReg, setTogglingReg] = useState(false)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_open')
      .single()
      .then(({ data }) => setRegistrationOpen(data?.value !== 'false'))
  }, [])

  const toggleRegistration = async () => {
    setTogglingReg(true)
    const next = !registrationOpen
    await supabase
      .from('app_settings')
      .update({ value: next ? 'true' : 'false' })
      .eq('key', 'registration_open')
    setRegistrationOpen(next)
    setTogglingReg(false)
  }

  const loadUploads = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('uploads')
      .select('id, filename, user_id, created_at, profiles(email)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setUploads((data as unknown as UploadRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadUploads() }, [loadUploads])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightbox(null); setLbConfirmDelete(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleDelete = async (upload: UploadRow, fromLightbox = false) => {
    setDeleting(upload.id)
    setError(null)
    const { error: storageErr } = await supabase.storage
      .from('images')
      .remove([`img/${upload.filename}`])
    if (storageErr) {
      setError(`Storage delete failed: ${storageErr.message}`)
      setDeleting(null)
      setLbConfirmDelete(false)
      return
    }
    const { error: dbErr } = await supabase.from('uploads').delete().eq('id', upload.id)
    if (dbErr) setError(`DB delete failed: ${dbErr.message}`)
    setUploads((prev) => prev.filter((u) => u.id !== upload.id))
    setDeleting(null)
    setLbConfirmDelete(false)
    if (fromLightbox) setLightbox(null)
  }

  const imgUrl = (filename: string) =>
    `https://vcctxjihxpzefqxdeddm.supabase.co/storage/v1/object/public/images/img/${filename}`

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const filtered = uploads.filter((u) => {
    if (filter === 'anon') return !u.user_id
    if (filter === 'users') return !!u.user_id
    return true
  })

  const anonCount = uploads.filter((u) => !u.user_id).length
  const userCount = uploads.filter((u) => !!u.user_id).length

  return (
    <div className="admin-root">
      {lightbox && (
        <div className="lb-backdrop" onClick={() => { setLightbox(null); setLbConfirmDelete(false) }}>
          <div className="lb-panel" onClick={(e) => e.stopPropagation()}>
            <div className="lb-header">
              <div className="lb-header-info">
                <span className="lb-filename">{lightbox.filename}</span>
                <span className={`lb-badge ${lightbox.user_id ? 'lb-badge--user' : 'lb-badge--anon'}`}>
                  {lightbox.user_id ? (lightbox.profiles?.email ?? 'User') : 'Anonymous'}
                </span>
              </div>
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

      <div className="admin-header">
        <div className="admin-header-top">
          <h2 className="admin-title">Admin Panel</h2>
          <div className="admin-header-actions">
            <button
              className={`admin-reg-toggle ${registrationOpen ? 'admin-reg-toggle--open' : 'admin-reg-toggle--closed'}`}
              onClick={toggleRegistration}
              disabled={togglingReg}
              title="Toggle public registration"
            >
              <span className={`admin-reg-dot ${registrationOpen ? 'admin-reg-dot--open' : ''}`} />
              Registration {registrationOpen ? 'open' : 'closed'}
            </button>
            <button className="admin-refresh" onClick={loadUploads} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
            </button>
          </div>
        </div>
        <div className="admin-stats">
          <span className="admin-stat">{uploads.length} total</span>
          <span className="admin-stat admin-stat--user">{userCount} by account</span>
          <span className="admin-stat admin-stat--anon">{anonCount} anonymous</span>
        </div>
        <div className="admin-filter-bar">
          {(['all', 'users', 'anon'] as const).map((f) => (
            <button
              key={f}
              className={`admin-filter-btn ${filter === f ? 'admin-filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'users' ? 'By account' : 'Anonymous'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading"><span className="admin-spinner" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No uploads found.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-th admin-th--thumb"></th>
                <th className="admin-th">Filename</th>
                <th className="admin-th">Uploaded by</th>
                <th className="admin-th">Date</th>
                <th className="admin-th admin-th--action"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((upload) => (
                <tr key={upload.id} className="admin-tr">
                  <td className="admin-td admin-td--thumb" onClick={() => { setLightbox(upload); setLbConfirmDelete(false) }}>
                    <img src={imgUrl(upload.filename)} alt={upload.filename} className="admin-thumb" loading="lazy" />
                  </td>
                  <td className="admin-td">
                    <a
                      href={`https://uzgrudinti.dev/img/${upload.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-link"
                    >
                      {upload.filename}
                    </a>
                  </td>
                  <td className="admin-td">
                    {upload.user_id ? (
                      <span className="admin-badge admin-badge--user">{upload.profiles?.email ?? upload.user_id}</span>
                    ) : (
                      <span className="admin-badge admin-badge--anon">Anonymous</span>
                    )}
                  </td>
                  <td className="admin-td admin-td--date">{formatDate(upload.created_at)}</td>
                  <td className="admin-td admin-td--action">
                    <button
                      className="admin-btn-view"
                      onClick={() => { setLightbox(upload); setLbConfirmDelete(false) }}
                      title="View"
                    >
                      View
                    </button>
                    <button
                      className="admin-btn-del"
                      onClick={() => handleDelete(upload)}
                      disabled={deleting === upload.id}
                      title="Delete"
                    >
                      {deleting === upload.id ? '…' : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
