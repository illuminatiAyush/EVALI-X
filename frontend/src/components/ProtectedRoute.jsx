import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { debug } from '../lib/debug';

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    debug.router.debug('ProtectedRoute: still loading auth state...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    debug.router.warn('ProtectedRoute: No user → redirecting to /login', { requiredRole: allowedRole });
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    debug.router.warn('ProtectedRoute: User exists but role is null', { 
      userId: user.id,
      hint: 'Profile may not exist in DB. Check profiles table.',
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted text-sm">Resolving role...</p>
        </div>
      </div>
    );
  }

  if (allowedRole && role !== allowedRole) {
    debug.router.warn('ProtectedRoute: Role mismatch → redirecting', {
      userRole: role,
      requiredRole: allowedRole,
      redirectTo: `/${role}/dashboard`,
    });
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  debug.router.debug('ProtectedRoute: Access granted', { role, allowedRole });
  return children ? children : <Outlet />;
}
