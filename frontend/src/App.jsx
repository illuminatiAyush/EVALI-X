import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import { Toaster } from 'sonner';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const CreateTestPage = lazy(() => import('./pages/teacher/CreateTestPage'));
const TestViewerPage = lazy(() => import('./pages/teacher/TestViewerPage'));
const TestAnalyticsPage = lazy(() => import('./pages/teacher/TestAnalyticsPage'));
const BatchManagementPage = lazy(() => import('./pages/teacher/BatchManagementPage'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const TestAttemptPage = lazy(() => import('./pages/student/TestAttemptPage'));
const TestResultsPage = lazy(() => import('./pages/student/TestResultsPage'));
const StudentHistoryPage = lazy(() => import('./pages/student/StudentHistoryPage'));
const JoinBatchPage = lazy(() => import('./pages/student/JoinBatchPage'));
const ProfilePage = lazy(() => import('./pages/common/ProfilePage'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
    <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none"></div>
    <div className="relative z-10 flex flex-col items-center">
      <div className="w-14 h-14 border-4 border-slate-200 border-t-brand rounded-full animate-spin mb-6 shadow-cyan-glow"></div>
      <p className="text-text-muted font-display font-bold text-sm tracking-widest uppercase animate-pulse">Initializing System...</p>
    </div>
  </div>
);

function AppRoutes() {
  const { user, role, loading } = useAuth();
  
  // 🚨 HYDRATION BLOCK: Completely halts the router tree from evaluating URLs
  // until Supabase finishes parsing the local storage token.
  if (loading) return <PageLoader />;

  const isValidRole = role === 'teacher' || role === 'student';

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={<LandingPage />} 
        />
        <Route 
          path="/login" 
          element={user && isValidRole ? <Navigate to={`/${role}/dashboard`} replace /> : <AuthPage />} 
        />

        {/* Teacher Routes */}
        <Route element={<ProtectedRoute allowedRole="teacher" />}>
          <Route path="/teacher" element={<MainLayout />}>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="create-test" element={<CreateTestPage />} />
            <Route path="test/:id" element={<TestViewerPage />} />
            <Route path="analytics/:id" element={<TestAnalyticsPage />} />
            <Route path="batches" element={<BatchManagementPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Student Routes */}
        <Route element={<ProtectedRoute allowedRole="student" />}>
          <Route path="/student" element={<MainLayout />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="test/:id" element={<TestAttemptPage />} />
            <Route path="results/:id" element={<TestResultsPage />} />
            <Route path="history" element={<StudentHistoryPage />} />
            <Route path="join-batch" element={<JoinBatchPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  // Sync toaster theme with the document dark class
  const [theme, setTheme] = React.useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster
          theme={theme}
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: '"DM Sans", sans-serif',
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
