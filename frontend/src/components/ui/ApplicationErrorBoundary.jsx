import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ApplicationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR BOUNDARY] Caught rendering error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-surface border border-border/50 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-text mb-2 tracking-tight">Something went wrong</h2>
              <p className="text-text-muted">
                A critical error occurred while rendering this page. The application state might be inconsistent.
              </p>
              {this.state.error?.message && (
                <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-sm text-red-400 font-mono text-left break-words overflow-hidden">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <button
              onClick={this.handleRetry}
              className="w-full bg-text hover:bg-text/90 text-surface font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <RefreshCw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
