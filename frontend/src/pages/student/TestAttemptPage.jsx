import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../lib/api';
import { 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  BrainCircuit, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function TestAttemptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violationWarning, setViolationWarning] = useState(false);

  const attemptRef = useRef(null);

  useEffect(() => {
    loadTestAttempt();
  }, [id]);

  const loadTestAttempt = async () => {
    try {
      const data = await apiService.startAttempt(id);
      setAttempt(data.attempt);
      attemptRef.current = data.attempt;
      setQuestions(data.questions);
      setAnswers(data.attempt.answers || {});
      
      if (data.attempt.ends_at) {
        const remaining = Math.floor((new Date(data.attempt.ends_at) - new Date()) / 1000);
        setTimeLeft(Math.max(0, remaining));
      } else {
        setTimeLeft(data.remaining_seconds || 0);
      }
      
      if (data.attempt.status === 'completed') {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Error starting attempt:', err);
      toast.error('Failed to initialize session.');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!attempt || isSubmitted) return;

    if (timeLeft > 0) {
      const timer = setInterval(() => {
        if (attempt.ends_at) {
          const remaining = Math.floor((new Date(attempt.ends_at) - new Date()) / 1000);
          setTimeLeft(Math.max(0, remaining));
        } else {
          setTimeLeft(prev => Math.max(0, prev - 1));
        }
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft <= 0) {
      toast.error("Time expired. Auto-submitting assessment...");
      handleSubmit('timeout');
    }
  }, [timeLeft, isSubmitted, attempt]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !isSubmitted && attemptRef.current) {
        try {
          const res = await apiService.recordViolation(attemptRef.current.id);
          if (res.auto_submitted) {
            setIsSubmitted(true);
            toast.error("Session ended due to multiple tab switches.");
          } else {
            setViolationWarning(true);
            toast.error(`WARNING: Window switch detected. Warnings: ${res.violation_count}/3`);
          }
        } catch (err) {
          console.error('Violation record error', err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSubmitted]);

  useEffect(() => {
    if (isSubmitted || !attempt) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiService.getTestById(id);
        if (data.status === 'ended') {
          toast.error("Session ended by instructor. Auto-submitting...");
          handleSubmit('teacher_stopped');
        }
      } catch (err) {
        console.error('Status check error', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, isSubmitted, attempt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswer = async (questionId, answer) => {
    const qIndex = currentQuestion;
    setAnswers(prev => ({ ...prev, [qIndex]: answer }));
    
    try {
      await apiService.saveAnswer(attempt.id, questionId, answer);
    } catch (err) {
      toast.error('Failed to sync data');
    }
  };

  const handleSubmit = async (reason = 'completed') => {
    setIsSubmitting(true);
    try {
      await apiService.submitAttempt(attempt.id, reason);
      setIsSubmitted(true);
      toast.success("Assessment submitted successfully.");
      
      setTimeout(() => {
        navigate(`/student/results/${id}`);
      }, 2000);
    } catch (err) {
      toast.error('Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-14 h-14 border-4 border-background border-t-brand rounded-full animate-spin mb-6 shadow-cyan-glow"></div>
        <p className="text-text font-display font-bold text-xl">Loading Assessment...</p>
        <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mt-2">Preparing your questions</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card p="xl" className="max-w-md w-full text-center bg-surface">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-display font-extrabold text-text mb-4">Assessment Complete</h2>
            <p className="text-text-muted font-sans mb-10">
              Your answers have been saved. Your instructor will review them soon.
            </p>
            <Button 
              onClick={() => navigate('/student/dashboard')}
              variant="primary"
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      
      {/* Violation Warning Modal */}
      <AnimatePresence>
        {violationWarning && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-surface p-10 rounded-2xl max-w-md w-full shadow-2xl text-center border-2 border-danger/50"
            >
              <div className="w-20 h-20 bg-danger/10 text-danger rounded-xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-display font-extrabold text-text mb-3 tracking-tight">Warning!</h2>
              <p className="text-text-muted font-sans mb-8">
                You have switched tabs or windows. This activity is logged. Repeated warnings may end your session.
              </p>
              <Button 
                onClick={() => setViolationWarning(false)}
                variant="danger"
                className="w-full"
              >
                Acknowledge
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Navbar */}
      <nav className="h-20 bg-surface border-b border-border px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand/10 text-brand border border-brand/20 rounded-lg flex items-center justify-center shadow-cyan-glow">
            <BrainCircuit size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Question {currentQuestion + 1} of {questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`px-4 py-1.5 rounded-sm border flex items-center gap-2 font-display font-bold text-sm tracking-widest transition-colors ${
            timeLeft < 60 ? 'border-danger/30 bg-danger/10 text-danger animate-pulse' : 'border-border bg-background text-text'
          }`}>
            <Clock size={14} />
            {formatTime(timeLeft)}
          </div>
          <Button 
            onClick={() => { if(confirm('Quit assessment? Unsaved answers will be lost.')) navigate('/student/dashboard'); }}
            variant="ghost"
            className="hidden sm:flex p-2 text-text-muted hover:text-danger hover:bg-danger/10"
          >
            <XCircle size={20} />
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center py-12 px-6">
        <div className="max-w-3xl w-full">
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-surface border border-border rounded-full mb-12 flex overflow-hidden">
            {questions.map((_, i) => (
              <div 
                key={i} 
                className={`h-full flex-1 border-r border-background transition-all duration-500 ${
                  i <= currentQuestion ? 'bg-brand shadow-cyan-glow' : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* Question Area */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card p="xl" className="bg-surface">
                <div className="mb-10">
                  <span className="text-xs font-semibold text-brand uppercase tracking-wider mb-4 block flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
                    Question {currentQuestion + 1}
                  </span>
                  <h2 className="text-2xl font-display font-bold text-text leading-snug">
                    {q.question}
                  </h2>
                </div>

                <div className="space-y-4">
                  {q.type === 'mcq' ? (
                    q.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(q.id, option)}
                        className={`w-full p-6 rounded-xl border text-left font-sans font-medium transition-all flex items-center gap-4 group ${
                          answers[currentQuestion] === option 
                            ? 'border-brand/50 bg-brand/10 text-brand shadow-sm' 
                            : 'border-border bg-background text-text-muted hover:border-text-muted hover:bg-surface'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-md border flex items-center justify-center font-display text-sm font-bold transition-colors ${
                          answers[currentQuestion] === option ? 'border-brand bg-brand text-background' : 'border-border bg-surface text-text-muted'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="flex-1">{option}</span>
                        {answers[currentQuestion] === option && <CheckCircle2 size={20} className="text-brand" />}
                      </button>
                    ))
                  ) : (
                    <textarea 
                      value={answers[currentQuestion] || ''}
                      onBlur={(e) => handleAnswer(q.id, e.target.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnswers(prev => ({ ...prev, [currentQuestion]: val }));
                      }}
                      placeholder="Type your answer here..."
                      className="w-full px-6 py-6 rounded-xl border border-border bg-background text-text focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none font-sans min-h-[200px]"
                    />
                  )}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-10">
            <Button
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
              variant="outline"
              className="px-6 py-3"
            >
              <ChevronLeft size={18} className="mr-2" />
              Previous
            </Button>

            {currentQuestion === questions.length - 1 ? (
              <Button
                onClick={() => handleSubmit('completed')}
                disabled={isSubmitting}
                variant="primary"
                className="px-8 py-3 tracking-widest font-display font-bold uppercase"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                <Send size={16} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                variant="primary"
                className="px-6 py-3"
              >
                Next Question
                <ChevronRight size={18} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Question Map */}
      <div className="bg-surface border-t border-border p-4 flex justify-center gap-2 overflow-x-auto custom-scrollbar">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQuestion(i)}
            className={`w-10 h-10 rounded-md font-display font-bold text-xs transition-all flex items-center justify-center shrink-0 border ${
              currentQuestion === i 
                ? 'bg-brand text-background border-brand shadow-cyan-glow' 
                : answers[i] 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                  : 'bg-background text-text-muted border-border hover:border-text-muted'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
