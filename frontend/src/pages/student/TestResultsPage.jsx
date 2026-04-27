import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import { 
  Trophy, CheckCircle2, XCircle, ArrowLeft, BrainCircuit, Sparkles, BarChart3, Lightbulb, Target
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { formatISTDate } from '../../lib/timezone';

export default function TestResultsPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [id]);

  const loadResults = async () => {
    try {
      const results = await apiService.getTestResults(id);
      setResult(results[0] || null);
    } catch (err) {
      console.error('Error loading results:', err);
      toast.error(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 border-4 border-background border-t-brand rounded-full animate-spin shadow-cyan-glow mb-4"></div>
        <p className="text-text-muted font-sans font-medium text-sm">Loading results...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <Card p="xl" className="text-center py-20 max-w-md mx-auto mt-10 border-dashed">
        <Trophy size={64} className="mx-auto text-text-muted mb-6 opacity-50" />
        <h2 className="text-2xl font-display font-bold text-text mb-2">No Results Found</h2>
        <p className="text-text-muted font-sans mt-2 mb-8">You have not completed this assessment yet.</p>
        <Button to="/student/dashboard" variant="primary">
          Return to Dashboard
        </Button>
      </Card>
    );
  }

  const marks = result.marks || 0;
  const total = result.ai_feedback?.total_questions || result.tests?.total_questions || 0;
  const percentage = result.ai_feedback?.percentage || 0;
  const breakdown = result.answers ? Object.values(result.answers) : [];
  const ai_feedback = result.ai_feedback;
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <Button to="/student/dashboard" variant="ghost" className="px-3 py-2">
          <ArrowLeft size={18} className="mr-2" />
          Dashboard
        </Button>
        <div className="flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand border border-brand/20 rounded-md font-semibold text-xs uppercase tracking-wider shadow-cyan-glow">
          <CheckCircle2 size={16} />
          Assessment Completed
        </div>
      </div>

      {/* Score Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card p="0" className="overflow-hidden bg-background">
          <div className="bg-surface border-b border-border p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-2 border-brand/30 bg-brand/10 mb-6 shadow-cyan-glow relative z-10"
            >
              <span className="text-5xl font-display font-bold text-brand">{percentage}%</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand/70 mt-2">Score</span>
            </motion.div>
            
            <h1 className="text-3xl font-display font-extrabold text-text mb-2 relative z-10">{result.tests?.title || "ASSESSMENT RESULT"}</h1>
            <p className="text-text-muted font-sans font-medium relative z-10">
              {marks} of {total} Questions Correct
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-8 text-center bg-background">
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Status</p>
              <p className="text-lg font-display font-bold text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]">PASSED</p>
            </div>
            <div className="p-8 text-center bg-background">
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Date</p>
              <p className="text-sm font-display font-bold text-text">
                {formatISTDate(result.submitted_at || result.created_at)}
              </p>
            </div>
            <div className="p-8 text-center bg-background">
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">Warnings</p>
              <p className={`text-lg font-display font-bold ${result.violation_count > 0 ? 'text-danger shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-text'}`}>
                {result.violation_count || 0}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* AI Feedback Section */}
      {ai_feedback?.overall_summary && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card p="xl" className="bg-gradient-to-br from-brand/10 to-transparent border-brand/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-brand pointer-events-none">
              <BrainCircuit size={100} />
            </div>
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="w-10 h-10 bg-brand/20 rounded-md border border-brand/30 flex items-center justify-center text-brand">
                <Sparkles size={20} />
              </div>
              <h2 className="text-2xl font-display font-bold text-text">AI Feedback</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-10 relative z-10">
              <div className="space-y-6">
                {ai_feedback.strengths?.length > 0 && (
                  <div className="p-6 bg-surface border border-border rounded-xl">
                    <h3 className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider mb-4 text-emerald-500">
                      <Target size={16} />
                      Your Strengths
                    </h3>
                    <ul className="space-y-3">
                      {ai_feedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm font-sans font-medium text-text flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ai_feedback.weak_topics?.length > 0 && (
                  <div className="p-6 bg-surface border border-border rounded-xl">
                    <h3 className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider mb-4 text-amber-500">
                      <Lightbulb size={16} />
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-3">
                      {ai_feedback.weak_topics.map((w, i) => (
                        <li key={i} className="text-sm font-sans font-medium text-text flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand flex items-center gap-2 border-b border-border/50 pb-2">
                  <BarChart3 size={16} />
                  Overall Summary
                </h3>
                <p className="text-base leading-relaxed font-sans text-text-muted italic">
                  "{ai_feedback.overall_summary}"
                </p>
                <div className="pt-6">
                  <Button variant="outline" className="text-xs">
                    Download Report
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Breakdown Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold text-text flex items-center gap-3">
          <CheckCircle2 className="text-brand" size={24} />
          Question Breakdown
        </h2>
        
        <div className="space-y-4">
          {breakdown?.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.05) }}
            >
              <Card 
                p="md" 
                className={`border-l-4 ${
                  item.is_correct ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-danger bg-danger/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-text font-display font-bold leading-relaxed">{item.question_text || item.question || `Question ${i + 1}`}</p>
                    <div className="flex flex-wrap gap-8 pt-2">
                      <div className="text-sm">
                        <span className="font-semibold text-xs text-text-muted uppercase tracking-wider block mb-1">Your Answer</span>
                        <span className={`font-sans font-bold ${item.is_correct ? 'text-emerald-500' : 'text-danger'}`}>
                          {item.student_answer || item.student || 'No Answer'}
                        </span>
                      </div>
                      {!item.is_correct && (
                        <div className="text-sm">
                          <span className="font-semibold text-xs text-text-muted uppercase tracking-wider block mb-1">Correct Answer</span>
                          <span className="font-sans font-bold text-text">{item.correct_answer || item.correct}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 border ${
                    item.is_correct ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-danger/10 text-danger border-danger/30'
                  }`}>
                    {item.is_correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
