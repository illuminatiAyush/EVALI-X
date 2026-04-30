import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
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

  useEffect(() => {
    loadDashboardData();

    // Set up realtime listener for new tests
    const channel = supabase.channel('student-dashboard-tests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'test_batches' }, () => {
        toast.info('A new test was just assigned to your batch!');
        loadDashboardData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tests' }, () => {
        // Also listen to tests in case it's a global test
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDashboardData = async (isMounted) => {
    try {
      let available = [];
      try {
        const batchData = await apiService.getBatches();
        if (isMounted && batchData?.data) {
          setBatches(batchData.data);
        }
      } catch (err) {
        console.warn('Could not load batches:', err.message);
      }

      try {
        const allTests = await apiService.getMyTests();
        const now = new Date();
        available = (allTests || []).filter(test => {
          if (test.status !== 'scheduled' && test.status !== 'active') return false;
          return true;
        }).map(test => {
          // Mark tests that haven't started yet as 'upcoming'
          const isUpcoming = test.status === 'scheduled' && test.start_time && new Date(test.start_time) > now;
          return { ...test, _upcoming: isUpcoming };
        });
      } catch (err) {
        console.warn('Could not load tests:', err.message);
      }
      
      if (isMounted) setTests(available);

      try {
        const stats = await apiService.getStudentDashboardStats();
        if (isMounted) setDashboardStats(stats);
      } catch (err) {
        console.warn('Could not load stats:', err.message);
      }

      if (available.length > 0) {
        try {
          const results = await apiService.getStudentResults();
          const map = {};
          if (results && results.length > 0) {
            results.forEach(r => map[r.test_id] = true);
          }
          if (isMounted) setAttemptMap(map);
        } catch (err) {
          console.warn('Could not load results:', err.message);
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight">Student Dashboard</h1>
          <p className="text-text-muted font-sans mt-2">Welcome to your dashboard. View and take your assessments below.</p>
        </div>
        <Button 
          to="/student/join-batch"
          variant="primary"
          className="px-lg"
        >
          <Users size={18} className="mr-2" />
          Join Class
        </Button>
      </div>

      {/* Stats Summary (Asymmetric layout) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-12 gap-md"
      >
        <Card p="md" className="md:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Assessments Taken</p>
            </div>
          </div>
          <h3 className="text-4xl font-display font-bold text-right">{dashboardStats.totalAttempts}</h3>
        </Card>

        <Card p="md" className="md:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Avg. Score</p>
            </div>
          </div>
          <h3 className="text-4xl font-display font-bold text-right text-emerald-500">{dashboardStats.avgAccuracy}%</h3>
        </Card>

        <Card p="md" className="md:col-span-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Points</p>
            </div>
          </div>
          <h3 className="text-4xl font-display font-bold text-right text-purple-500">{dashboardStats.learningPoints}</h3>
        </Card>
      </motion.div>

      {/* Batches Section */}
      {batches.length > 0 && (
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              <div className="w-2 h-6 bg-purple-500 rounded-sm"></div>
              My Batches
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
                    ? 'border-l-purple-500 border-purple-500/50 bg-purple-500/5 scale-[1.02]' 
                    : 'border-l-purple-500/30 hover:border-l-purple-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users size={18} className={`transition-colors ${selectedBatchId === batch.id ? 'text-purple-500' : 'text-purple-500/70'}`} />
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
            (selectedBatchId ? tests.filter(t => t.batch_ids && t.batch_ids.includes(selectedBatchId)) : tests).map((test) => (
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
                      ) : test._upcoming ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 uppercase">
                          <Clock size={16} /> Starts {formatIST(test.start_time)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-brand uppercase">
                          <ArrowRight size={16} /> Not Started
                        </span>
                      )}
                    </div>
                    
                    {attemptMap[test.id] ? (
                      <Button 
                        to={`/student/results/${test.id}`}
                        variant="outline"
                      >
                        View Results
                      </Button>
                    ) : test._upcoming ? (
                      <Button 
                        variant="outline"
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      >
                        Not Yet Available
                      </Button>
                    ) : (
                      <Button 
                        to={`/student/test/${test.id}`}
                        variant="primary"
                      >
                        Give Test
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
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
