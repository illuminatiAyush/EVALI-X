import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, ShieldCheck, GraduationCap, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showDemoCreds, setShowDemoCreds] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    let result;

    if (isLogin) {
      result = await login(email, password);
    } else {
      result = await signup(email, password, role);
    }

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);

    // Use the role from the auth result (most reliable source)
    const userRole = result.role || role;
    const redirectPath = userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background text-text transition-colors duration-300">
      {/* Left Column - Hero Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-r border-border p-16 flex-col justify-between relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-brand/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-zinc-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute inset-0  opacity-20 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white shadow-soft">
              <BrainCircuit size={24} />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight">Evalix Core</span>
          </div>

          <div className="space-y-6 max-w-lg">
            <h1 className="text-5xl font-display font-extrabold leading-[1.1] tracking-tighter">
              Access the <br /> <span className="text-brand">Evaluation Platform.</span>
            </h1>
            <p className="text-lg text-text-muted font-sans leading-relaxed">
              Log in to manage assessments or sign up to join your institution.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-md">
          <Card p="md" className="bg-background/80 backdrop-blur-sm border-border hover:border-brand/40 transition-colors">
            <div className="w-10 h-10 bg-brand/10 text-brand border border-brand/20 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-display font-bold">Secure Protocol</h3>
            <p className="text-sm text-text-muted mt-1 font-sans">Enterprise-grade security active.</p>
          </Card>
          <Card p="md" className="bg-background/80 backdrop-blur-sm border-border hover:border-zinc-900/40 transition-colors">
            <div className="w-10 h-10 bg-zinc-900/10 text-zinc-900 border border-zinc-900/20 rounded-lg flex items-center justify-center mb-4">
              <GraduationCap size={20} />
            </div>
            <h3 className="font-display font-bold">Dual Interfaces</h3>
            <p className="text-sm text-text-muted mt-1 font-sans">Instructor and Candidate modes.</p>
          </Card>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 relative bg-background">
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-4xl font-display font-extrabold tracking-tight text-text">
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-brand mt-3 font-mono text-xs uppercase tracking-widest">
              {isLogin ? 'Please log in to continue' : 'Register as a new user'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-3 overflow-hidden"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-5">
              <Input 
                label="Email Address"
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@evalix.core"
                size="lg"
              />

              <Input 
                label="Security Key"
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                size="lg"
              />

              <AnimatePresence>
                {!isLogin && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <Input 
                      label="Full Name"
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      size="lg"
                    />
                    <label className="block text-[10px] font-mono font-bold text-text-muted mb-2 uppercase tracking-widest">Select Your Role</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`py-3 px-4 rounded-xl border-2 font-display font-bold transition-all flex items-center justify-center gap-2 ${
                          role === 'student' 
                            ? 'border-brand bg-brand/10 text-brand shadow-soft' 
                            : 'border-border bg-surface text-text-muted hover:border-text-muted'
                        }`}
                      >
                        <GraduationCap size={18} />
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('teacher')}
                        className={`py-3 px-4 rounded-xl border-2 font-display font-bold transition-all flex items-center justify-center gap-2 ${
                          role === 'teacher' 
                            ? 'border-zinc-900 bg-zinc-900/10 text-zinc-900 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                            : 'border-border bg-surface text-text-muted hover:border-text-muted'
                        }`}
                      >
                        <ShieldCheck size={18} />
                        Teacher
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button 
              type="submit" 
              variant="primary"
              loading={loading}
              className="w-full py-4 text-base shadow-soft"
            >
              {isLogin ? 'Log In' : 'Register Account'}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          {/* Demo Credentials */}
          {isLogin && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDemoCreds(!showDemoCreds)}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-brand/30 text-brand font-display font-bold text-sm hover:bg-brand/5 hover:border-brand/50 transition-all flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                {showDemoCreds ? 'Hide Demo Credentials' : 'Use Demo Credentials'}
              </button>
              <AnimatePresence>
                {showDemoCreds && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => { setEmail('admin@evalix.ai'); setPassword('123456'); setShowDemoCreds(false); }}
                        className="py-3 px-4 rounded-xl border-2 border-border bg-surface font-display font-bold text-sm transition-all hover:border-brand hover:bg-brand/5 flex flex-col items-center gap-1"
                      >
                        <ShieldCheck size={20} className="text-brand" />
                        <span className="text-text">Teacher</span>
                        <span className="text-[10px] text-text-muted font-mono">admin@evalix.ai</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEmail('student@evalix.ai'); setPassword('123456'); setShowDemoCreds(false); }}
                        className="py-3 px-4 rounded-xl border-2 border-border bg-surface font-display font-bold text-sm transition-all hover:border-brand hover:bg-brand/5 flex flex-col items-center gap-1"
                      >
                        <GraduationCap size={20} className="text-brand" />
                        <span className="text-text">Student</span>
                        <span className="text-[10px] text-text-muted font-mono">student@evalix.ai</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="pt-8 mt-8 border-t border-border text-center">
            <p className="text-text-muted font-medium font-sans text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-brand font-bold hover:underline underline-offset-4"
              >
                {isLogin ? 'Register here' : 'Log in here'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
