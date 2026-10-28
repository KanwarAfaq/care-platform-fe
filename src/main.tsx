import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Cookieless Vercel Web Analytics + Speed Insights, loaded once the page is idle.
const startAnalytics = () => {
  if (import.meta.env.DEV || navigator.webdriver) return
  import('@vercel/analytics').then((m) => m.inject()).catch(() => {})
  import('@vercel/speed-insights').then((m) => m.injectSpeedInsights()).catch(() => {})
}
if (document.readyState === 'complete') setTimeout(startAnalytics, 1500)
else window.addEventListener('load', () => setTimeout(startAnalytics, 1500), { once: true })
