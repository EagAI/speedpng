import { useState, useRef } from 'react'
import './PasswordGate.css'

interface PasswordGateProps {
  onSuccess: (role: 'user' | 'admin') => void
}

export default function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'speedrp') {
      onSuccess('user')
    } else if (password === 'londonas') {
      onSuccess('admin')
    } else {
      setError(true)
      setShake(true)
      setPassword('')
      setTimeout(() => setShake(false), 500)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="gate-root">
      <div className="gate-bg" />
      <div className={`gate-card ${shake ? 'gate-card--shake' : ''}`}>
        <h1 className="gate-title">
          uzgrudinti<span className="gate-accent">.dev</span>
        </h1>
        <p className="gate-subtitle">Image Uploader</p>
        <form className="gate-form" onSubmit={handleSubmit}>
          <div className="gate-field">
            <input
              ref={inputRef}
              type="password"
              className={`gate-input ${error ? 'gate-input--error' : ''}`}
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              autoFocus
            />
            {error && <span className="gate-error">Incorrect password. Try again.</span>}
          </div>
          <button type="submit" className="gate-btn">
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
