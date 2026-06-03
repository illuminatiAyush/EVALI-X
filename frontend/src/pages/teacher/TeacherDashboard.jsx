import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useTeacherDashboardData } from '../../hooks/useTeacherData';
import { debug } from '../../utils/debugLogger';
import { 
  PlusCircle, 
  FileText, 
  Users, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  BrainCircuit,
  Calendar,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { formatISTDate } from '../../lib/timezone';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function TeacherDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();
  const { 
    tests, 
    stats: dashboardStats, 
    attemptCounts, 
    isLoading: loading, 
    isFetching, 
    error 
  } = useTeacherDashboardData();

  const pendingActions = React.useRef(new Set());

  useEffect(() => {
    // Set up realtime listener for new attempts and results, plus diagnostics for 'tests'
    debug.realtime.info('Subscription Connected: teacher-dashboard-updates');
    
    const filterParams = { event: 'UPDATE', schema: 'public', table: 'tests' };
    console.log('[REALTIME FILTER] Teacher Dashboard:', filterParams);

    const channel = supabase.channel('teacher-dashboard-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts' }, (payload) => {
        debug.teacher.info('Student Attempt Started', payload);
        toast.info('A student has started taking an assessment.');
        queryClient.invalidateQueries(['dashboard-stats']);
        queryClient.invalidateQueries(['attempt-counts']);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results' }, (payload) => {
        debug.teacher.info('Student Attempt Submitted', payload);
        toast.success('A student just submitted an assessment!');
        queryClient.invalidateQueries(['dashboard-stats']);
        queryClient.invalidateQueries(['attempt-counts']);
      })
      .on('postgres_changes', filterParams, (payload) => {
        // DIAGNOSTIC LISTENER
        console.log(`[MONITOR] Payload received at`, Date.now());
        console.log('[REALTIME CHANNEL]', channel.topic);
        console.log('[REALTIME PAYLOAD]', payload);
        
        // Clear the diagnostic timeout if this was our action
        if (pendingActions.current.has(payload.new?.id)) {
          pendingActions.current.delete(payload.new?.id);
          debug.realtime.info(`Successfully received realtime broadcast for test ${payload.new?.id}`);
        }
      })
      .on('system', { event: '*' }, (payload) => {
        if (payload.extension === 'postgres_changes' && payload.type === 'CHANNEL_ERROR') {
           console.error('[REALTIME CHANNEL_ERROR]', payload);
        }
      })
      .subscribe((status, err) => {
        console.log(`[MONITOR] Subscribed at`, Date.now());
        console.log('[REALTIME CHANNEL] teacher-dashboard-updates');
        console.log('[REALTIME STATUS]', status, err || '');
      });

    return () => {
      debug.realtime.info('Unsubscribing from teacher-dashboard-updates');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Diagnostic timeout wrapper
  const monitorRealtimeAction = (testId) => {
    console.log(`[MONITOR] Update sent at`, Date.now());
    debug.realtime.info(`Starting realtime monitor for test ${testId} (waiting up to 15s)`);
    pendingActions.current.add(testId);
    setTimeout(() => {
      if (pendingActions.current.has(testId)) {
        console.warn(`[REALTIME WARNING] No broadcast received for ${testId} after 15s. This is normal if the backend update completed successfully.`);
        pendingActions.current.delete(testId);
      }
    }, 15000);
  };

  const handleStartTest = async (testId) => {
    console.log('[START TEST] Button clicked', testId);
    console.log('[START TEST] Entering handler');
    debug.teacher.info('Assessment Started manually', { testId });
    try {
      monitorRealtimeAction(testId);
      console.log('[START TEST] Sending request to apiService');
      const res = await apiService.updateTestStatus(testId, 'start');
      console.log('[START TEST] Response', res);
      toast.success('Assessment started manually. It is now active.');
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    } catch (err) {
      console.error('[START TEST] Error in handler', err);
      debug.teacher.error('Failed to start assessment', err);
      toast.error(err.message || 'Failed to start assessment');
    }
  };

  const handleEndTest = async (testId) => {
    console.log('[TERMINATE] Button clicked', testId);
    toast('Force-end this assessment?', {
      description: 'All active attempts will be auto-submitted.',
      action: {
        label: 'Terminate',
        onClick: async () => {
          console.log('[TERMINATE] Entering handler for', testId);
          debug.teacher.info('Assessment Terminated manually', { testId });
          try {
            monitorRealtimeAction(testId);
            console.log('[TERMINATE] Sending terminate request to API');
            const res = await apiService.updateTestStatus(testId, 'end');
            console.log('[TERMINATE] API Response', res);
            toast.success('Assessment force-ended successfully.');
            queryClient.invalidateQueries({ queryKey: ['assessments'] });
          } catch (err) {
            console.error('[TERMINATE] API Error', err);
            debug.teacher.error('Failed to terminate assessment', err);
            toast.error(err.message || 'Failed to force-end assessment');
          }
        },
      },
      cancel: { label: 'Cancel' },
    });
  };

  const handleRestartTest = async (testId) => {
    console.log('[RESTART] Button clicked', testId);
    toast('Restart this assessment?', {
      description: 'This will reset the end time and make it active again.',
      action: {
        label: 'Restart',
        onClick: async () => {
          console.log('[RESTART] Entering handler for', testId);
          debug.teacher.info('Assessment Restarted manually', { testId });
          try {
            monitorRealtimeAction(testId);
            console.log('[RESTART] Sending restart request to API');
            const res = await apiService.updateTestStatus(testId, 'restart');
            console.log('[RESTART] API Response', res);
            toast.success('Assessment restarted successfully.');
            queryClient.invalidateQueries({ queryKey: ['assessments'] });
          } catch (err) {
            console.error('[RESTART] API Error', err);
            debug.teacher.error('Failed to restart assessment', err);
            toast.error(err.message || 'Failed to restart assessment');
          }
        },
      },
      cancel: { label: 'Cancel' },
    });
  };

  const stats = [
    { label: 'Generated Tests', value: tests.length, icon: BrainCircuit, color: 'text-zinc-900', bg: 'bg-zinc-100' },
    { label: 'Total Attempts', value: dashboardStats.totalAttempts, icon: Users, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Class Avg.', value: `${dashboardStats.classAvg}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-zinc-800">Welcome back 👋</h1>
          <p className="text-zinc-400 font-sans mt-1 text-sm">Manage your assessments and track student performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            to="/teacher/batches"
            variant="outline"
          >
            <Users size={18} className="mr-2" />
            Academic Sections
          </Button>
          <Button 
            to="/teacher/create-test"
            variant="primary"
          >
            <PlusCircle size={18} className="mr-2" />
            Initialize Assessment
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-12 gap-md"
      >
        {stats.map((stat, i) => (
          <Card key={i} p="sm" className="md:col-span-4 flex items-center justify-between bg-surface border border-border">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} className="sm:size-6" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
            <h3 className={`text-2xl sm:text-4xl font-display font-bold text-right ${stat.color}`}>{stat.value}</h3>
          </Card>
        ))}
      </motion.div>

      {/* Main Grid: Recent Tests & Activity */}
      <div className="grid lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              <div className="w-2 h-6 bg-brand rounded-sm"></div>
              Active Evaluations {isFetching && !loading && <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded">Syncing...</span>}
            </h2>
            <Link to="#" className="text-sm font-semibold text-brand hover:underline underline-offset-4 uppercase tracking-wider">View All</Link>
          </div>

          <Card p="0" className="overflow-hidden bg-background">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-text-muted font-medium font-sans">Loading assessments...</p>
              </div>
            ) : tests.length > 0 ? (
              <div className="divide-y divide-border">
                {tests.map((test) => {
                  const isExpired = test.end_time && test.status !== 'ended' ? (new Date(test.end_time) < currentTime) : false;
                  const displayStatus = isExpired ? 'ended' : test.status;
                  
                  return (
                  <div key={test.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface transition-colors group gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold group-hover:text-brand transition-colors">{test.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-text-muted">
                          <span className={`px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                            displayStatus === 'scheduled' ? 'bg-emerald-500/10 text-emerald-500' :
                            displayStatus === 'active' ? 'bg-brand/10 text-brand' :
                            displayStatus === 'ended' ? 'bg-surface text-text-muted border border-border' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {displayStatus}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span className="flex items-center gap-1 uppercase">
                            <Calendar size={12} />
                            {formatISTDate(test.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="text-2xl font-display font-bold leading-none">{attemptCounts[test.id] || 0}</p>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mt-1">Submissions</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {displayStatus === 'scheduled' && (
                          <Button 
                            onClick={() => handleStartTest(test.id)}
                            variant="primary"
                            className="px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                          >
                            Start Now
                          </Button>
                        )}
                        {(displayStatus === 'scheduled' || displayStatus === 'active') && (
                          <Button 
                            onClick={() => handleEndTest(test.id)}
                            variant="danger"
                            className={`px-3 py-1.5 text-xs ${displayStatus === 'active' ? 'animate-pulse' : ''}`}
                          >
                            Terminate
                          </Button>
                        )}
                        {displayStatus === 'ended' && (
                          <Button 
                            onClick={() => handleRestartTest(test.id)}
                            variant="primary"
                            className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                          >
                            Restart
                          </Button>
                        )}
                        {displayStatus === 'draft' ? (
                          <Button 
                            to={`/teacher/test/${test.id}`} 
                            variant="outline"
                            className="px-3 py-1.5 text-xs"
                          >
                            Configure
                            <ChevronRight size={14} className="ml-1" />
                          </Button>
                        ) : (
                          <Button 
                            to={`/teacher/analytics/${test.id}`} 
                            variant="primary"
                            className="px-3 py-1.5 text-xs"
                          >
                            Analytics
                            <ChevronRight size={14} className="ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-surface border border-border rounded-full flex items-center justify-center mx-auto mb-6 text-text-muted">
                  <BrainCircuit size={40} />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">No assessments found</h3>
                <p className="text-text-muted max-w-xs mx-auto mb-8 font-sans">
                  Create your first AI-generated assessment to get started.
                </p>
                <Button to="/teacher/create-test" variant="primary">
                  Create Now
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Activity */}
        <div className="lg:col-span-4">
          {tests.length > 0 && (
            <Card p="lg" className="bg-surface sticky top-28">
              <h3 className="font-display font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-brand" />
                Global Analytics
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-sans font-medium text-text-muted">Class Average</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-display font-bold text-emerald-500">{dashboardStats.classAvg}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-sm font-sans font-medium text-text-muted">Total Assessments</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-display font-bold text-brand">{tests.length}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-sans font-medium text-text-muted">Activity Level</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold uppercase tracking-wider ${dashboardStats.totalAttempts > 0 ? 'text-orange-500' : 'text-zinc-400'}`}>
                      {dashboardStats.totalAttempts > 0 ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
