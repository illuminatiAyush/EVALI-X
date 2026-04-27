import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  Settings, 
  Bell,
  Search,
  BrainCircuit,
  ChevronRight,
  Users,
  KeyRound,
  TerminalSquare
} from 'lucide-react';
import Input from '../components/ui/Input';

export default function MainLayout() {
  const { role, logout, user } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const teacherLinks = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Create Test', path: '/teacher/create-test', icon: PlusCircle },
    { name: 'Batches', path: '/teacher/batches', icon: Users },
  ];

  const studentLinks = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Attempts', path: '/student/history', icon: BookOpen },
    { name: 'Join Batch', path: '/student/join-batch', icon: KeyRound },
  ];

  const links = role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <div className="min-h-screen bg-background text-text transition-colors duration-300 flex font-sans noise-bg">
      {/* Sidebar */}
      <aside className="w-72 bg-surface border-r border-border hidden lg:flex flex-col sticky top-0 h-screen z-40 relative">
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none"></div>
        <div className="p-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white shadow-cyan-glow">
              <BrainCircuit size={24} />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">Evalix Core</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 relative z-10">
          <div className="px-4 mb-4">
            <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-widest">SYSTEM_MENU</span>
          </div>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group font-medium ${
                  isActive 
                    ? 'bg-brand/10 border border-brand/20 text-brand shadow-cyan-glow' 
                    : 'text-text-muted hover:bg-background border border-transparent hover:border-border hover:text-text'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isActive ? 'text-brand' : 'text-text-muted group-hover:text-text'} />
                  <span>{link.name}</span>
                </div>
                {isActive && <ChevronRight size={16} className="opacity-70" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border relative z-10 bg-surface/80 backdrop-blur-sm">
          <div className="p-4 bg-background border border-border rounded-xl flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg ${role === 'teacher' ? 'bg-purple-500/10 text-purple-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{role}_OP</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
              title="Terminate Session"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-30 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            {/* Search bar removed per user request */}
          </div>

          <div className="flex items-center gap-md">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-border">
              <TerminalSquare size={14} className="text-brand" />
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">Connected</span>
            </div>
            <button className="p-2.5 text-text-muted hover:bg-surface rounded-xl relative transition-all border border-transparent hover:border-border">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full shadow-cyan-glow"></span>
            </button>
            <button className="p-2.5 text-text-muted hover:bg-surface rounded-xl transition-all border border-transparent hover:border-border">
              <Settings size={20} />
            </button>
            <div className="h-8 w-px bg-border mx-2 hidden sm:block"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-display font-bold text-text leading-none mb-1">EVALIX CORE</p>
                <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${role === 'teacher' ? 'text-purple-500' : 'text-emerald-500'}`}>
                  {role === 'teacher' ? 'Instructor Auth' : 'Candidate Auth'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 lg:p-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-7xl mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
