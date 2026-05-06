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

// Loading Fallback
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-white">
    <div className="w-10 h-10 border-3 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4" />
    <p className="text-zinc-400 font-sans font-medium text-sm">Loading...</p>
  </div>
);

function AppRoutes() {
  const { user, role, loading } = useAuth();
  
  if (loading) return <PageLoader />;

  const isValidRole = role === 'teacher' || role === 'student';

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={user && isValidRole ? <Navigate to={`/${role}/dashboard`} replace /> : <AuthPage />} 
        />

        {/* Teacher */}
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

        {/* Student */}
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
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: '"DM Sans", sans-serif',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
