import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthService } from './services/Auth.Service'

// Restaura o token (F5 não desloga) e define o que fazer se a sessão expirar.
AuthService.init({ onSessionExpired: () => window.location.assign('/login') })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)