import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRole }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setIsStuck(true), 5000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999] p-6">
        {!isStuck ? (
          <>
            <div className="w-10 h-10 border-3 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4" />
            <p className="text-zinc-400 font-sans text-sm font-medium">Verifying session...</p>
          </>
        ) : (
          <div className="bg-white border border-zinc-200 p-8 rounded-2xl max-w-sm w-full shadow-lg text-center">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">!</div>
            <h2 className="text-lg font-display font-bold text-zinc-800 mb-2">Connection Issue</h2>
            <p className="text-zinc-500 text-sm mb-6">We couldn't verify your session. Please check your internet and try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-950 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  return <Outlet />;
}
