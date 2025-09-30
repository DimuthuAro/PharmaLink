import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import RouteList from './RouteList.jsx'
import { AuthProvider } from './auth/auth.jsx'

createRoot(document.getElementById('root')).render(
  <AuthProvider>  {/* This makes auth available to entire app */}
    <StrictMode>
      <RouteList />
    </StrictMode>
  </AuthProvider>
)
