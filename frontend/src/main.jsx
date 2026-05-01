// 🚨 CACHE BUSTER AUTO-RECOVERY
window.addEventListener('error', (e) => {
  // If Vite fails to load a JS chunk because of a stale cache hash...
  if (
    e.message?.includes('Failed to fetch dynamically imported module') ||
    e.message?.includes('Importing a module script failed')
  ) {
    console.warn('Stale cache detected. Force reloading...');
    
    // 1. Unregister any rogue Service Workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // 2. Force a hard reload from the server (bypassing browser cache)
    window.location.reload(true);
  }
});

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Apply theme based on saved preference or default to light
const savedTheme = localStorage.getItem('evalix-theme');

if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  // Default to light if no preference saved, or if saved as light
  document.documentElement.classList.remove('dark');
  if (!savedTheme) localStorage.setItem('evalix-theme', 'light');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
