import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { initOfflineSync } from './utils/offlineSync'
import { cleanupOldCache } from './utils/offlineStorage'

// Initialize offline synchronization
initOfflineSync();

// Cleanup old cached data periodically
cleanupOldCache();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)