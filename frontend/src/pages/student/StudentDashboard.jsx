import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { debug } from '../../utils/debugLogger';
import { 
  BookOpen, Clock, Trophy, CheckCircle2, BrainCircuit, ArrowRight, GraduationCap, Users
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { formatIST, formatISTDate } from '../../lib/timezone';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function StudentDashboard() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({ totalAttempts: 0, avgAccuracy: 0, learningPoints: 0 });
  const [attemptMap, setAttemptMap] = useState({});

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  // Real-time interval for dynamic dashboard unlocks
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      debug.db.info('Fetching Assessments & Stats for Student Dashboard');
      try {
        let batchData = [];
        let allTests = [];
        let resultsMap = {};
        
        try {
          const res = await apiService.getBatches();
          if (mounted && res?.data) {
            batchData = res.data;
            setBatches(batchData);
          }
        } catch (err) {
          debug.db.error('Could not load batches:', err.message);
        }

        try {
          const results = await apiService.getStudentResults();
          if (results && results.length > 0) {
            results.forEach(r => resultsMap[r.test_id] = true);
          }
          if (mounted) setAttemptMap(resultsMap);
        } catch (err) {
          debug.db.error('Could not load results:', err.message);
        }

        try {
          const stats = await apiService.getStudentDashboardStats();
          if (mounted) setDashboardStats(stats);
        } catch (err) {
          debug.db.error('Could not load stats:', err.message);
        }
        
        try {
          allTests = await apiService.getMyTests();
        } catch (err) {
          debug.db.error('Could not load tests:', err.message);
        }

        if (mounted) {
          debug.db.info(`Fetch Success — Found ${allTests.length} total tests, ${Object.keys(resultsMap).length} attempts`);
          const available = (allTests || []).filter(test => test.status !== 'draft');
          setTests(available);
        }
      } catch (err) {
        debug.db.error('Dashboard load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboardData();

    // Set up realtime listener for test changes (start, end, restart, new assignments)
    console.log('[REALTIME STATUS] Connecting to assessment-events channel...');
    debug.realtime.info('Subscription Connected: assessment-events');
    const channelName = `student-dashboard-tests-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tests' }, (payload) => {
        debug.realtime.info('Test Updated', payload);
        const newStatus = payload.new?.status;
        if (newStatus === 'active') {
          toast.success('🟢 An assessment is now LIVE! You can start it.', { duration: 6000 });
        } else if (newStatus === 'ended') {
          toast.info('An assessment has ended.');
        }
        if (mounted) loadDashboardData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'test_batches' }, (payload) => {
        debug.realtime.info('Test Batch Assigned', payload);
        toast.info('A new test was just assigned to your batch!');
        if (mounted) loadDashboardData();
      })
      .subscribe((status, err) => {
        console.log('[REALTIME CHANNEL] student-dashboard-tests');
        console.log('[REALTIME STATUS]', status, err || '');
      });

    return () => {
      mounted = false;
      debug.realtime.info('Student Dashboard Realtime unmounted');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight">Candidate Portal</h1>
          <p className="text-text-muted font-sans mt-2 text-sm sm:text-base">Access your assigned evaluations and monitor your academic progression.</p>
        </div>
        <Button 
          to="/student/join-batch"
          variant="primary"
          className="px-lg"
        >
          <Users size={18} className="mr-2" />
          Enrol in Section
        </Button>
      </div>

      {/* Stats Summary (Asymmetric layout) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-12 gap-md"
      >
        <Card p="sm" className="md:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
              <BookOpen size={20} className="sm:size-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider">Evaluations Finalized</p>
            </div>
          </div>
          <h3 className="text-2xl sm:text-4xl font-display font-bold text-right">{dashboardStats.totalAttempts}</h3>
        </Card>

        <Card p="sm" className="md:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
              <Trophy size={20} className="sm:size-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider">Avg. Score</p>
            </div>
          </div>
          <h3 className="text-2xl sm:text-4xl font-display font-bold text-right text-emerald-500">{dashboardStats.avgAccuracy}%</h3>
        </Card>

        <Card p="sm" className="md:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-zinc-900/10 text-zinc-900">
              <GraduationCap size={20} className="sm:size-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider">Academic Credits</p>
            </div>
          </div>
          <h3 className="text-2xl sm:text-4xl font-display font-bold text-right text-zinc-900">{dashboardStats.learningPoints}</h3>
        </Card>
      </motion.div>

      {/* Batches Section */}
      {batches.length > 0 && (
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              <div className="w-2 h-6 bg-zinc-900 rounded-sm"></div>
              Institutional Sections
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-md">
            {batches.map((batch) => (
              <Card 
                key={batch.id} 
                p="lg" 
                interactive
                onClick={() => setSelectedBatchId(selectedBatchId === batch.id ? null : batch.id)}
                className={`cursor-pointer transition-all border-l-4 ${
                  selectedBatchId === batch.id 
                    ? 'border-l-zinc-900 border-zinc-900/50 bg-zinc-900/5 scale-[1.02]' 
                    : 'border-l-zinc-900/30 hover:border-l-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users size={18} className={`transition-colors ${selectedBatchId === batch.id ? 'text-zinc-900' : 'text-zinc-900/70'}`} />
                  <h3 className="font-display font-bold text-lg">{batch.name}</h3>
                </div>
                <p className="text-sm text-text-muted font-sans">
                  Teacher: {batch.teacher?.name || 'Unknown'}
                </p>
                {batch.expires_at && (
                  <p className="text-xs text-text-muted mt-4">
                    Expires: {formatISTDate(batch.expires_at)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Test List Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold flex items-center gap-3">
            <div className="w-2 h-6 bg-brand rounded-sm"></div>
            {selectedBatchId 
              ? `Assessments for ${batches.find(b => b.id === selectedBatchId)?.name || 'Batch'}` 
              : 'All Pending Assessments'}
          </h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
            Total: {selectedBatchId ? tests.filter(t => t.batch_ids && t.batch_ids.includes(selectedBatchId)).length : tests.length}
          </div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid md:grid-cols-2 gap-md"
        >
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} p="lg" className="animate-pulse">
                <div className="h-6 w-2/3 bg-border rounded mb-4"></div>
                <div className="h-4 w-1/3 bg-border rounded"></div>
              </Card>
            ))
          ) : (selectedBatchId ? tests.filter(t => t.batch_ids && t.batch_ids.includes(selectedBatchId)) : tests).length > 0 ? (
            (selectedBatchId ? tests.filter(t => t.batch_ids && t.batch_ids.includes(selectedBatchId)) : tests).map((test) => {
              const isUpcoming = test.status === 'scheduled' || (test.start_time && new Date(test.start_time) > currentTime);
              return (
              <motion.div variants={itemVariants} key={test.id}>
                <Card p="lg" interactive className="flex flex-col h-full border-l-4 border-l-transparent hover:border-l-brand">
                  <div className="flex justify-between items-start mb-6">
                    <div className="px-3 py-1 rounded-md bg-surface border border-border text-text-muted text-xs font-semibold uppercase tracking-wider">
                      Level: {test.difficulty}
                    </div>
                    <div className="text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase">
                      <Clock size={16} />
                      {test.duration_minutes || (test.total_questions * 2) || 30} MIN
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-display font-bold mb-2">
                    {test.title}
                  </h3>
                  <p className="text-text-muted text-sm line-clamp-2 mb-8 font-sans flex-1">
                    Topic: {test.prompt || "General Topics"}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-border mt-auto">
                    <div className="flex items-center gap-2">
                      {attemptMap[test.id] ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 uppercase">
                          <CheckCircle2 size={16} /> Completed
                        </span>
                      ) : test.status === 'scheduled' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 uppercase">
                          <Clock size={16} /> Upcoming
                        </span>
                      ) : test.status === 'ended' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-text-muted uppercase">
                          <Clock size={16} /> Ended
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-brand uppercase">
                          <ArrowRight size={16} /> Active
                        </span>
                      )}
                    </div>
                    
                    {attemptMap[test.id] ? (
                      <div className="flex gap-2">
                        <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">Assessment already completed</Button>
                        <Button to={`/student/results/${test.id}`} variant="primary">View Results</Button>
                      </div>
                    ) : test.status === 'scheduled' ? (
                      <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                        Assessment not yet started
                      </Button>
                    ) : test.status === 'ended' ? (
                      <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                        Assessment ended
                      </Button>
                    ) : test.status === 'active' ? (
                      <Button to={`/student/test/${test.id}`} variant="primary">
                        Start Assessment
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </motion.div>
              );
            })
          ) : (
            <Card p="xl" className="col-span-full border-dashed flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 bg-surface border border-border rounded-xl flex items-center justify-center mb-6 text-text-muted">
                <BrainCircuit size={32} />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">No Pending Assessments</h3>
              <p className="text-text-muted font-sans max-w-xs mx-auto">
                You have no pending assessments at this time.
              </p>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Recommendations / History Link */}
      <Card p="xl" className="bg-gradient-to-br from-brand/10 to-transparent border-brand/20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-brand pointer-events-none">
          <GraduationCap size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-display font-bold mb-2">Learning Insights</h2>
          <p className="text-text-muted font-sans max-w-lg">
            Complete 3 more assessments to unlock personalized learning recommendations based on your performance.
          </p>
        </div>
        <Button variant="outline" className="relative z-10 whitespace-nowrap bg-background">
          View Insights
        </Button>
      </Card>
    </div>
  );
}
