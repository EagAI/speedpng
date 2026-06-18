import { useState } from 'react'
import PasswordGate from './components/PasswordGate'
import ImageUploader from './components/ImageUploader'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)

  if (!authenticated) {
    return <PasswordGate onSuccess={() => setAuthenticated(true)} />
  }

  return <ImageUploader />
}
