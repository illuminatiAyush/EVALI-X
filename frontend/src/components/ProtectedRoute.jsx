import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { debugLifecycle } from '../lib/debugLifecycle';

export default function ProtectedRoute({ allowedRole }) {
  const { user, role, loading, authError } = useAuth();
  const location = useLocation();
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    debugLifecycle.log(`[PROTECTED ROUTE] entered: ${location.pathname}`);
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        debugLifecycle.log(`[PROTECTED ROUTE] timeout on ${location.pathname}`);
        setIsStuck(true);
      }, 10000); // 10s strict loading policy
    }
    return () => clearTimeout(timer);
  }, [loading, location.pathname]);

  if (loading && !authError && !isStuck) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999] p-6 text-text">
        <div className="w-10 h-10 border-3 border-border border-t-brand rounded-full animate-spin mb-4" />
        <p className="text-text-muted font-sans text-sm font-medium">Verifying session...</p>
      </div>
    );
  }

  if (authError || isStuck) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999] p-6 text-text">
        <div className="bg-surface border border-border p-8 rounded-2xl max-w-sm w-full shadow-lg text-center">
          <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
          <h2 className="text-lg font-display font-bold text-text mb-2">Connection Issue</h2>
          <p className="text-text-muted text-sm mb-6">
            {authError || "We couldn't verify your session. Please check your internet and try again."}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-2.5 bg-text hover:bg-text/90 text-surface rounded-xl font-semibold text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    debugLifecycle.log(`[PROTECTED ROUTE] redirected to /login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && role !== allowedRole) {
    debugLifecycle.log(`[PROTECTED ROUTE] redirected to /${role}/dashboard`);
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  debugLifecycle.log(`[PROTECTED ROUTE] resolved for ${user.email}`);
  return <Outlet />;
}
