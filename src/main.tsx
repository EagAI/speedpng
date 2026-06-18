import { StrictMode, Component, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ color: '#ff5050', fontWeight: 700, fontSize: 16 }}>Something went wrong</div>
          <div style={{ color: '#888', fontSize: 13, fontFamily: 'monospace', background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, padding: '10px 16px', maxWidth: 500, wordBreak: 'break-word' }}>
            {(this.state.error as Error).message}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
