import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';
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
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({ totalAttempts: 0, classAvg: 0 });
  const [attemptCounts, setAttemptCounts] = useState({});

  useEffect(() => {
    let isMounted = true;
    loadDashboardData(isMounted);

    // Set up realtime listener for new attempts and results
    const channel = supabase.channel('teacher-dashboard-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts' }, () => {
        if (isMounted) {
          toast.info('A student has started taking a test.');
          loadDashboardData(isMounted);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results' }, () => {
        if (isMounted) {
          toast.success('A student just submitted a test!');
          loadDashboardData(isMounted);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async (isMounted) => {
    try {
      // Load tests — may fail if get-tests edge function not deployed
      let testList = [];
      try {
        const data = await apiService.getMyTests();
        if (isMounted) testList = data || [];
      } catch (err) {
        console.warn('Could not load tests:', err.message);
      }
      
      if (isMounted) setTests(testList);

      // Load stats — uses direct DB queries, more resilient
      try {
        const stats = await apiService.getTeacherDashboardStats();
        if (isMounted) setDashboardStats(stats);
      } catch (err) {
        console.warn('Could not load stats:', err.message);
      }

      // Load attempt counts
      if (testList.length > 0) {
        try {
          const counts = await apiService.getTestAttemptCounts(testList.map(t => t.id));
          if (isMounted) setAttemptCounts(counts);
        } catch (err) {
          console.warn('Could not load attempt counts:', err.message);
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleStartTest = async (testId) => {
    try {
      await apiService.setTestStatus(testId, 'start');
      toast.success('Assessment started manually. It is now active.');
      loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to start assessment');
    }
  };

  const handleEndTest = async (testId) => {
    toast('Force-end this assessment?', {
      description: 'All active attempts will be auto-submitted.',
      action: {
        label: 'Terminate',
        onClick: async () => {
          try {
            await apiService.setTestStatus(testId, 'end');
            toast.success('Assessment force-ended successfully.');
            loadDashboardData();
          } catch (err) {
            toast.error(err.message || 'Failed to force-end assessment');
          }
        },
      },
      cancel: { label: 'Cancel' },
    });
  };

  const stats = [
    { label: 'Generated Tests', value: tests.length, icon: BrainCircuit, color: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Total Attempts', value: dashboardStats.totalAttempts, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Class Avg.', value: `${dashboardStats.classAvg}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-text-muted font-sans mt-2">Create AI-generated assessments and view class performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            to="/teacher/batches"
            variant="outline"
          >
            <Users size={18} className="mr-2" />
            Manage Classes
          </Button>
          <Button 
            to="/teacher/create-test"
            variant="primary"
          >
            <PlusCircle size={18} className="mr-2" />
            New Assessment
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
          <Card key={i} p="md" className="md:col-span-4 flex items-center justify-between bg-surface border border-border">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
            <h3 className={`text-4xl font-display font-bold text-right ${stat.color}`}>{stat.value}</h3>
          </Card>
        ))}
      </motion.div>

      {/* Main Grid: Recent Tests & Activity */}
      <div className="grid lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              <div className="w-2 h-6 bg-brand rounded-sm"></div>
              Recent Assessments
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
                {tests.map((test) => (
                  <div key={test.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface transition-colors group gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold group-hover:text-brand transition-colors">{test.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-text-muted">
                          <span className={`px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                            test.status === 'scheduled' ? 'bg-emerald-500/10 text-emerald-500' :
                            test.status === 'active' ? 'bg-brand/10 text-brand' :
                            test.status === 'ended' ? 'bg-surface text-text-muted border border-border' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {test.status}
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
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mt-1">Attempts</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {test.status === 'scheduled' && (
                          <>
                            <Button 
                              onClick={() => handleStartTest(test.id)}
                              variant="primary"
                              className="px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                            >
                              Start Now
                            </Button>
                            <Button 
                              onClick={() => handleEndTest(test.id)}
                              variant="danger"
                              className="px-3 py-1.5 text-xs"
                            >
                              Terminate
                            </Button>
                          </>
                        )}
                        {test.status === 'draft' ? (
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
                ))}
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
                    <span className={`text-sm font-semibold uppercase tracking-wider ${dashboardStats.totalAttempts > 0 ? 'text-purple-500' : 'text-text-muted'}`}>
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
