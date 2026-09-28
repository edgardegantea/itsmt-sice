import { Buffer } from 'buffer'
const g = globalThis as Record<string, unknown>
if (typeof g['Buffer'] === 'undefined') {
  g['Buffer'] = Buffer
}

// Desregistrar cualquier Service Worker residual de otros proyectos en localhost
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister()
    }
  })
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
