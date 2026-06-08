import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Clock, 
  ChevronRight,
  BrainCircuit,
  Calendar,
  ArrowRight,
  AlertTriangle,
  FileText,
  Activity,
  Bell,
  PlusCircle
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { formatISTDate } from '../../lib/timezone';
import { FullPageLoader } from '../../components/ui/Loader';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch Command Center Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['teacher-dashboard-stats', user?.id],
    queryFn: () => apiService.getTeacherDashboardStats(),
    enabled: !!user,
  });

  // Fetch Tests (to display Active Assessments)
  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['assessments', user?.id],
    queryFn: () => apiService.getMyTests(),
    enabled: !!user,
  });

  // Fetch recent notifications for Activity Feed
  const { data: notifications = [], isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => apiService.getNotifications(),
    enabled: !!user,
  });

  const activeTests = tests.filter(t => t.status === 'active');
  const isLoading = statsLoading || testsLoading || notifsLoading;

  if (isLoading) {
    return <FullPageLoader title="Loading Command Center" subtitle="Fetching realtime metrics" />;
  }

  const kpis = [
    { label: 'Active Assessments', value: stats?.activeAssessments || 0, icon: Activity, color: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Students Enrolled', value: stats?.totalStudents || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pending Submissions', value: stats?.pendingSubmissions || 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Recent Violations', value: stats?.recentViolations || 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-text">Command Center</h1>
          <p className="text-text-muted font-sans mt-1 text-sm">Real-time overview of your academic operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button to="/teacher/batches" variant="outline">
            <Users size={18} className="mr-2" />
            Workspace
          </Button>
          <Button to="/teacher/create-test" variant="primary">
            <PlusCircle size={18} className="mr-2" />
            New Assessment
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md"
      >
        {kpis.map((stat, i) => (
          <Card key={i} p="sm" className="flex items-center justify-between bg-surface border border-border">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</p>
                <h3 className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</h3>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-12 gap-lg">
        {/* Active Assessments */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-3">
              <div className="w-2 h-6 bg-brand rounded-sm"></div>
              Live Assessments
            </h2>
            <Link to="/teacher/batches" className="text-sm font-semibold text-brand hover:underline underline-offset-4">View All</Link>
          </div>

          <Card p="0" className="overflow-hidden bg-background">
            {activeTests.length > 0 ? (
              <div className="divide-y divide-border">
                {activeTests.map((test) => (
                  <div key={test.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface transition-colors group gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand">
                        <Activity size={24} className="animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-text">{test.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-text-muted">
                          <span className="flex items-center gap-1 uppercase">
                            <Clock size={12} />
                            Started: {formatISTDate(test.updated_at || test.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Button 
                        onClick={() => navigate(`/teacher/test/${test.id}/live`)}
                        variant="primary"
                        className="px-4 py-2 text-sm bg-brand hover:bg-brand-hover text-white"
                      >
                        Live Monitor
                        <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4 text-text-muted">
                  <BrainCircuit size={32} />
                </div>
                <h3 className="text-lg font-display font-bold mb-1">No Active Assessments</h3>
                <p className="text-text-muted text-sm max-w-xs mb-6">
                  Start an assessment from your workspace to monitor it live.
                </p>
                <Button to="/teacher/batches" variant="outline" className="text-sm">
                  Go to Workspace
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Realtime Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-3">
              <Bell size={20} className="text-text-muted" />
              Activity Feed
            </h2>
          </div>

          <Card p="0" className="bg-surface overflow-hidden max-h-[600px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.slice(0, 10).map((notif) => (
                  <div key={notif.id} className="p-4 hover:bg-surface-muted transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        notif.type === 'violation' ? 'bg-red-500' : 
                        notif.type === 'submission' ? 'bg-emerald-500' : 'bg-brand'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-text">{notif.title}</p>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-text-muted/70 mt-2 block">
                          {new Date(notif.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted text-sm">
                No recent activity.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
