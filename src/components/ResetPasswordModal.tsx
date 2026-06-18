import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './AuthModal.css'

interface ResetPasswordModalProps {
  onDone: () => void
}

export default function ResetPasswordModal({ onDone }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const mismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message || 'Failed to update password.')
    } else {
      setSuccess(true)
      setTimeout(onDone, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="auth-backdrop">
      <div className="auth-modal" style={{ maxWidth: 400 }}>
        <h3 className="auth-form-title" style={{ marginBottom: 20 }}>Set new password</h3>

        {success ? (
          <div className="auth-success">Password updated! Redirecting…</div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="auth-input"
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                autoFocus
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? (
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
                )}
              </button>
            </div>

            <div className="auth-pw-wrap">
              <input
                type="password"
                className={`auth-input ${mismatch ? 'auth-input--error' : ''}`}
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
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
