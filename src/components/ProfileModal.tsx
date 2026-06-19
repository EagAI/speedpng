import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './AuthModal.css'
import './ProfileModal.css'

interface ProfileModalProps {
  user: User
  onClose: () => void
  onLogout: () => void
}

export default function ProfileModal({ user, onClose, onLogout }: ProfileModalProps) {
  const [tab, setTab] = useState<'info' | 'password'>('info')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const mismatch = confirmPw.length > 0 && newPw !== confirmPw

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError(null)

    // Re-authenticate first to verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPw,
    })
    if (signInErr) {
      setError('Current password is incorrect.')
      setLoading(false)
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
    if (updateErr) {
      setError(updateErr.message || 'Failed to update password.')
    } else {
      setSuccess('Password updated successfully.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
    setLoading(false)
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal profile-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'info' ? 'auth-tab--active' : ''}`} onClick={() => { setTab('info'); setError(null); setSuccess(null) }}>Account</button>
          <button className={`auth-tab ${tab === 'password' ? 'auth-tab--active' : ''}`} onClick={() => { setTab('password'); setError(null); setSuccess(null) }}>Change password</button>
        </div>

        {tab === 'info' && (
          <div className="profile-info">
            <div className="profile-avatar">
              {(user.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="profile-detail">
              <span className="profile-label">Email</span>
              <span className="profile-value">{user.email}</span>
            </div>
            <div className="profile-detail">
              <span className="profile-label">Member since</span>
              <span className="profile-value">
                {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <button className="profile-logout-btn" onClick={onLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        )}

        {tab === 'password' && (
          <form className="auth-form" onSubmit={handleChangePassword}>
            {success && <div className="auth-success">{success}</div>}
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-pw-wrap">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="auth-input"
                placeholder="Current password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowCurrent(!showCurrent)} tabIndex={-1}>
                <EyeIcon open={showCurrent} />
              </button>
            </div>

            <div className="auth-pw-wrap">
              <input
                type={showNew ? 'text' : 'password'}
                className="auth-input"
                placeholder="New password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowNew(!showNew)} tabIndex={-1}>
                <EyeIcon open={showNew} />
              </button>
            </div>

            <div className="auth-pw-wrap">
              <input
                type="password"
                className={`auth-input ${mismatch ? 'auth-input--error' : ''}`}
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                disabled={loading}
              />
              {mismatch && <span className="auth-mismatch">Passwords don't match</span>}
            </div>

            <button type="submit" className="auth-submit" disabled={loading || mismatch}>
              {loading ? <span className="auth-spinner" /> : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
