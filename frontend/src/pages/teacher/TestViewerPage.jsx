import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiService } from '../../lib/api';
import { 
  FileText, 
  Printer, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlignLeft, 
  ChevronLeft,
  Clock,
  BrainCircuit,
  AlertCircle,
  BarChart3,
  Layers,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

export default function TestViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTest();
  }, [id]);

  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    duration_minutes: 30,
    start_time: '',
    end_time: ''
  });

  const loadTest = async () => {
    try {
      const data = await apiService.getTestById(id);
      setTest(data);
      if (data.duration_minutes) {
        setScheduleData({
          duration_minutes: data.duration_minutes,
          start_time: data.start_time || '',
          end_time: data.end_time || ''
        });
      }
    } catch (err) {
      console.error('Error loading test:', err);
      toast.error(err.message || 'Failed to load test data');
      setError(err.message || 'Test not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    setScheduling(true);
    try {
      await apiService.updateTest(id, {
        ...scheduleData,
        status: 'scheduled'
      });
      toast.success('Test deployed and scheduled successfully.');
      setIsScheduling(false);
      loadTest();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule deployment');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-surface border border-border rounded-xl flex items-center justify-center mb-6 shadow-cyan-glow"
        >
          <BrainCircuit className="text-brand" size={32} />
        </motion.div>
        <p className="text-text-muted font-sans font-medium text-sm animate-pulse">Loading Assessment Data...</p>
      </div>
    );
  }

  if (error || !test) {
    const isNotFound = error?.toLowerCase().includes('not found') || !test;
    return (
      <Card p="xl" className="max-w-md mx-auto mt-20 text-center border-dashed">
        <div className={`w-16 h-16 ${isNotFound ? 'bg-amber-500/10 text-amber-500' : 'bg-danger/10 text-danger'} rounded-xl flex items-center justify-center mx-auto mb-6`}>
          {isNotFound ? <Clock size={32} /> : <AlertCircle size={32} />}
        </div>
        <h2 className="text-2xl font-display font-bold text-text mb-2">
          {isNotFound ? 'Assessment Not Found' : 'Error'}
        </h2>
        <p className="text-text-muted font-sans mb-8">
          {isNotFound 
            ? "This assessment has been removed or is no longer available." 
            : error}
        </p>
        <Button to="/teacher/dashboard" variant="primary">
          <ChevronLeft size={18} className="mr-2" />
          Back to Dashboard
        </Button>
      </Card>
    );
  }

  const mcqs = (test.questions || []).filter(q => q.type === 'mcq');
  const shortAnswers = (test.questions || []).filter(q => q.type === 'short');

  const diffColors = {
    easy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    hard: 'bg-danger/10 text-danger border-danger/20'
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 pb-6 border-b border-border">
        <div className="flex items-start gap-4">
          <Button 
            to="/teacher/dashboard" 
            variant="ghost"
            className="mt-1 px-2 py-2"
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-2 py-1 rounded text-xs font-semibold uppercase border ${diffColors[test.difficulty] || diffColors.medium}`}>
                {test.difficulty}
              </span>
              <span className="flex items-center gap-1 text-text-muted text-sm font-medium">
                <Clock size={16} />
                {test.duration_minutes || 30} mins
              </span>
              <span className="flex items-center gap-1 text-text-muted text-sm font-medium">
                <Layers size={16} />
                {test.questions?.length || 0} Questions
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-display font-extrabold text-text leading-tight tracking-tight">
              {test.title}
            </h1>
            <p className="text-text-muted mt-2 font-sans max-w-2xl text-base">
              {test.is_ai_generated ? "AI-generated assessment. Please review the questions before scheduling." : "Manually created assessment."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <Button variant="outline" className="px-3">
            <Printer size={18} />
          </Button>
          <Button 
            onClick={() => setIsScheduling(true)}
            variant="primary"
          >
            <Calendar size={18} className="mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Main Content: Questions */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* MCQs Section */}
          {mcqs.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand/10 text-brand rounded-lg">
                  <CheckCircle2 size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold text-text">Multiple Choice Questions</h2>
                <span className="ml-auto px-3 py-1 bg-surface border border-border text-text-muted text-xs font-medium rounded">
                  {mcqs.length} Questions
                </span>
              </div>
              
              <div className="space-y-6">
                {mcqs.map((q, idx) => (
                  <Card 
                    key={idx}
                    p="lg" 
                    className="group border-l-4 border-l-transparent hover:border-l-brand transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center text-text-muted font-mono font-bold text-sm group-hover:bg-brand/10 group-hover:text-brand transition-colors group-hover:border-brand/30">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-display font-bold text-text mb-6 leading-relaxed">
                          {q.question}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {q.options.map((opt, oIdx) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isCorrect = letter === q.answer;
                            return (
                              <div 
                                key={oIdx} 
                                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                                  isCorrect 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                                    : 'bg-background border-border text-text-muted hover:border-text-muted'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold ${isCorrect ? 'bg-emerald-500 text-background' : 'bg-surface text-text-muted'}`}>
                                  {letter}
                                </span>
                                <span className={`text-sm ${isCorrect ? 'font-bold' : 'font-sans'}`}>{opt}</span>
                                {isCorrect && <CheckCircle size={14} className="ml-auto opacity-60" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Short Answers Section */}
          {shortAnswers.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6 mt-12">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                  <AlignLeft size={20} />
                </div>
                <h2 className="text-2xl font-display font-bold text-text">Short Answer Questions</h2>
                <span className="ml-auto px-3 py-1 bg-surface border border-border text-text-muted text-xs font-medium rounded">
                  {shortAnswers.length} Questions
                </span>
              </div>
              
              <div className="space-y-6">
                {shortAnswers.map((q, idx) => (
                  <Card 
                    key={idx}
                    p="lg" 
                    className="group border-l-4 border-l-transparent hover:border-l-purple-500 transition-all"
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center text-text-muted font-mono font-bold text-sm group-hover:bg-purple-500/10 group-hover:text-purple-500 transition-colors group-hover:border-purple-500/30">
                        {idx + 1}
                      </div>
                      <h3 className="text-lg font-display font-bold text-text leading-relaxed flex-1 mt-1">
                        {q.question}
                      </h3>
                    </div>
                    <div className="bg-background rounded-lg p-5 border border-border mt-4 ml-12">
                      <div className="flex items-center gap-2 mb-3 text-purple-500">
                        <BrainCircuit size={16} />
                        <span className="text-xs font-semibold uppercase">Suggested Answer / Grading Key</span>
                      </div>
                      <p className="text-text-muted font-sans text-sm leading-relaxed">
                        {q.answer}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar: Controls & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <Card p="lg" className="sticky top-28 bg-surface">
            <h3 className="text-xs font-semibold text-text-muted uppercase mb-6">Assessment Controls</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${test.status === 'active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : test.status === 'scheduled' ? 'bg-brand shadow-cyan-glow' : 'bg-text-muted'}`}></div>
                  <span className="text-sm font-semibold text-text uppercase tracking-wider">{test.status}</span>
                </div>
                <span className="text-xs font-medium text-text-muted uppercase">Status</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-brand" />
                  <span className="text-sm font-semibold text-text uppercase tracking-wider">Available</span>
                </div>
                <span className="text-xs font-medium text-text-muted uppercase">Analytics</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-background border border-border hover:border-brand/50 transition-all group">
                <Download size={24} className="text-text-muted group-hover:text-brand" />
                <span className="text-xs font-medium text-text-muted group-hover:text-text transition-colors">Export PDF</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-background border border-border hover:border-brand/50 transition-all group">
                <Share2 size={24} className="text-text-muted group-hover:text-brand" />
                <span className="text-xs font-medium text-text-muted group-hover:text-text transition-colors">Share Link</span>
              </button>
            </div>

            <hr className="my-6 border-border" />

            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 mb-6">
              <div className="flex gap-2 text-amber-500 mb-2 items-center">
                <AlertCircle size={16} className="shrink-0" />
                <span className="text-sm font-semibold">Review Content</span>
              </div>
              <p className="text-sm text-amber-500/90 leading-relaxed font-sans">
                Please review AI-generated questions to ensure accuracy before assigning to students.
              </p>
            </div>

            <Button 
              onClick={() => navigate(`/teacher/analytics/${id}`)}
              variant="primary"
              className="w-full text-base py-4"
            >
              <BarChart3 size={20} className="mr-2" />
              View Analytics
            </Button>
          </Card>
        </div>
      </div>

      {/* Scheduling Modal */}
      <AnimatePresence>
        {isScheduling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduling(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg"
            >
              <Card p="xl" className="overflow-hidden border border-border shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-text mb-1 tracking-tight">Schedule Assessment</h2>
                    <p className="text-text-muted font-sans text-sm">Set dates and duration for this assessment.</p>
                  </div>
                  <button onClick={() => setIsScheduling(false)} className="p-2 hover:bg-surface rounded-lg transition-colors">
                    <XCircle size={24} className="text-text-muted" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-2">Duration (Minutes)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                      <input 
                        type="number" 
                        value={scheduleData.duration_minutes}
                        onChange={(e) => setScheduleData({ ...scheduleData, duration_minutes: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-text text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-2">Start Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={scheduleData.start_time}
                        onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg py-3 px-4 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-text text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-muted mb-2">End Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={scheduleData.end_time}
                        onChange={(e) => setScheduleData({ ...scheduleData, end_time: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg py-3 px-4 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-text text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <Button 
                    onClick={() => setIsScheduling(false)}
                    variant="outline"
                    className="flex-1 py-3"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSchedule}
                    disabled={scheduling}
                    variant="primary"
                    className="flex-1 py-3"
                  >
                    {scheduling ? 'Scheduling...' : 'Schedule'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
