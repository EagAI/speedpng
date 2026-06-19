import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './AuthModal.css'
import './ProfileModal.css'

interface AccountModalProps {
  user: User
  onClose: () => void
  onDeleted: () => void
}

type DeleteStep = 'idle' | 'confirm' | 'deleting'

export default function AccountModal({ user, onClose, onDeleted }: AccountModalProps) {
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleteStep('deleting')
    setDeleteError(null)

    // 1. Fetch all filenames the user uploaded
    const { data: uploads } = await supabase
      .from('uploads')
      .select('filename')
      .eq('user_id', user.id)

    // 2. Delete files from storage
    if (uploads && uploads.length > 0) {
      const paths = uploads.map((u: { filename: string }) => `img/${u.filename}`)
      await supabase.storage.from('images').remove(paths)
    }

    // 3. Delete account + profile + upload records via RPC
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      setDeleteError(error.message || 'Failed to delete account. Please try again.')
      setDeleteStep('confirm')
      return
    }

    // 4. Sign out and redirect
    await supabase.auth.signOut()
    onDeleted()
  }

  return (
    <div className="auth-backdrop" onClick={deleteStep === 'confirm' ? undefined : onClose}>
      <div className="auth-modal profile-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} disabled={deleteStep === 'deleting'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 className="profile-modal-title">Account</h3>

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
              {new Date(user.created_at).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </span>
          </div>

          <div className="profile-danger-zone">
            <p className="profile-danger-label">Danger zone</p>

            {deleteStep === 'idle' && (
              <button className="profile-delete-btn" onClick={() => setDeleteStep('confirm')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Delete account
              </button>
            )}

            {(deleteStep === 'confirm' || deleteStep === 'deleting') && (
              <div className="profile-confirm-box">
                <p className="profile-confirm-title">Are you sure?</p>
                <p className="profile-confirm-body">
                  This will permanently delete your account and <strong>all your uploaded images</strong>. This cannot be undone.
                </p>
                {deleteError && <p className="profile-confirm-error">{deleteError}</p>}
                <div className="profile-confirm-actions">
                  <button
                    className="profile-confirm-yes"
                    onClick={handleDelete}
                    disabled={deleteStep === 'deleting'}
                  >
                    {deleteStep === 'deleting' ? (
                      <><span className="auth-spinner" /> Deleting…</>
                    ) : 'Yes, delete everything'}
                  </button>
                  <button
                    className="profile-confirm-cancel"
                    onClick={() => { setDeleteStep('idle'); setDeleteError(null) }}
                    disabled={deleteStep === 'deleting'}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
