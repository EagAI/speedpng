import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './AuthModal.css'

interface AuthModalProps {
  onClose: () => void
  initialTab?: 'login' | 'register' | 'forgot'
}

type AuthView = 'login' | 'register' | 'forgot'

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

// Map known Supabase error messages to friendly copy
function friendlyError(raw: unknown): { text: string; loginHint?: boolean } {
  // AuthApiError stores message as a class getter — must read it directly
  let msg = ''
  if (typeof raw === 'string') {
    msg = raw
  } else if (raw && typeof raw === 'object') {
    const e = raw as Record<string, unknown>
    if (typeof e.message === 'string' && e.message) {
      msg = e.message
    } else {
      // Serialize including inherited/getter props
      try { msg = JSON.stringify(raw, Object.getOwnPropertyNames(Object.getPrototypeOf(raw)).concat(Object.getOwnPropertyNames(raw))) } catch { /* */ }
      if (!msg || msg === '{}') msg = String(raw)
      if (msg === '[object Object]') msg = ''
    }
  }

  const lower = msg.toLowerCase()
  if (lower.includes('already registered') || lower.includes('already in use') || lower.includes('user already exists')) {
    return { text: 'An account with this email already exists.', loginHint: true }
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials') || lower.includes('email not confirmed')) {
    return { text: 'Incorrect email or password.' }
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return { text: 'Too many attempts — please wait a moment and try again.' }
  }
  if (lower.includes('email') && lower.includes('valid')) {
    return { text: 'Please enter a valid email address.' }
  }
  if (lower.includes('password') && lower.includes('short')) {
    return { text: 'Password is too short. Use at least 8 characters.' }
  }
  if (lower.includes('signup') || lower.includes('sign up') || lower.includes('not allowed') || lower.includes('disabled')) {
    return { text: 'Registration is currently disabled.' }
  }
  return { text: msg || 'Something went wrong. Please try again.' }
}

export default function AuthModal({ onClose, initialTab = 'login' }: AuthModalProps) {
  const [view, setView] = useState<AuthView>(initialTab)
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ text: string; loginHint?: boolean } | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const strength = useMemo(() => getStrength(password), [password])
  const mismatch = view === 'register' && confirm.length > 0 && password !== confirm

  // Check if registration is open
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_open')
      .single()
      .then(({ data }) => {
        setRegistrationOpen(data?.value !== 'false')
      })
  }, [])

  const switchView = (v: AuthView) => {
    setView(v)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirm('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (view === 'register') {
      if (!registrationOpen) { setError({ text: 'Registration is currently closed.' }); return }
      if (password.length < 8) { setError({ text: 'Password must be at least 8 characters.' }); return }
      if (password !== confirm) { setError({ text: 'Passwords do not match.' }); return }
    }

    setLoading(true)

    if (view === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(friendlyError(err))
      } else {
        if (!rememberMe) {
          Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
        }
        onClose()
      }

    } else if (view === 'register') {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) {
        setError(friendlyError(err))
      } else if (data.session) {
        onClose()
      } else {
        setSuccess('Check your email to confirm your account, then log in.')
        switchView('login')
      }

    } else if (view === 'forgot') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (err) {
        setError(friendlyError(err))
      } else {
        setSuccess('Password reset link sent! Check your inbox.')
      }
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
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {view !== 'forgot' ? (
          <div className="auth-tabs">
            <button className={`auth-tab ${view === 'login' ? 'auth-tab--active' : ''}`} onClick={() => switchView('login')}>Login</button>
            {registrationOpen && (
              <button className={`auth-tab ${view === 'register' ? 'auth-tab--active' : ''}`} onClick={() => switchView('register')}>Register</button>
            )}
          </div>
        ) : (
          <div className="auth-back-row">
            <button className="auth-back" onClick={() => switchView('login')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to login
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {view === 'forgot' && <h3 className="auth-form-title">Reset password</h3>}

          {success && <div className="auth-success">{success}</div>}
          {error && (
            <div className="auth-error">
              {error.text}
              {error.loginHint && (
                <button type="button" className="auth-error-link" onClick={() => switchView('login')}>
                  Log in instead →
                </button>
              )}
            </div>
          )}

          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
            autoFocus
          />

          {view !== 'forgot' && (
            <div className="auth-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="auth-input"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={view === 'register' ? 8 : 1}
                disabled={loading}
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                <EyeIcon open={showPw} />
              </button>
            </div>
          )}

          {view === 'register' && password.length > 0 && (
            <div className="auth-strength">
              <div className="auth-strength-bars">
                {[1,2,3,4].map(n => (
                  <div key={n} className={`auth-strength-bar ${strength >= n ? STRENGTH_CLASS[strength] : ''}`} />
                ))}
              </div>
              <span className={`auth-strength-label ${STRENGTH_CLASS[strength]}`}>{STRENGTH_LABEL[strength]}</span>
            </div>
          )}

          {view === 'register' && (
            <div className="auth-pw-wrap">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`auth-input ${mismatch ? 'auth-input--error' : ''}`}
                placeholder="Confirm password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                disabled={loading}
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                <EyeIcon open={showConfirm} />
              </button>
              {mismatch && <span className="auth-mismatch">Passwords don't match</span>}
            </div>
          )}

          {view === 'login' && (
            <div className="auth-login-row">
              <label className="auth-remember">
                <input type="checkbox" className="auth-remember-check" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span className="auth-remember-label">Remember me</span>
              </label>
              <button type="button" className="auth-forgot-link" onClick={() => switchView('forgot')}>Forgot password?</button>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading || mismatch}>
            {loading ? <span className="auth-spinner" /> : view === 'login' ? 'Log in' : view === 'register' ? 'Create account' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  )
}
