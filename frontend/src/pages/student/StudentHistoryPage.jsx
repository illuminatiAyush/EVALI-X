import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import { 
  BookOpen, Clock, ChevronRight, Trophy, CheckCircle2, Calendar, Search, ArrowRight
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function StudentHistoryPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const data = await apiService.getStudentResults();
      setResults(data || []);
    } catch (err) {
      console.error('Error loading results:', err);
      toast.error(err.message || 'Failed to load assessment history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 w-full">
      <div>
        <h1 className="text-3xl font-display font-extrabold text-text tracking-tight">Assessment History</h1>
        <p className="text-text-muted font-sans mt-1">Review your past performances and track your progress.</p>
      </div>

      <Card p="0" className="overflow-hidden bg-background">
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-12 h-12 border-4 border-background border-t-brand rounded-full animate-spin mx-auto mb-4 shadow-cyan-glow"></div>
            <p className="text-text-muted font-semibold text-xs uppercase tracking-wider">Loading records...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="divide-y divide-border">
            {results.map((res, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-8 flex items-center justify-between hover:bg-surface/50 transition-colors group"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-display font-bold border ${
                    res.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                    res.percentage >= 50 ? 'bg-brand/10 text-brand border-brand/30 shadow-cyan-glow' : 'bg-danger/10 text-danger border-danger/30'
                  }`}>
                    <span className="text-xl">{res.percentage}%</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mt-1">Score</span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-display font-bold text-text group-hover:text-brand transition-colors">
                      {res.test?.title || "Unknown Assessment"}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-text-muted tracking-wider">
                      <span className="flex items-center gap-1.5 uppercase">
                        <Calendar size={14} />
                        {new Date(res.created_at).toLocaleDateString()}
                      </span>
                      <span className="w-1 h-1 rounded-sm bg-border"></span>
                      <span className="flex items-center gap-1.5 uppercase">
                        <Clock size={14} />
                        {res.marks} of {res.total_marks || res.test?.num_questions} Correct
                      </span>
                    </div>
                  </div>
                </div>

                <Button 
                  to={`/student/results/${res.test_id}`}
                  variant="outline"
                  className="px-4 py-2 text-xs font-semibold"
                >
                  View Details
                  <ChevronRight size={14} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-surface border border-border rounded-xl flex items-center justify-center mx-auto mb-6 text-text-muted shadow-inner">
              <BookOpen size={32} />
            </div>
            <h3 className="text-xl font-display font-bold text-text mb-2">No History Found</h3>
            <p className="text-text-muted max-w-xs mx-auto mb-8 font-sans">
              Complete your first assessment to see your history here.
            </p>
            <Button 
              to="/student/dashboard"
              variant="primary"
            >
              Go to Dashboard
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
