import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { debug } from '../lib/debug';

export default function ProtectedRoute({ allowedRole }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // 1. STICKY LOADING: Do NOT render anything but the loader until auth is verified
  if (loading) {
    debug.router.debug('ProtectedRoute: Auth hydration in progress...');
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin shadow-cyan-glow mb-4"></div>
        <p className="text-text-muted font-sans font-medium text-sm animate-pulse">Verifying Session...</p>
      </div>
    );
  }

  // 2. HARD GUARD: No user? Go to login.
  if (!user) {
    debug.router.warn('ProtectedRoute: No user → redirecting to /login', { requiredRole: allowedRole });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. ROLE GUARD: Wrong role? Go to your actual dashboard.
  if (allowedRole && role !== allowedRole) {
    debug.router.warn('ProtectedRoute: Role mismatch → redirecting', {
      userRole: role,
      requiredRole: allowedRole,
    });
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  // 4. ACCESS GRANTED
  debug.router.debug('ProtectedRoute: Access granted', { role, allowedRole });
  return <Outlet />;
}
