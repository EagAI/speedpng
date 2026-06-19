import { useState, useEffect } from 'react'
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
  onShowProfile: () => void
}

export default function Header({ user, isAdmin, view, onViewChange, onShowAuth, onShowProfile }: HeaderProps) {
  const [registrationOpen, setRegistrationOpen] = useState(true)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_open')
      .single()
      .then(({ data }) => setRegistrationOpen(data?.value !== 'false'))
  }, [])

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
            <button className="hdr-profile-btn" onClick={onShowProfile} title="Account settings">
              <span className="hdr-profile-avatar">
                {(user.email?.[0] ?? '?').toUpperCase()}
              </span>
              <span className="hdr-profile-email">{user.email}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="hdr-profile-chevron">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
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
