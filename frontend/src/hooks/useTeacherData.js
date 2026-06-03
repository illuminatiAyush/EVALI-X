import { useQuery } from '@tanstack/react-query';
import { apiService } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useTeacherDashboardData() {
  const { user } = useAuth();
  const teacherId = user?.id;

  // 1. Fetch Tests
  const { 
    data: tests = [], 
    isLoading: isTestsLoading,
    isFetching: isTestsFetching,
    error: testsError 
  } = useQuery({
    queryKey: ['assessments', teacherId],
    queryFn: () => apiService.getMyTests(),
    enabled: !!teacherId, // Only run if teacherId exists
  });

  // 2. Fetch Dashboard Stats
  const { 
    data: stats = { totalAttempts: 0, classAvg: 0 }, 
    isLoading: isStatsLoading,
    isFetching: isStatsFetching
  } = useQuery({
    queryKey: ['dashboard-stats', teacherId],
    queryFn: () => apiService.getTeacherDashboardStats(),
    enabled: !!teacherId,
  });

  // 3. Fetch Attempt Counts (dependent on tests)
  const testIds = tests.map(t => t.id);
  const { 
    data: attemptCounts = {}, 
    isLoading: isCountsLoading,
    isFetching: isCountsFetching
  } = useQuery({
    queryKey: ['attempt-counts', testIds],
    queryFn: () => apiService.getTestAttemptCounts(testIds),
    enabled: testIds.length > 0,
  });

  // Aggregate loading states
  const isLoading = isTestsLoading || isStatsLoading || (testIds.length > 0 && isCountsLoading);
  const isFetching = isTestsFetching || isStatsFetching || isCountsFetching;
  
  return {
    tests,
    stats,
    attemptCounts,
    isLoading,
    isFetching,
    error: testsError
  };
}
