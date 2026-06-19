import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Header from './components/Header'
import type { View } from './components/Header'
import ImageUploader from './components/ImageUploader'
import UserDashboard from './components/UserDashboard'
import AdminPanel from './components/AdminPanel'
import AuthModal from './components/AuthModal'
import ResetPasswordModal from './components/ResetPasswordModal'
import AccountModal from './components/AccountModal'
import ChangePasswordModal from './components/ChangePasswordModal'
import './App.css'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [view, setView] = useState<View>('upload')
  const [showAuth, setShowAuth] = useState<false | 'login' | 'register' | 'forgot'>(false)
  const [showReset, setShowReset] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    setIsAdmin(data?.role === 'admin')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) checkAdmin(u.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (event === 'PASSWORD_RECOVERY') {
        setShowReset(true)
        return
      }

      if (u) {
        checkAdmin(u.id)
      } else {
        setIsAdmin(false)
        setView('upload')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setView('upload')
  }

  const handleViewChange = (v: View) => {
    if (v === 'dashboard' && !user) { setShowAuth('login'); return }
    if (v === 'admin' && !isAdmin) return
    setView(v)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span className="app-loading-spinner" />
      </div>
    )
  }

  return (
    <div className="app">
      <Header
        user={user}
        isAdmin={isAdmin}
        view={view}
        onViewChange={handleViewChange}
        onShowAuth={(tab) => setShowAuth(tab ?? 'login')}
        onShowAccount={() => setShowAccount(true)}
        onShowChangePassword={() => setShowChangePw(true)}
        onLogout={handleLogout}
      />

      <div className="app-content">
        {view === 'upload' && <ImageUploader user={user} />}
        {view === 'dashboard' && user && <UserDashboard user={user} />}
        {view === 'admin' && isAdmin && <AdminPanel />}
      </div>

      {showAuth && <AuthModal initialTab={showAuth} onClose={() => setShowAuth(false)} />}
      {showReset && <ResetPasswordModal onDone={() => setShowReset(false)} />}
      {showAccount && user && (
        <AccountModal
          user={user}
          onClose={() => setShowAccount(false)}
          onDeleted={() => { setShowAccount(false); setView('upload') }}
        />
      )}
      {showChangePw && user && (
        <ChangePasswordModal
          user={user}
          onClose={() => setShowChangePw(false)}
        />
      )}
    </div>
  )
}
