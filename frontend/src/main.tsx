import React from 'react'
import ReactDOM from 'react-dom/client'
import { Navigate } from 'react-router-dom'
import App from './App'
import './index.css'

// Modo standalone (npm run dev:frontend): la portada pública vive en la web Astro, así que "/" lleva al login.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App homeElement={<Navigate to="/login" replace />} />
  </React.StrictMode>
)
