import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './Header.css'

export type View = 'upload' | 'dashboard' | 'admin'

interface HeaderProps {
  user: User | null
  isAdmin: boolean
  view: View
  onViewChange: (v: View) => void
  onShowAuth: (tab?: 'login' | 'register') => void
  onShowAccount: () => void
  onShowChangePassword: () => void
  onLogout: () => void
}

export default function Header({
  user, isAdmin, view, onViewChange, onShowAuth,
  onShowAccount, onShowChangePassword, onLogout,
}: HeaderProps) {
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_open')
      .single()
      .then(({ data }) => setRegistrationOpen(data?.value !== 'false'))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (fn: () => void) => { setDropdownOpen(false); fn() }

  return (
    <header className="hdr">
      <div className="hdr-inner">
        <button className="hdr-brand" onClick={() => onViewChange('upload')}>
          uzgrudinti<span className="hdr-accent">.dev</span>
        </button>

        <nav className="hdr-nav">
          {user && (
            <button
              className={`hdr-nav-btn ${view === 'dashboard' ? 'hdr-nav-btn--active' : ''}`}
              onClick={() => onViewChange('dashboard')}
            >
              My Images
            </button>
          )}
          {isAdmin && (
            <button
              className={`hdr-nav-btn ${view === 'admin' ? 'hdr-nav-btn--active' : ''}`}
              onClick={() => onViewChange('admin')}
            >
              Admin
            </button>
          )}
        </nav>

        <div className="hdr-auth">
          {user ? (
            <div className="hdr-profile-wrap" ref={dropdownRef}>
              <button
                className={`hdr-profile-btn ${dropdownOpen ? 'hdr-profile-btn--open' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="hdr-profile-avatar">
                  {(user.email?.[0] ?? '?').toUpperCase()}
                </span>
                <span className="hdr-profile-email">{user.email}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`hdr-profile-chevron ${dropdownOpen ? 'hdr-profile-chevron--up' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="hdr-dropdown">
                  <button className="hdr-dd-item" onClick={() => pick(onShowAccount)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    Account
                  </button>
                  <button className="hdr-dd-item" onClick={() => pick(onShowChangePassword)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Change password
                  </button>
                  <div className="hdr-dd-sep" />
                  <button className="hdr-dd-item hdr-dd-item--danger" onClick={() => pick(onLogout)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="hdr-btn-outline" onClick={() => onShowAuth('login')}>Log in</button>
              {registrationOpen && (
                <button className="hdr-btn-primary" onClick={() => onShowAuth('register')}>Register</button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
