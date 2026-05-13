import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerkAppearance = {
  variables: {
    colorPrimary: '#0f0f0f',
    colorBackground: '#faf8f4',
    colorInputBackground: '#ffffff',
    colorInputText: '#0f0f0f',
    borderRadius: '4px',
    fontFamily: 'Inter, sans-serif',
    colorText: '#0f0f0f',
    colorTextSecondary: '#5a5a5a',
    colorNeutral: '#0f0f0f',
  },
  elements: {
    card: {
      border: '1px solid #c4bfb6',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    },
    formButtonPrimary: {
      backgroundColor: '#0f0f0f',
      fontSize: '16px',
      fontFamily: "'Share Tech Mono', monospace",
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    },
    formButtonPrimary__loading: {
      backgroundColor: '#333',
    },
    formFieldInput: {
      border: '1px solid #c4bfb6',
      fontSize: '16px',
    },
    formFieldInput__focused: {
      borderColor: '#0f0f0f',
      boxShadow: 'none',
    },
    footerActionLink: {
      color: '#0f0f0f',
    },
    footer: {
      display: 'none',
    },
    modalBackdrop: {
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      {clerkPubKey ? (
        <ClerkProvider publishableKey={clerkPubKey} appearance={clerkAppearance}>
          <I18nProvider>
            <BrowserRouter>
              <Routes>
                <Route path="*" element={<App />} />
              </Routes>
              <Analytics />
            </BrowserRouter>
          </I18nProvider>
        </ClerkProvider>
      ) : (
        <I18nProvider>
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<App />} />
            </Routes>
            <Analytics />
          </BrowserRouter>
        </I18nProvider>
      )}
    </HelmetProvider>
  </StrictMode>,
)
