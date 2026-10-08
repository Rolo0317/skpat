import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import LandingPage from './features/landing/LandingPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App homeElement={<LandingPage />} />
  </React.StrictMode>
)
