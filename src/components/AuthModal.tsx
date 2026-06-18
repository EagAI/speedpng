import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import './AuthModal.css'

interface AuthModalProps {
  onClose: () => void
  initialTab?: 'login' | 'register'
}

type AuthTab = 'login' | 'register'

function getStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_CLASS = ['', 'str-weak', 'str-fair', 'str-good', 'str-strong']

export default function AuthModal({ onClose, initialTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const strength = useMemo(() => getStrength(password), [password])
  const mismatch = tab === 'register' && confirm.length > 0 && password !== confirm

  const switchTab = (t: AuthTab) => {
    setTab(t)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirm('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (tab === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        if (!rememberMe) {
          // Remove session from localStorage so it doesn't survive a browser restart
          Object.keys(localStorage)
            .filter((k) => k.startsWith('sb-'))
            .forEach((k) => localStorage.removeItem(k))
        }
        onClose()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Account created! You can now log in.')
        switchTab('login')
      }
    }
    setLoading(false)
  }

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => switchTab('login')}
          >Login</button>
          <button
            className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => switchTab('register')}
          >Register</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {success && <div className="auth-success">{success}</div>}
          {error && <div className="auth-error">{error}</div>}

          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <div className="auth-pw-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={tab === 'register' ? 8 : 1}
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

          {tab === 'register' && password.length > 0 && (
            <div className="auth-strength">
              <div className="auth-strength-bars">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`auth-strength-bar ${strength >= n ? STRENGTH_CLASS[strength] : ''}`}
                  />
                ))}
              </div>
              <span className={`auth-strength-label ${STRENGTH_CLASS[strength]}`}>
                {STRENGTH_LABEL[strength]}
              </span>
            </div>
          )}

          {tab === 'register' && (
            <div className="auth-pw-wrap">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`auth-input ${mismatch ? 'auth-input--error' : ''}`}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                {showConfirm ? (
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
              {mismatch && <span className="auth-mismatch">Passwords don't match</span>}
            </div>
          )}

          {tab === 'login' && (
            <label className="auth-remember">
              <input
                type="checkbox"
                className="auth-remember-check"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="auth-remember-label">Remember me</span>
            </label>
          )}

          <button type="submit" className="auth-submit" disabled={loading || mismatch}>
            {loading ? <span className="auth-spinner" /> : tab === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
