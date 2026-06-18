import type { User } from '@supabase/supabase-js'
import './Header.css'

export type View = 'upload' | 'dashboard' | 'admin'

interface HeaderProps {
  user: User | null
  isAdmin: boolean
  view: View
  onViewChange: (v: View) => void
  onShowAuth: () => void
  onLogout: () => void
}

export default function Header({ user, isAdmin, view, onViewChange, onShowAuth, onLogout }: HeaderProps) {
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
            <>
              <span className="hdr-email">{user.email}</span>
              <button className="hdr-btn-outline" onClick={onLogout}>Log out</button>
            </>
          ) : (
            <>
              <button className="hdr-btn-outline" onClick={onShowAuth}>Log in</button>
              <button className="hdr-btn-primary" onClick={onShowAuth}>Register</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
