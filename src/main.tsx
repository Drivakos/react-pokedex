// Initialize Trusted Types policy BEFORE any other imports to prevent CSP violations
if ((window as any).trustedTypes && (window as any).trustedTypes.createPolicy) {
  try {
    (window as any).trustedTypes.createPolicy('default', {
      createHTML: (string: string) => string,
      createScriptURL: (string: string) => string,
      createScript: (string: string) => string,
    });
  } catch (error) {
    // Policy might already exist, ignore the error
    console.warn('Trusted Types policy creation failed:', error);
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App.tsx';
import './index.css';
import './styles/card-animations.css';
import './styles/pokemon-types.css';
import { Toaster } from 'react-hot-toast';
import { logger } from './utils/logger';

// Global error handling - only log actionable errors in production
window.addEventListener('error', (event) => {
  // Don't log CSP violations, network errors, or other browser-level issues in production
  if (import.meta.env.PROD) {
    const errorMessage = event.error?.message || event.message || '';
    if (errorMessage.includes('Content Security Policy') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Load failed')) {
      return; // Suppress these production errors
    }
  }

  logger.error('Global error caught', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // Don't log network-related promise rejections in production
  if (import.meta.env.PROD) {
    const reason = event.reason?.message || event.reason || '';
    if (reason.includes('Failed to fetch') ||
        reason.includes('NetworkError') ||
        reason.includes('Content Security Policy')) {
      return; // Suppress these production errors
    }
  }

  logger.error('Unhandled promise rejection', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <App />
          <Toaster position="top-right" toastOptions={{
            success: {
              duration: 3000,
              style: {
                background: '#4ade80',
                color: '#fff',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
            },
          }} />
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
