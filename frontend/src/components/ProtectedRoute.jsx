import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { debug } from '../lib/debug';

export default function ProtectedRoute({ allowedRole }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [isStuck, setIsStuck] = useState(false);

  // 🚨 THE TRIPWIRE: If it takes more than 5 seconds, force an error state
  useEffect(() => {
    let timer;
    if (loading || (user && !role)) {
      timer = setTimeout(() => {
        debug.router.error('ProtectedRoute: Authentication HANG detected!', { loading, user: !!user, role });
        setIsStuck(true);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [loading, user, role]);

  // STICKY LOADING with Diagnostic Output
  if (loading || (user && !role)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-900 z-[9999] p-4">
        {!isStuck ? (
          <>
            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-300 font-mono text-sm animate-pulse">Verifying Session...</p>
          </>
        ) : (
          <div className="bg-red-900/50 border border-red-500 p-6 rounded-lg max-w-lg w-full shadow-2xl">
            <h2 className="text-red-400 font-bold mb-2 flex items-center gap-2">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-500"></span>
              🚨 AUTHENTICATION HANG DETECTED
            </h2>
            <p className="text-slate-300 text-sm mb-4">The system is stuck waiting for Supabase to respond. This usually means your profile cannot be found in the database.</p>
            
            <div className="bg-black/50 p-4 rounded font-mono text-xs text-green-400 border border-slate-700">
              <p className="text-slate-500 mb-2">// Diagnostic State Dump</p>
              <p>Loading: <span className={loading ? "text-yellow-400" : "text-green-400"}>{loading.toString()}</span></p>
              <p>User ID: <span className={user ? "text-green-400" : "text-red-400"}>{user ? user.id : 'null'}</span></p>
              <p>Role: <span className={role ? "text-green-400" : "text-red-400"}>{role ? role : 'null'}</span></p>
            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Recommended Actions:</p>
              <ul className="text-slate-400 text-xs list-disc pl-4 space-y-1">
                <li>Check your Internet connection.</li>
                <li>Clear Local Storage in DevTools (Application Tab).</li>
                <li>Verify that the 'profiles' table exists in Supabase.</li>
              </ul>
            </div>
            
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-sm transition-colors"
            >
              Force System Restart
            </button>
          </div>
        )}
      </div>
    );
  }

  // HARD GUARD: No user? Go to login.
  if (!user) {
    debug.router.warn('ProtectedRoute: No user → redirecting to /login', { requiredRole: allowedRole });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ROLE GUARD: Wrong role? Go to your actual dashboard.
  if (allowedRole && role !== allowedRole) {
    debug.router.warn('ProtectedRoute: Role mismatch → redirecting', {
      userRole: role,
      requiredRole: allowedRole,
    });
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  // ACCESS GRANTED
  debug.router.debug('ProtectedRoute: Access granted', { role, allowedRole });
  return <Outlet />;
}
