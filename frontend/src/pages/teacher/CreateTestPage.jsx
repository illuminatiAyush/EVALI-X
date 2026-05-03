import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Sparkles,
  Settings2,
  FileText,
  ArrowRight,
  CheckCircle2,
  UploadCloud,
  X,
  File as FileIcon,
  ShieldCheck,
  Zap,
  BarChart3,
  Dna,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function CreateTestPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    difficulty: 'medium',
    numQuestions: 10,
    types: ['mcq', 'short']
  });
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);

  useEffect(() => {
    const loadBatches = async () => {
      try {
        const data = await apiService.getBatches();
        setBatches(data.data || []);
      } catch (err) {
        console.error('Failed to load batches', err);
      }
    };
    loadBatches();
  }, []);

  const handleBatchToggle = (batchId) => {
    setSelectedBatches(prev =>
      prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
    );
  };

  const handleTypeToggle = (type) => {
    setFormData(prev => {
      const types = prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type];
      return { ...prev, types: types.length ? types : ['mcq'] };
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
        toast.success('PDF loaded — ready to deploy.');
      } else {
        toast.error('Invalid format. PDF required.');
        setError('Invalid format. PDF required.');
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Invalid format. PDF required.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Awaiting PDF initialization sequence.');
      setError('Awaiting PDF initialization sequence.');
      return;
    }

    const toastId = toast.loading('Generating assessment via Groq LPU...');
    setLoading(true);
    setError('');

    try {
      // Direct pass to backend — no local extraction needed
      const response = await apiService.generateTest(file, formData.difficulty, formData.numQuestions);

      // Flatten AI output into a single questions array
      const aiQuestions = response.data || [];
      const questions = aiQuestions.map(q => ({ ...q, type: q.type || 'mcq' }));

      const test = await apiService.createTest({
        title: file.name.replace('.pdf', '') || 'AI_DIAGNOSTIC_PROTOCOL',
        difficulty: formData.difficulty,
        duration_minutes: 30,
        total_marks: questions.length,
        batch_ids: selectedBatches.length > 0 ? selectedBatches : null, // Backend handles batch assignment internally now
        content: { questions },
        is_ai_generated: true,
        status: selectedBatches.length > 0 ? 'active' : 'draft',
      });

      toast.success('Assessment generated successfully.', { id: toastId });
      navigate(`/teacher/test/${test.id}`);
    } catch (err) {
      console.error('Generation error:', err);
      const msg = err.message || 'Engine offline. Retry sequence.';
      toast.error(msg, { id: toastId });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Processing State Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cyber-grid"
          >
            <div className="relative mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="w-32 h-32 border-[4px] border-surface border-t-brand rounded-full shadow-cyan-glow"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="text-brand animate-pulse" size={40} />
              </div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-display font-extrabold tracking-tight mb-4"
            >
              Architecting Assessment...
            </motion.h2>

            <div className="max-w-md space-y-3">
              <p className="text-text-muted font-sans font-medium">
                Our AI is analyzing your syllabus framework to construct high-fidelity questions.
              </p>
              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-brand uppercase tracking-wider mt-6">
                <span className="flex items-center gap-1"><Dna size={14} /> Reading PDF</span>
                <span className="w-1 h-1 bg-brand rounded-full"></span>
                <span className="flex items-center gap-1"><Sparkles size={14} /> Generating</span>
                <span className="w-1 h-1 bg-brand rounded-full"></span>
                <span className="flex items-center gap-1"><Zap size={14} /> Finalizing</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">

        {/* Left Side: Form Controls */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <Card p="lg" className="sticky top-28 bg-surface">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-brand/10 text-brand rounded-lg">
                <Settings2 size={20} />
              </div>
              <h2 className="text-2xl font-display font-extrabold tracking-tight">Protocol Configuration</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Cognitive Complexity</label>
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-background rounded-lg border border-border">
                  {['easy', 'medium', 'hard'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, difficulty: level })}
                      className={`py-2.5 rounded-md text-sm font-semibold capitalize transition-all ${formData.difficulty === level
                          ? 'bg-brand/10 text-brand border border-brand/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'text-text-muted hover:text-text hover:bg-surface'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Assessment Volume</label>
                  <span className="text-sm font-bold text-brand bg-brand/10 px-3 py-1 rounded-md">{formData.numQuestions}</span>
                </div>
                <input
                  type="range" min="5" max="30" step="5"
                  value={formData.numQuestions}
                  onChange={(e) => setFormData({ ...formData, numQuestions: e.target.value })}
                  className="w-full h-2 bg-background border border-border rounded-lg appearance-none cursor-pointer accent-brand"
                />
                <div className="flex justify-between mt-2 text-xs font-medium text-text-muted">
                  <span>5</span>
                  <span>15</span>
                  <span>30</span>
                </div>
              </div>

              {/* Question Types */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Question Types</label>
                <div className="space-y-3">
                  {[
                    { id: 'mcq', label: 'Multiple Choice', desc: 'Standard objective questions' },
                    { id: 'short', label: 'Short Answer', desc: 'Brief written responses' },
                    { id: 'long', label: 'Long Answer', desc: 'Detailed essay questions' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleTypeToggle(type.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${formData.types.includes(type.id)
                          ? 'bg-brand/10 border-brand/30 shadow-sm'
                          : 'bg-background border-border hover:border-text-muted'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${formData.types.includes(type.id) ? 'bg-brand text-background' : 'bg-surface text-text-muted'
                        }`}>
                        {type.id === 'mcq' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                      </div>
                      <div>
                        <div className={`text-sm font-display font-bold ${formData.types.includes(type.id) ? 'text-brand' : 'text-text'}`}>{type.label}</div>
                        <div className="text-xs text-text-muted">{type.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign to Batches */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Designate Academic Sections</label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {batches.length === 0 ? (
                    <p className="text-sm text-text-muted font-sans italic">No classes found.</p>
                  ) : (
                    batches.map((batch) => (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={() => handleBatchToggle(batch.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${selectedBatches.includes(batch.id)
                            ? 'bg-purple-500/10 border-purple-500/30'
                            : 'bg-background border-border hover:border-text-muted'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${selectedBatches.includes(batch.id) ? 'bg-purple-500 border-purple-500 text-white' : 'border-border'
                          }`}>
                          {selectedBatches.includes(batch.id) && <CheckCircle2 size={12} />}
                        </div>
                        <span className={`text-sm font-display font-bold ${selectedBatches.includes(batch.id) ? 'text-purple-500' : 'text-text'}`}>{batch.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={!file || loading}
                variant="primary"
                className="w-full py-5 text-base shadow-indigo-glow"
              >
                {loading ? 'Synthesizing...' : 'Initialize Assessment'}
                {!loading && <ArrowRight size={20} className="ml-2" />}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Side: Upload Hero */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="h-full flex flex-col">
            <div className="mb-10">
              <h1 className="text-4xl lg:text-6xl font-display font-extrabold leading-tight mb-4 tracking-tight">
                Assessment <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-indigo-400">Architect</span>
              </h1>
              <p className="text-lg text-text-muted font-sans max-w-xl">
                Ingest your source material via PDF. Our AI engine will analyze the curriculum to construct a comprehensive evaluation protocol.
              </p>
            </div>

            <Card
              p="0"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex-1 min-h-[400px] border-2 border-dashed transition-all flex flex-col items-center justify-center p-12 text-center group ${isDragging
                  ? 'bg-brand/5 border-brand ring-4 ring-brand/10'
                  : file
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-surface border-border hover:border-text-muted hover:bg-background'
                }`}
            >
              {file ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-6 w-full max-w-md mx-auto"
                >
                  <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <FileIcon size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-text truncate mx-auto">{file.name}</h3>
                    <p className="text-emerald-500 font-semibold text-xs uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
                      <ShieldCheck size={16} /> File Validated
                    </p>
                  </div>
                  <Button
                    onClick={() => setFile(null)}
                    variant="danger"
                    className="mt-4"
                  >
                    Remove File
                  </Button>
                </motion.div>
              ) : (
                <>
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 transition-all ${isDragging ? 'bg-brand text-background scale-110 shadow-cyan-glow' : 'bg-background border border-border text-text-muted shadow-sm group-hover:text-brand'
                    }`}>
                    <UploadCloud size={36} />
                  </div>
                  <h3 className="text-2xl font-display font-extrabold mb-3">Ingest Source Material</h3>
                  <p className="text-text-muted font-sans mb-8 max-w-xs">
                    Drop your PDF study material here to get started.
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="px-xl py-4"
                  >
                    Browse Files
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf"
                    onChange={handleFileSelect}
                  />
                </>
              )}
            </Card>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-3 text-danger"
                >
                  <AlertCircle size={18} />
                  <span className="text-sm font-semibold">{error}</span>
                  <button onClick={() => setError('')} className="ml-auto hover:bg-danger/20 p-1 rounded-md">
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <Zap size={18} />, title: 'Fast', desc: 'Ready in seconds' },
                { icon: <ShieldCheck size={18} />, title: 'Accurate', desc: 'Based on your text' },
                { icon: <BarChart3 size={18} />, title: 'Diverse', desc: 'Various question types' }
              ].map((feature, i) => (
                <div key={i} className="flex gap-4 items-center bg-surface border border-border p-4 rounded-xl">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-background flex items-center justify-center text-text-muted">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text">{feature.title}</div>
                    <div className="text-sm text-text-muted leading-tight mt-0.5">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
