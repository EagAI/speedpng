import { useState } from 'react'
import PasswordGate from './components/PasswordGate'
import ImageUploader from './components/ImageUploader'
import AdminPanel from './components/AdminPanel'

type AuthRole = 'none' | 'user' | 'admin'

export default function App() {
  const [role, setRole] = useState<AuthRole>('none')

  if (role === 'none') {
    return <PasswordGate onSuccess={(r) => setRole(r)} />
  }
  if (role === 'admin') {
    return <AdminPanel onLogout={() => setRole('none')} />
  }
  return <ImageUploader />
}
