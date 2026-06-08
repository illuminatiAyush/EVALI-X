import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, ShieldCheck, GraduationCap, ArrowRight,
  CheckCircle2, FileText, Sparkles,
  Users, BarChart3, ChevronRight, ChevronDown,
  Settings, Target, Menu, X, Mail,
  Twitter, Linkedin, Instagram
} from 'lucide-react';
import Container from '../components/ui/Container';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function CountUp({ end, suffix = '', prefix = '', duration = 1.5 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = (Date.now() - startTime) / (duration * 1000);
          const progress = Math.min(elapsed, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

const STATS = [
  { num: 2, prefix: '<', suffix: 's', label: 'Generation Time' },
  { num: 50, suffix: '+', label: 'Questions/Test' },
  { num: 100, suffix: '%', label: 'Proctored' },
  { num: 0, text: 'AI', label: 'Feedback Engine' },
];

const FEATURES = [
  { icon: Zap, color: 'text-teal-600', bg: 'bg-teal-50', title: 'Blazing Fast AI', desc: 'Generate 50 questions in under 2 seconds using Groq LPU inference. Zero wait time.', tag: 'CORE', span: 'md:col-span-5' },
  { icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-50', title: 'Bank-Grade Security', desc: 'Supabase RLS isolates student & teacher data. Zero cross-access possible.', tag: 'SECURITY', span: 'md:col-span-7' },
  { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Fair Evaluation', desc: 'AI scores against your rubric — eliminating bias and standardizing results.', tag: 'AI', span: 'md:col-span-7' },
  { icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Rich Analytics', desc: 'Per-question breakdowns, violation tracking, and performance insights.', tag: 'ANALYTICS', span: 'md:col-span-5' },
];

const TESTIMONIALS = [
  { quote: "We cut assessment time by 90%. Evalix completely automated our workflow.", author: "Dr. Amit Desai", role: "Center Director, VPPPCOE" },
  { quote: "The AI evaluation eliminated grading bias. Students finally trust the process.", author: "Prof. Neha Sharma", role: "Head of Examinations" },
  { quote: "Setup took seconds. The analytics give us unprecedented insights.", author: "Rajiv V.", role: "Senior IT Administrator" },
];

const FAQS = [
  { q: "How does AI ensure fair scoring?", a: "Evalix evaluates answers strictly against your predefined rubrics using advanced LLMs, eliminating subjective bias." },
  { q: "Can we integrate with our LMS?", a: "Yes. Evalix has an API-first architecture for seamless integration with institutional databases and SSO providers." },
  { q: "How secure is assessment data?", a: "We use Supabase Row Level Security (RLS) for complete data isolation. Instructor and student data are cryptographically separated." },
  { q: "Can it handle large batches?", a: "Absolutely. The serverless infrastructure handles thousands of concurrent test attempts with zero lag." },
];

function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-border ${open ? 'bg-teal-50/30' : ''}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 px-4 text-left group">
        <div className="flex gap-4 items-center">
          <span className="text-teal-400/60 font-mono text-xs">0{index + 1}</span>
          <span className={`text-base font-medium transition-colors ${open ? 'text-teal-700' : 'text-text-muted group-hover:text-teal-600'}`}>{q}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180 text-teal-500' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <p className="pb-5 px-4 pl-14 text-text-muted text-sm leading-relaxed max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TestimonialSlider() {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setIdx(p => (p + 1) % TESTIMONIALS.length), 5000); return () => clearInterval(t); }, []);
  return (
    <div className="max-w-3xl mx-auto text-center">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">What educators say</p>
      <div className="min-h-[140px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.5 }}>
            <h3 className="text-2xl md:text-3xl font-display font-medium text-text mb-6 leading-snug">"{TESTIMONIALS[idx].quote}"</h3>
            <p className="font-semibold text-text-muted">{TESTIMONIALS[idx].author}</p>
            <p className="text-sm text-gray-400 mt-0.5">{TESTIMONIALS[idx].role}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2 mt-8">
        {TESTIMONIALS.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-teal-500 w-6' : 'bg-gray-200'}`} />)}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-text overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-lg border-b border-border">
        <Container className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white">
              <GraduationCap size={18} />
            </div>
            <span className="text-lg font-display font-bold text-text">Evalix</span>
            <span className="hidden sm:block text-[9px] font-medium text-gray-400 border border-border rounded px-1.5 py-0.5">v2.0</span>
          </div>

          <div className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-text-muted">
            {['Features', 'How it Works', 'Pricing', 'FAQ'].map(t => (
              <a key={t} href={`#${t.toLowerCase().replace(/ /g, '-')}`} className="hover:text-teal-600 transition-colors">{t}</a>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/login" className="hidden sm:block text-[13px] font-medium text-text-muted hover:text-text transition-colors">Sign In</Link>
            <Link to="/login" className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-lg text-[13px] font-semibold hover:bg-teal-600 transition-colors shadow-sm">
              Get Started <ArrowRight size={14} />
            </Link>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-text-muted">
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </Container>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-surface border-b border-border shadow-lg">
              <div className="p-5 space-y-3">
                {['Features', 'How it Works', 'FAQ'].map(t => <a key={t} href="#" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-text-muted">{t}</a>)}
                <div className="pt-3 border-t border-border flex gap-2">
                  <Link to="/login" className="flex-1 text-center py-2.5 text-sm font-medium text-text-muted border border-border rounded-lg">Sign In</Link>
                  <Link to="/login" className="flex-1 text-center py-2.5 text-sm font-semibold text-white bg-teal-500 rounded-lg">Get Started</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute top-10 right-1/4 w-[600px] h-[600px] bg-teal-100/50 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-orange-100/40 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-100/30 rounded-full blur-[100px] pointer-events-none" />

        <Container className="relative z-10 py-20">
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center text-center max-w-5xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-8 border border-teal-100">
              <Sparkles size={14} /> Next-Gen Assessment Platform
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-extrabold leading-[1.05] tracking-tight mb-6 text-text">
              The future of{' '}
              <span className="font-serif italic font-normal text-teal-600">assessments</span>
              <br className="hidden sm:block" />
              is <span className="gradient-text">already here.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-text-muted leading-relaxed mb-10 max-w-2xl font-light">
              Create <span className="font-serif italic text-text">intelligent</span> tests in seconds, 
              grade with <span className="font-serif italic text-text">precision</span>, and unlock 
              insights that <span className="font-serif italic text-text">transform</span> education.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/login" className="group flex items-center gap-2 px-8 py-4 bg-teal-500 text-white rounded-2xl font-bold text-base hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30">
                Start for Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="flex items-center gap-2 px-8 py-4 border-2 border-border rounded-2xl font-semibold text-base text-text-muted hover:border-teal-400 hover:text-teal-600 transition-all">
                Watch Demo
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border w-full max-w-2xl">
              {STATS.map(s => (
                <div key={s.label} className="bg-surface px-6 py-5 text-center">
                  <div className="text-2xl md:text-3xl font-display font-extrabold text-teal-600">
                    {s.text ? s.text : <CountUp end={s.num} prefix={s.prefix || ''} suffix={s.suffix || ''} />}
                  </div>
                  <div className="text-[11px] font-medium text-text-muted mt-1 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ── THE LEGEND OF EVALIX ── */}
      <section className="py-24 bg-gradient-to-b from-surface via-brand-light to-surface relative overflow-hidden">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-accent-light rounded-full blur-[100px] pointer-events-none opacity-60" />
        <Container className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-[0.2em] mb-4">Our Story</p>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold text-text mb-6">
                The Legend of <span className="font-serif italic font-normal text-teal-600">Evalix</span>
              </h2>
              <p className="text-lg text-gray-400 font-light leading-relaxed">
                Born from a <span className="font-serif italic text-text-muted">simple frustration</span> — and built into something extraordinary.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { num: '01', color: 'border-teal-200 bg-teal-50/50', accent: 'text-teal-600', title: 'The Problem', desc: 'Teachers spent countless hours manually creating assessments, grading papers, and compiling results. Students waited days for feedback. The system was broken.' },
                { num: '02', color: 'border-orange-200 bg-orange-50/50', accent: 'text-orange-600', title: 'The Spark', desc: 'What if AI could generate an entire exam in seconds? What if grading was instant, unbiased, and perfectly consistent? That question changed everything.' },
                { num: '03', color: 'border-emerald-200 bg-emerald-50/50', accent: 'text-emerald-600', title: 'The Revolution', desc: 'Evalix was born — a platform where assessments create themselves, answers grade themselves, and insights reveal themselves. The future, delivered today.' },
              ].map((step, i) => (
                <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.5 }}
                  className={`relative p-8 rounded-2xl border ${step.color} group hover:shadow-lg transition-all`}>
                  <span className={`text-5xl font-display font-extrabold ${step.accent} opacity-20 absolute top-4 right-6`}>{step.num}</span>
                  <h3 className={`text-xl font-display font-bold ${step.accent} mb-3`}>{step.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed font-light">{step.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="max-w-2xl mx-auto text-center mt-16">
              <p className="text-2xl md:text-3xl font-serif italic text-text-muted leading-relaxed">
                "We didn't just build a tool — we <span className="text-teal-600 font-medium">reimagined</span> what assessment means for a generation that deserves <span className="text-orange-500 font-medium">better.</span>"
              </p>
              <p className="mt-6 text-sm font-semibold text-gray-400">— The Evalix Team</p>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 bg-gradient-to-b from-surface-muted to-surface">
        <Container>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <motion.div variants={fadeUp} className="mb-14 text-center">
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-[0.2em] mb-3">Powerful Features</p>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold text-text">Everything you <span className="font-serif italic font-normal text-teal-600">need</span></h2>
            </motion.div>

            <div className="grid md:grid-cols-12 gap-4">
              {FEATURES.map(f => (
                <motion.div key={f.title} variants={fadeUp} className={`group ${f.span} bg-surface border border-border rounded-2xl p-6 hover:shadow-lg hover:border-border transition-all cursor-default`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center ${f.color}`}>
                      <f.icon size={20} />
                    </div>
                    <span className={`text-[10px] font-semibold ${f.color} ${f.bg} px-2 py-1 rounded-full`}>{f.tag}</span>
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2 text-text">{f.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── WHO'S IT FOR ── */}
      <section id="how-it-works" className="py-20 bg-surface">
        <Container>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.p variants={fadeUp} className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">Built for Everyone</motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-display font-bold text-text mb-10">Who uses Evalix?</motion.h2>

              <div className="space-y-8">
                {[
                  { icon: ShieldCheck, color: 'text-teal-600', bg: 'bg-teal-50', borderColor: 'border-teal-200', label: 'INSTRUCTOR', title: 'For Teachers', items: ['AI-generated question banks', 'One-click test deployment', 'Real-time class analytics'], cta: 'Instructor Mode' },
                  { icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', borderColor: 'border-emerald-200', label: 'STUDENT', title: 'For Students', items: ['Take tests on any device', 'Instant AI feedback', 'Track your progress'], cta: 'Student Portal' },
                ].map(t => (
                  <motion.div key={t.title} variants={fadeUp} className={`pl-6 border-l-2 ${t.borderColor}`}>
                    <span className={`text-[10px] font-semibold ${t.color} uppercase tracking-wider`}>{t.label}</span>
                    <h3 className="text-xl font-display font-semibold mt-1 mb-3 flex items-center gap-2 text-text">
                      <t.icon size={20} className={t.color} /> {t.title}
                    </h3>
                    <ul className="space-y-2 mb-4">
                      {t.items.map(item => <li key={item} className="flex items-center gap-2.5 text-text-muted text-sm"><CheckCircle2 size={14} className={t.color} />{item}</li>)}
                    </ul>
                    <Link to="/login" className={`inline-flex items-center gap-1 text-sm font-semibold ${t.color} hover:underline underline-offset-4`}>
                      {t.cta} <ChevronRight size={14} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Visual card */}
            <motion.div variants={fadeUp} className="hidden lg:block">
              <div className="bg-gradient-to-br from-surface-muted to-surface border border-border rounded-2xl p-8 shadow-soft">
                <div className="bg-surface rounded-xl border border-border p-5 shadow-sm mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center"><Zap size={16} className="text-teal-600" /></div>
                    <div><div className="h-3 w-28 bg-surface-muted rounded" /><div className="h-2 w-40 bg-border rounded mt-1.5" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ c: 'bg-teal-50 text-teal-600', v: '14', l: 'Tests' }, { c: 'bg-orange-50 text-orange-500', v: '312', l: 'Students' }, { c: 'bg-emerald-50 text-emerald-600', v: '87%', l: 'Avg' }].map((s, i) => (
                      <div key={i} className={`${s.c} rounded-lg p-3 text-center`}>
                        <div className="text-lg font-display font-bold">{s.v}</div>
                        <div className="text-[10px] font-medium opacity-60">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
                  {[1, 2].map(i => (
                    <div key={i} className={`flex items-center gap-3 py-3 ${i < 2 ? 'border-b border-border' : ''}`}>
                      <div className="w-9 h-9 bg-surface-muted rounded-lg flex items-center justify-center text-text-muted"><FileText size={16} /></div>
                      <div className="flex-1"><div className="h-2.5 w-24 bg-surface-muted rounded mb-1.5" /><div className="h-2 w-16 bg-border rounded" /></div>
                      <div className="text-xs font-semibold text-text-muted">View →</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 bg-gradient-to-b from-surface-muted/40 to-surface">
        <Container><TestimonialSlider /></Container>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-surface">
        <Container>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-br from-teal-500 to-teal-600 p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-surface/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/30 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-display font-extrabold text-white mb-4">Ready to <span className="font-serif italic font-normal">begin?</span></h2>
              <p className="text-teal-100 max-w-lg mx-auto mb-8 text-base font-light">Deploy your first AI assessment in under 60 seconds. No credit card required.</p>
              <Link to="/login" className="inline-flex items-center gap-2 px-10 py-4 bg-surface text-teal-600 rounded-2xl font-bold text-base hover:bg-teal-50 transition-colors shadow-lg">
                Start Free <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 bg-surface-muted">
        <Container>
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-28">
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-2">FAQ</p>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-text mb-4">Common questions</h2>
                <p className="text-text-muted text-sm leading-relaxed mb-8 max-w-sm">Everything you need to know about Evalix AI's platform.</p>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><Mail size={18} /></div>
                  <div>
                    <p className="text-xs font-medium text-text-muted">Need help?</p>
                    <a href="mailto:support@evalix.ai" className="text-sm font-semibold text-teal-600 hover:underline">support@evalix.ai</a>
                  </div>
                </div>
              </motion.div>
            </div>
            <div className="lg:col-span-7">
              <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
                {FAQS.map((faq, i) => <FAQItem key={i} index={i} q={faq.q} a={faq.a} />)}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pt-16 pb-8 bg-surface border-t border-border">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center text-white"><GraduationCap size={14} /></div>
                <span className="font-display font-bold text-text">Evalix</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs">Intelligent assessment infrastructure for modern educational institutions.</p>
              <div className="flex gap-3 mt-4">
                {[Twitter, Linkedin, Instagram, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="text-gray-300 hover:text-teal-500 transition-colors"><Icon size={16} /></a>
                ))}
              </div>
            </div>
            {Object.entries({ Product: ['Features', 'Pricing', 'Changelog'], Platform: ['Security', 'Analytics', 'Integrations'], Company: ['About', 'Blog', 'Contact'] }).map(([cat, links]) => (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-text uppercase tracking-wider mb-3">{cat}</h4>
                <ul className="space-y-2">
                  {links.map(l => <li key={l}><a href="#" className="text-xs text-gray-400 hover:text-teal-600 transition-colors">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[11px] text-gray-400">© {new Date().getFullYear()} Evalix AI. All rights reserved.</p>
            <div className="flex gap-4">
              {['Privacy', 'Terms', 'Security'].map(t => <a key={t} href="#" className="text-[11px] text-gray-400 hover:text-text-muted transition-colors">{t}</a>)}
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
