import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Apply dark mode by default — respects user's saved preference
const savedTheme = localStorage.getItem('evalix-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && prefersDark) || !savedTheme) {
  // Default to dark if no preference saved
  document.documentElement.classList.add('dark');
  if (!savedTheme) localStorage.setItem('evalix-theme', 'dark');
} else {
  document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
