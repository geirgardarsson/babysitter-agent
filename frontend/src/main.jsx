import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ParentPage from './pages/ParentPage.jsx'
import './style.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

if (window.location.pathname.startsWith('/foreldrar')) {
  root.render(
    <React.StrictMode>
      <ParentPage />
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
