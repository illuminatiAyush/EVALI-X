import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  BrainCircuit, Zap, ShieldCheck, GraduationCap, ArrowRight,
  CheckCircle2, FileText, Sparkles, Sun, Moon, TerminalSquare,
  Users, Clock, BarChart3, ChevronRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Container from '../components/ui/Container';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
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
      className="p-2.5 rounded-lg border border-border bg-surface text-text-muted hover:text-brand hover:border-brand/40 transition-all"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <Container className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <BrainCircuit size={18} className="text-background" />
            </div>
            <span className="text-lg font-display font-bold tracking-tight">Evalix</span>
            <span className="hidden sm:block text-[10px] font-mono text-text-muted border border-border rounded px-1.5 py-0.5 ml-1">v2.0</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
            {['#features', '#deploy'].map((href, i) => (
              <a key={href} href={href} className="hover:text-brand transition-colors">
                {['Architecture', 'Deploy'][i]}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-medium text-text-muted hover:text-text transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand text-background rounded-lg text-sm font-bold hover:bg-brand-hover transition-all shadow-[0_0_12px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
            >
              Launch <ArrowRight size={14} />
            </Link>
          </div>
        </Container>
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
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand text-[11px] font-mono font-bold tracking-widest uppercase mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Assessment Engine // Online
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
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest mt-1">{s.label}</div>
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
                  <span className="text-[11px] font-mono text-text-muted">evalix.core / teacher / dashboard</span>
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
                    {[1,2].map(i => (
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
                    {[{ c:'text-brand bg-brand/10', v:'14', l:'Tests' }, { c:'text-purple-500 bg-purple-500/10', v:'312', l:'Attempts' }, { c:'text-emerald-500 bg-emerald-500/10', v:'87%', l:'Avg' }].map((s,i) => (
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
              <p className="text-[11px] font-mono font-bold text-brand uppercase tracking-widest mb-4">// SYSTEM_ARCHITECTURE</p>
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
                    <span className={`text-[10px] font-mono font-bold ${f.color} border ${f.bg} px-2 py-0.5 rounded tracking-widest`}>{f.tag}</span>
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
              <motion.p variants={fadeUp} className="text-[11px] font-mono font-bold text-brand uppercase tracking-widest mb-4">// DEPLOYMENT_TARGETS</motion.p>
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
                    <span className={`text-[10px] font-mono font-bold ${t.color} uppercase tracking-widest`}>{t.label}</span>
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
                  <span className="text-[11px] font-mono text-text-muted">evalix_engine ~ connected</span>
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
                <div className="p-6 font-mono text-sm space-y-3">
                  {[
                    { color: 'text-text-muted', text: '$ evalix init --mode instructor' },
                    { color: 'text-brand', text: '✓ Auth pipeline connected' },
                    { color: 'text-brand', text: '✓ Groq LPU endpoint ready' },
                    { color: 'text-brand', text: '✓ Supabase RLS active' },
                    { color: 'text-text-muted', text: '$ generate --topic "Data Structures" --n 25' },
                    { color: 'text-emerald-500', text: '✓ Generated 25 MCQs in 1.4s' },
                    { color: 'text-amber-500', text: '⚡ Test deployed to batch ALPHA-7' },
                  ].map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 }}
                      className={line.color}
                    >
                      {line.text}
                    </motion.div>
                  ))}
                  <div className="flex items-center gap-1 text-text-muted">
                    <span>$</span>
                    <span className="w-2 h-4 bg-brand animate-pulse rounded-sm" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
              <p className="text-[11px] font-mono font-bold text-brand uppercase tracking-widest mb-4">// INITIATE_PROTOCOL</p>
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

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-border bg-background">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                <BrainCircuit size={15} className="text-background" />
              </div>
              <span className="font-display font-bold">Evalix</span>
            </div>
            <p className="text-text-muted text-xs font-mono uppercase tracking-widest">
              © {new Date().getFullYear()} EVALIX · ALL SYSTEMS NOMINAL
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
