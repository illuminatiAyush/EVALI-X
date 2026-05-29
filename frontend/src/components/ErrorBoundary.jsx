import React from 'react';
import { debug } from '../lib/debug';

/**
 * Global Error Boundary — catches any React crash and shows a
 * helpful debug screen instead of a blank page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    debug.ui.error('React crash caught by ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleLogout = () => {
    // Clear all auth state and redirect
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#e2e8f0',
          fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
          padding: '2rem',
        }}>
          <div style={{ maxWidth: '640px', width: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '11px',
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}>
                RUNTIME_ERROR
              </div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: '0 0 8px 0',
              }}>
                Something went wrong
              </h1>
              <p style={{
                color: '#94a3b8',
                fontSize: '15px',
                margin: 0,
                lineHeight: 1.6,
              }}>
                A component crashed. The error details below will help debug the issue.
              </p>
            </div>

            {/* Error Details */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '16px',
            }}>
              <p style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '13px',
                color: '#fca5a5',
                margin: 0,
                wordBreak: 'break-word',
              }}>
                {error?.message || 'Unknown error'}
              </p>
            </div>

            {/* Stack Trace */}
            {error?.stack && (
              <details style={{ marginBottom: '16px' }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  padding: '8px 0',
                }}>
                  Stack Trace
                </summary>
                <pre style={{
                  background: '#111118',
                  border: '1px solid #1e1e2e',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '11px',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#94a3b8',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Component Stack */}
            {errorInfo?.componentStack && (
              <details style={{ marginBottom: '24px' }}>
                <summary style={{
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  padding: '8px 0',
                }}>
                  Component Stack
                </summary>
                <pre style={{
                  background: '#111118',
                  border: '1px solid #1e1e2e',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '11px',
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#94a3b8',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                }}>
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  background: '#22d3ee',
                  color: '#0a0a0f',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                Go Home
              </button>
              <button
                onClick={this.handleLogout}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif',
                }}
              >
                Clear Session & Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
