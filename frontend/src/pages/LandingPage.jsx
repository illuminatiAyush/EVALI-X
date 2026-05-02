import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BrainCircuit, Zap, ShieldCheck, GraduationCap, ArrowRight,
  CheckCircle2, FileText, Sparkles, Sun, Moon, TerminalSquare,
  Users, Clock, BarChart3, ChevronRight, Twitter, Linkedin, Instagram, Mail, ChevronDown,
  Settings, Target, Menu, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Container from '../components/ui/Container';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const footerLinks = {
  Product: ['Features', 'Pricing', 'Changelog', 'Documentation'],
  Platform: ['Student Management', 'Analytics', 'Security', 'Integrations'],
  Company: ['About Us', 'Careers', 'Blog', 'Contact'],
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
};

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('evalix-theme', next ? 'dark' : 'light');
  };
  return (
    <button
      onClick={toggle}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-brand hover:border-brand/40 transition-colors"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: dark ? 0 : 90, scale: dark ? 1 : 0, opacity: dark ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Sun size={16} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: dark ? -90 : 0, scale: dark ? 0 : 1, opacity: dark ? 0 : 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Moon size={16} />
      </motion.div>
    </button>
  );
}

const STATS = [
  { val: '<2s', label: 'Generation Time' },
  { val: '50+', label: 'Questions/Test' },
  { val: '100%', label: 'Proctored' },
  { val: 'AI', label: 'Feedback Engine' },
];

const FEATURES = [
  {
    icon: Zap,
    color: 'text-brand',
    bg: 'bg-brand/10 border-brand/20',
    title: 'Hyper-Fast Inference',
    desc: 'Groq LPU hardware generates 50-question diagnostics in under 2 seconds. Zero latency, zero friction.',
    tag: 'CORE',
    span: 'md:col-span-5',
  },
  {
    icon: ShieldCheck,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
    title: 'Secure Auth Pipeline',
    desc: 'Isolated dashboards for instructors and candidates. Supabase RLS ensures exam integrity.',
    tag: 'SECURITY',
    span: 'md:col-span-7',
  },
  {
    icon: FileText,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
    title: 'Deterministic Evaluation',
    desc: 'AI-driven scoring adheres strictly to rubrics — eliminating bias and standardizing metrics.',
    tag: 'AI',
    span: 'md:col-span-7',
  },
  {
    icon: BarChart3,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
    title: 'Deep Telemetry',
    desc: 'Per-question breakdown, violation tracking, and AI performance insights per student.',
    tag: 'ANALYTICS',
    span: 'md:col-span-5',
  },
];

const TESTIMONIALS = [
  {
    quote: "We spent hours coordinating schedules and manual grading. Evalix AI completely automated it.",
    author: "Dr. Amit Desai",
    role: "Center Director, VPPPCOE"
  },
  {
    quote: "The deterministic AI evaluation eliminated all bias. Our students finally trust the assessment process.",
    author: "Prof. Neha Sharma",
    role: "Head of Examinations"
  },
  {
    quote: "Setup literally took seconds. The telemetry and analytics give us unprecedented insights.",
    author: "Rajiv V.",
    role: "Senior IT Administrator"
  }
];

const FAQS = [
  {
    q: "How does the AI ensure deterministic scoring?",
    a: "Evalix AI leverages advanced LLMs to evaluate answers strictly against your predefined rubrics. This eliminates subjective bias and ensures that every student is graded on exactly the same criteria, every single time."
  },
  {
    q: "Can we integrate this with our college's existing LMS?",
    a: "Absolutely. Evalix is built on an API-first architecture, allowing seamless integration with institutional databases, learning management systems, and SSO providers."
  },
  {
    q: "How secure is the assessment data?",
    a: "We utilize Supabase Row Level Security (RLS) to ensure complete data isolation. Instructor and student workspaces are cryptographically separated, meaning no unauthorized cross-access is ever possible."
  },
  {
    q: "Is it suitable for large batch deployments?",
    a: "Yes. The underlying serverless infrastructure is designed to handle thousands of concurrent test attempts with zero lag, providing real-time telemetry back to the instructor dashboard."
  }
];

function FAQItem({ q, a, index }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className={`border-b border-border transition-colors duration-500 overflow-hidden ${isOpen ? 'bg-brand/5' : 'hover:bg-surface/50'}`}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between py-8 px-4 md:px-8 text-left focus:outline-none group"
      >
        <div className="flex gap-6 items-center">
          <span className="text-brand/40 font-mono text-sm font-bold tracking-widest">0{index + 1}</span>
          <span className={`text-xl font-display font-medium transition-colors duration-300 ${isOpen ? 'text-brand' : 'text-text group-hover:text-brand/80'}`}>{q}</span>
        </div>
        <div className={`flex-shrink-0 relative w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500 ${isOpen ? 'border-brand bg-brand/10 shadow-[0_0_15px_rgba(13,148,136,0.2)]' : 'border-border bg-background group-hover:border-brand/40'}`}>
          <div className={`absolute w-3 h-[2px] rounded-full transition-colors duration-300 ${isOpen ? 'bg-brand' : 'bg-text-muted group-hover:bg-text'}`} />
          <div className={`absolute w-3 h-[2px] rounded-full transition-all duration-500 ${isOpen ? 'bg-brand rotate-0 opacity-0' : 'bg-text-muted rotate-90 opacity-100 group-hover:bg-text'}`} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pb-8 px-4 md:px-8 md:pl-[5.5rem]">
              <p className="text-text-muted text-lg leading-relaxed max-w-2xl">
                {a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TestimonialSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative max-w-5xl mx-auto bg-surface/40 border border-border rounded-[2rem] p-10 md:p-20 text-center overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="relative z-10">
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-10 flex items-center justify-center gap-4">
          <div className="w-12 h-px bg-border"></div>
          What educators are saying
          <div className="w-12 h-px bg-border"></div>
        </div>
        
        <div className="min-h-[160px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <h3 className="text-3xl md:text-5xl font-display font-medium text-text mb-8 leading-tight max-w-4xl">
                "{TESTIMONIALS[index].quote}"
              </h3>
              <div className="flex items-center gap-3 text-text font-bold text-lg">
                <span className="w-8 h-[2px] bg-brand"></span> {TESTIMONIALS[index].author}
              </div>
              <div className="text-sm text-text-muted mt-1.5">{TESTIMONIALS[index].role}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-16 pt-8 border-t border-border/50 text-[12px] font-medium text-text-muted/60">
          Trusted by premium coaching institutes across Mumbai
        </div>
      </div>
    </div>
  );
}

function MobileMenu({ isOpen, setIsOpen }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden absolute top-16 left-0 right-0 bg-background border-b border-border z-40 overflow-hidden shadow-xl"
        >
          <div className="p-6 space-y-4">
            {[
              { label: 'Architecture', href: '#features' },
              { label: 'Assessments', href: '#' },
              { label: 'Departments', href: '#' },
              { label: 'Analytics', href: '#' },
              { label: 'Deploy', href: '#deploy' }
            ].map((tab) => (
              <a 
                key={tab.label} 
                href={tab.href} 
                onClick={() => setIsOpen(false)}
                className="block text-lg font-medium text-text-muted hover:text-brand transition-colors"
              >
                {tab.label}
              </a>
            ))}
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              <Link to="/login" className="w-full py-3 text-center font-medium text-text-muted border border-border rounded-xl">
                Sign In
              </Link>
              <Link to="/login" className="w-full py-3 text-center font-bold text-background bg-brand rounded-xl">
                Launch Platform
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LandingPage() {
  const [hoveredLetter, setHoveredLetter] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <Container className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(13,148,136,0.3)]">
              <BrainCircuit size={18} className="text-background" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 leading-none mb-1">
                <span className="text-lg font-display font-bold tracking-tight">Evalix AI</span>
                <span className="hidden sm:block text-[9px] font-mono text-text-muted border border-border rounded px-1 py-0.5 bg-surface leading-none">v2.0</span>
              </div>
              <span className="hidden sm:block text-[10.5px] text-text-muted font-medium leading-none">
                Built for VPPPCOE Sion
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-text-muted">
            {[
              { label: 'Architecture', href: '#features' },
              { label: 'Assessments', href: '#' },
              { label: 'Departments', href: '#' },
              { label: 'Analytics', href: '#' },
              { label: 'Deploy', href: '#deploy' }
            ].map((tab) => (
              <a key={tab.label} href={tab.href} className="hover:text-brand transition-colors">
                {tab.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-text-muted hover:text-text transition-colors">
                Sign In
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 bg-brand text-background rounded-lg text-sm font-bold hover:bg-brand-hover transition-all"
              >
                Launch <ArrowRight size={14} />
              </Link>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-text-muted bg-surface border border-border rounded-lg"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </Container>
        <MobileMenu isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-36 pb-28 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
        {/* Glow blobs */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-brand/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[120px] pointer-events-none" />

        <Container className="relative z-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center text-center max-w-5xl mx-auto"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand text-xs font-semibold mb-8 shadow-[0_0_15px_rgba(13,148,136,0.15)]">
              <Sparkles size={14} className="text-brand" /> Intelligent Assessment Platform
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-6xl md:text-8xl font-display font-extrabold leading-[1.02] tracking-tighter mb-6">
              Built for{' '}
              <span className="relative inline-block">
                <span className="gradient-text">Precision.</span>
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-brand via-cyan-400 to-purple-500 rounded-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-text-muted leading-relaxed mb-10 max-w-2xl">
              Industrial-grade AI assessment infrastructure. Deploy structured, high-fidelity evaluations generated instantly via Groq Llama 3 — at scale.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/login"
                className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-brand text-background rounded-xl font-bold text-base hover:bg-brand-hover transition-all shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:shadow-[0_0_35px_rgba(34,211,238,0.55)]"
              >
                Deploy Now
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 px-8 py-3.5 border border-border rounded-xl font-bold text-base text-text-muted hover:border-brand/40 hover:text-brand transition-all"
              >
                System Access
              </Link>
            </motion.div>

            {/* Stats bar */}
            <motion.div
              variants={fadeUp}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border w-full max-w-2xl mx-auto"
            >
              {STATS.map((s) => (
                <div key={s.label} className="bg-surface px-6 py-4 text-center">
                  <div className="text-2xl font-mono font-bold text-brand">{s.val}</div>
                  <div className="text-[11px] font-semibold text-text-muted mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Browser mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 max-w-5xl mx-auto dark"
          >
            <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.4)] flex flex-col h-[420px] text-text">
              {/* Window chrome */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                <div className="flex gap-1.5 w-20">
                  <div className="w-3 h-3 rounded-full bg-danger/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-background border border-border rounded-md">
                  <TerminalSquare size={12} className="text-brand" />
                  <span className="text-[12px] font-medium text-text-muted">Teacher Dashboard Overview</span>
                </div>
                <div className="w-20"></div>
              </div>

              {/* Layout Container */}
              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar (like MainLayout) */}
                <div className="w-48 bg-surface border-r border-border p-4 hidden md:flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-brand rounded-md flex items-center justify-center">
                      <BrainCircuit size={12} className="text-background" />
                    </div>
                    <span className="text-sm font-display font-bold">Evalix Core</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 w-full rounded-md border bg-brand/10 border-brand/20 flex items-center px-3">
                      <div className="w-3 h-3 rounded bg-brand/40 mr-2"></div>
                      <div className="h-2 w-16 bg-brand/60 rounded"></div>
                    </div>
                    {[1, 2].map(i => (
                      <div key={i} className="h-8 w-full rounded-md flex items-center px-3">
                        <div className="w-3 h-3 rounded bg-text-muted/30 mr-2"></div>
                        <div className="h-2 w-12 bg-border rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main Content (like TeacherDashboard) */}
                <div className="flex-1 p-6 bg-background space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <div>
                      <div className="h-5 w-40 bg-text rounded mb-2"></div>
                      <div className="h-2 w-64 bg-text-muted/30 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-24 bg-surface border border-border rounded-md"></div>
                      <div className="h-8 w-28 bg-brand rounded-md shadow-cyan-glow"></div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {[{ c: 'text-brand bg-brand/10', v: '14', l: 'Tests' }, { c: 'text-purple-500 bg-purple-500/10', v: '312', l: 'Attempts' }, { c: 'text-emerald-500 bg-emerald-500/10', v: '87%', l: 'Avg' }].map((s, i) => (
                      <div key={i} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.c}`}>
                            <div className="w-4 h-4 rounded-sm bg-current opacity-70"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-mono font-bold ${s.c.split(' ')[0]}`}>{s.v}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recent Tests List */}
                  <div className="bg-background border border-border rounded-xl overflow-hidden">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-surface border border-border rounded-lg flex items-center justify-center text-text-muted">
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className="h-3 w-32 bg-text rounded mb-2"></div>
                            <div className="flex gap-2">
                              <div className="h-2 w-12 bg-emerald-500/40 rounded"></div>
                              <div className="h-2 w-16 bg-border rounded"></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="h-4 w-6 bg-text rounded ml-auto mb-1"></div>
                            <div className="h-1.5 w-10 bg-border rounded"></div>
                          </div>
                          <div className="h-6 w-16 border border-border rounded bg-surface"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 bg-surface border-y border-border">
        <Container>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.div variants={fadeUp} className="mb-16">
              <p className="text-[13px] font-bold text-brand mb-4 flex items-center gap-1.5">Powerful Capabilities <Settings size={14} /></p>
              <h2 className="text-4xl md:text-5xl font-display font-bold">Built Different.</h2>
            </motion.div>

            <div className="grid md:grid-cols-12 gap-4">
              {FEATURES.map((f) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className={`group ${f.span} bg-background border border-border rounded-2xl p-8 hover:border-opacity-60 transition-all hover:shadow-[0_0_30px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] cursor-default`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-11 h-11 rounded-xl ${f.bg} border flex items-center justify-center ${f.color}`}>
                      <f.icon size={22} />
                    </div>
                    <span className={`text-[11px] font-semibold ${f.color} border ${f.bg} px-2.5 py-1 rounded-full`}>{f.tag}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold mb-3">{f.title}</h3>
                  <p className="text-text-muted leading-relaxed text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── DEPLOY TARGETS ── */}
      <section id="deploy" className="py-28 bg-background relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        <Container className="relative z-10">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid lg:grid-cols-2 gap-16 items-center"
          >
            <div>
              <motion.p variants={fadeUp} className="text-[13px] font-bold text-brand mb-4 flex items-center gap-1.5">Built for Everyone <Target size={14} /></motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-display font-bold mb-12">Who's It For?</motion.h2>

              <div className="space-y-10">
                {[
                  {
                    icon: ShieldCheck, color: 'text-brand', borderHover: 'hover:border-brand',
                    label: 'INSTRUCTOR', title: 'For Teachers',
                    items: ['Bypass manual drafting entirely', 'Automated MCQ validation', 'Per-student analytics at a glance'],
                    cta: 'Instructor Mode',
                  },
                  {
                    icon: GraduationCap, color: 'text-emerald-500', borderHover: 'hover:border-emerald-500',
                    label: 'CANDIDATE', title: 'For Students',
                    items: ['Asynchronous test execution', 'Instant AI-driven feedback', 'Full historical telemetry'],
                    cta: 'Student Portal',
                  },
                ].map((t) => (
                  <motion.div
                    key={t.title}
                    variants={fadeUp}
                    className={`relative pl-8 border-l-2 border-border ${t.borderHover} transition-colors duration-300`}
                  >
                    <span className={`text-[12px] font-bold ${t.color}`}>{t.label}</span>
                    <h3 className="text-2xl font-display font-bold mt-1 mb-4 flex items-center gap-2">
                      <t.icon size={22} className={t.color} /> {t.title}
                    </h3>
                    <ul className="space-y-2.5 mb-6">
                      {t.items.map((item) => (
                        <li key={item} className="flex items-center gap-3 text-text-muted text-sm">
                          <CheckCircle2 size={15} className={t.color} /> {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/login"
                      className={`inline-flex items-center gap-1.5 text-sm font-bold ${t.color} hover:underline underline-offset-4`}
                    >
                      {t.cta} <ChevronRight size={14} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Terminal card */}
            <motion.div variants={fadeUp} className="relative hidden lg:block">
              <div className="absolute inset-0 bg-brand/5 rounded-3xl blur-2xl" />
              <div className="relative bg-surface border border-border rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-background/60">
                  <TerminalSquare size={14} className="text-brand" />
                  <span className="text-[12px] font-medium text-text-muted">System Live Feed</span>
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
                <div className="p-6 text-[13px] space-y-3 font-medium">
                  {[
                    { color: 'text-text-muted', text: 'Preparing instructor environment...', icon: null },
                    { color: 'text-brand', text: 'Authentication successful!', icon: ShieldCheck },
                    { color: 'text-brand', text: 'AI Engine ready for questions.', icon: BrainCircuit },
                    { color: 'text-brand', text: 'Security checks passed.', icon: ShieldCheck },
                    { color: 'text-text-muted', text: 'Generating 25 questions on Data Structures...', icon: null },
                    { color: 'text-emerald-600 dark:text-emerald-400', text: 'Successfully generated in 1.4 seconds!', icon: CheckCircle2 },
                    { color: 'text-amber-600 dark:text-amber-400', text: 'Test is now live for students!', icon: Zap },
                  ].map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 }}
                      className={`${line.color} flex items-center`}
                    >
                      {line.icon && <line.icon size={14} className="mr-2" />}
                      {line.text}
                    </motion.div>
                  ))}
                  <div className="flex items-center gap-2 text-text-muted mt-2">
                    <span className="animate-pulse">Waiting for students to join...</span>
                    <span className="w-2 h-4 bg-brand animate-pulse rounded-sm" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-background relative">
        <Container>
          <TestimonialSlider />
        </Container>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24 bg-surface border-t border-border">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 via-background to-purple-500/5 p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none rounded-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/8 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[13px] font-bold text-brand mb-4 flex items-center justify-center gap-1.5">Get Started <Zap size={14} /></p>
              <h2 className="text-4xl md:text-6xl font-display font-extrabold mb-6 tracking-tighter">
                Ready to Deploy?
              </h2>
              <p className="text-text-muted max-w-lg mx-auto mb-10 text-lg">
                Set up your first batch and deploy a full assessment in under 60 seconds.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-10 py-4 bg-brand text-background rounded-xl font-bold text-lg hover:bg-brand-hover transition-all shadow-[0_0_25px_rgba(34,211,238,0.3)] hover:shadow-[0_0_45px_rgba(34,211,238,0.5)]"
              >
                Initialize Now <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── FAQ ── */}
      <section className="py-32 bg-background border-t border-border relative z-20 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
        
        <Container className="relative">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            {/* Left side Sticky Header */}
            <div className="lg:col-span-5 lg:sticky lg:top-32">
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-surface text-text-muted text-xs font-semibold mb-8">
                  <Settings size={14} className="text-text-muted" /> Support & Operations
                </div>
                <h2 className="text-5xl md:text-7xl font-display font-extrabold mb-6 leading-[1.05] tracking-tighter">
                  Architectural <br/>
                  <span className="text-brand">Clarity.</span>
                </h2>
                <p className="text-text-muted text-lg leading-relaxed mb-12 max-w-md">
                  Everything you need to know about Evalix AI's underlying infrastructure, security protocols, and integration capabilities.
                </p>
                
                <div className="flex items-center gap-5 p-6 rounded-2xl bg-surface border border-border shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
                  <div className="w-12 h-12 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text mb-0.5">Need enterprise support?</div>
                    <a href="mailto:support@evalix.ai" className="text-brand font-bold text-sm hover:underline underline-offset-4 transition-all">
                      support@evalix.ai
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right side Accordion */}
            <div className="lg:col-span-7 pt-8 lg:pt-0">
              <div className="border-t border-border">
                {FAQS.map((faq, i) => (
                  <FAQItem key={i} index={i} q={faq.q} a={faq.a} />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pt-20 pb-10 border-t border-border bg-surface relative overflow-hidden">
        <Container>
          {/* Top Section: Brand & Links */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-20">
            {/* Brand Section */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                  <BrainCircuit size={16} className="text-background" />
                </div>
                <span className="text-xl font-display font-bold">EvaliX AI</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm">
                Architecting the future of educational infrastructure. Engineering clarity for modern institutes through intelligent systems.
              </p>

              {/* Social Icons */}
              <div className="flex gap-5 pt-2">
                {[
                  { icon: Twitter, label: 'Twitter' },
                  { icon: Linkedin, label: 'LinkedIn' },
                  { icon: Instagram, label: 'Instagram' },
                  { icon: Mail, label: 'Email' }
                ].map(({ icon: Icon, label }) => (
                  <motion.a
                    key={label}
                    href={label === 'Email' ? 'mailto:support@evalix.ai' : '#'}
                    whileHover={{ y: -2, opacity: 1 }}
                    className="opacity-50 hover:text-brand transition-all text-text"
                    aria-label={label}
                  >
                    <Icon size={18} strokeWidth={1.5} />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="space-y-5">
                <h4 className="text-[13px] font-bold text-text mb-2">
                  {category}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-text-muted hover:text-brand transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 🔥 GLOWING & FLOATING LETTERS EFFECT */}
          <div className="w-full mb-16 flex justify-center items-center overflow-hidden select-none relative h-[8rem] md:h-[14rem]">
            <div className="flex pointer-events-auto h-full items-center relative">

              {/* Shimmer Overlay */}
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-r from-transparent via-brand to-transparent skew-x-[-20deg]"
                style={{ mixBlendMode: 'screen', zIndex: 1 }}
              />

              {"evalix\u00A0ai".split("").map((char, idx) => {
                const isHovered = hoveredLetter === idx;
                const isNeighbor = hoveredLetter !== null && Math.abs(hoveredLetter - idx) === 1;

                return (
                  <motion.span
                    key={idx}
                    onMouseEnter={() => setHoveredLetter(idx)}
                    onMouseLeave={() => setHoveredLetter(null)}
                    animate={{
                      opacity: isHovered ? 1 : isNeighbor ? 0.6 : 0.3,
                      scale: isHovered ? 1.08 : 1,
                      textShadow: isHovered
                        ? '0px 0px 20px rgba(13,148,136,0.6)'
                        : '0px 0px 0px rgba(13,148,136,0)',
                    }}
                    transition={{
                      duration: isHovered ? 0.25 : 0.3,
                      ease: "easeOut"
                    }}
                    className="font-display font-black tracking-tighter whitespace-nowrap inline-block cursor-default relative uppercase"
                    style={{
                      fontSize: 'clamp(3rem, 11vw, 12rem)',
                      lineHeight: 0.8,
                      color: 'var(--text)',
                      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                      maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                    }}
                  >
                    {char}
                  </motion.span>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
            <div className="flex flex-col items-center md:items-start gap-1">
              <p className="text-text-muted text-[11px] font-medium">
                © {new Date().getFullYear()} Evalix AI. All rights reserved.
              </p>
              <p className="text-text-muted/60 text-[11px]">
                Made by <span className="text-brand/80 font-bold">zoKer</span> · Independent Developer
              </p>
            </div>

            <div className="flex gap-6">
              {['Privacy Policy', 'Terms of Service', 'Security'].map((item) => (
                <a key={item} href="#" className="text-[11px] font-medium text-text-muted hover:text-text transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
