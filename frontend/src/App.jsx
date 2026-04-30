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

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
    <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
    <p className="text-slate-300 font-sans font-medium text-sm animate-pulse">Initializing System...</p>
  </div>
);

function AppRoutes() {
  const { user, role, loading } = useAuth();
  
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
