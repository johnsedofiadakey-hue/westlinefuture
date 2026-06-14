import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Project-wide safety net for legacy/minified React references
window.React = React;

// Unregister any stale service workers and clear their caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    if (regs.length > 0) {
      Promise.all([
        ...regs.map(r => r.unregister()),
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      ]).then(() => window.location.reload());
    }
  });
}

import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from './context/AppContext'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) {
    const report = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    console.error("CRASH:", report);
    const endpoint = import.meta.env.VITE_ERROR_LOG_URL;
    if (endpoint) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(() => {});
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8F6F3', fontFamily: 'sans-serif', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
            An unexpected error occurred. Please reload the page. If this keeps happening, contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '12px 28px', background: `var(--accent-secondary)`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
            Reload Page
          </button>
          {import.meta.env.DEV && (
            <pre style={{ marginTop: 24, fontSize: 11, color: '#cc0000', background: '#fff', padding: 16, borderRadius: 8, maxWidth: 600, overflow: 'auto', textAlign: 'left' }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

if (import.meta.env.DEV) console.log("App Mounting...");

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>,
)
