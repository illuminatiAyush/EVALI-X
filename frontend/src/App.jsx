import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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

import { FullPageLoader } from './components/ui/Loader';

function AppRoutes() {
  const { user, role, loading } = useAuth();
  
  if (loading) return <FullPageLoader title="Loading Evalix" subtitle="Synchronizing secure session" />;

  const isValidRole = role === 'teacher' || role === 'student';

  return (
    <Suspense fallback={<FullPageLoader title="Resolving View" subtitle="Loading page assets..." />}>
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure the global QueryClient with aggressive caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider>
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
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontFamily: '"DM Sans", sans-serif',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
