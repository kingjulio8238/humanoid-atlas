import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      {clerkPubKey ? (
        <ClerkProvider publishableKey={clerkPubKey}>
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<App />} />
            </Routes>
            <Analytics />
          </BrowserRouter>
        </ClerkProvider>
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<App />} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      )}
    </HelmetProvider>
  </StrictMode>,
)
