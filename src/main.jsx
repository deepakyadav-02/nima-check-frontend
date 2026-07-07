import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupAxiosAuthInterceptor } from './utils/apiClient'
import './index.css'
import App from './App.jsx'

setupAxiosAuthInterceptor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
