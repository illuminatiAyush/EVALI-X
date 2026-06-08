import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  GraduationCap,
  ChevronRight,
  Users,
  KeyRound,
  Menu,
  X,
  User
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import NotificationMenu from '../components/NotificationMenu';

export default function MainLayout() {
  const { role, logout, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const teacherLinks = [
    { name: 'Dashboard', shortName: 'Home', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Create Test', shortName: 'Create', path: '/teacher/create-test', icon: PlusCircle },
    { name: 'My Classes', shortName: 'Classes', path: '/teacher/batches', icon: Users },
    { name: 'Profile', shortName: 'Profile', path: '/teacher/profile', icon: User },
  ];

  const studentLinks = [
    { name: 'Dashboard', shortName: 'Home', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'History', shortName: 'History', path: '/student/history', icon: BookOpen },
    { name: 'Join Class', shortName: 'Join', path: '/student/join-batch', icon: KeyRound },
    { name: 'Profile', shortName: 'Profile', path: '/student/profile', icon: User },
  ];

  const links = role === 'teacher' ? teacherLinks : studentLinks;

  const roleBg = role === 'teacher' 
    ? 'bg-brand-light text-brand' 
    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  const roleLabel = role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <div className="min-h-screen bg-background text-text flex flex-col lg:flex-row font-sans pb-16 lg:pb-0 transition-colors duration-200">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="w-64 bg-surface border-r border-border hidden lg:flex flex-col sticky top-0 h-screen z-40 transition-colors duration-200">
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-brand to-brand-hover rounded-xl flex items-center justify-center text-white shadow-md">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-display font-bold text-text tracking-tight">Evalix</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Navigation</p>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group text-[13px] font-medium ${
                  isActive 
                    ? 'bg-brand-light text-brand shadow-sm' 
                    : 'text-text-muted hover:bg-surface-muted hover:text-text'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{link.name}</span>
                </div>
                {isActive && <ChevronRight size={14} className="text-brand" />}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-border">
          <div className="p-3 bg-surface-muted rounded-xl flex items-center gap-2.5 transition-colors duration-200">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm ${roleBg}`}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] font-medium text-text-muted capitalize">{roleLabel}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Header ─── */}
      <header className="lg:hidden h-14 bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-30 px-4 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand to-brand-hover rounded-lg flex items-center justify-center text-white">
            <GraduationCap size={15} />
          </div>
          <span className="text-base font-display font-bold text-text">Evalix</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationMenu />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-text bg-surface-muted border border-border rounded-lg transition-colors duration-200"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed inset-x-0 top-14 bg-surface border-b border-border z-20 p-4 shadow-lg"
          >
            <div className="flex items-center gap-2.5 p-3 bg-surface-muted rounded-xl mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm ${roleBg}`}>
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-medium text-text-muted capitalize">{roleLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to={`/${role}/profile`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-2.5 text-xs font-medium text-text-muted bg-surface-muted rounded-lg border border-border">
                <User size={16} />
                <span>Account</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 p-2.5 text-xs font-medium text-danger bg-danger/10 rounded-lg border border-danger/20"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Bar */}
        <header className="hidden lg:flex h-16 bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-30 px-8 items-center justify-between transition-colors duration-200">
          <div />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-semibold">Online</span>
            </div>
            
            <ThemeToggle />
            
            <NotificationMenu />
            <Link to={`/${role}/profile`} className="p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-xl transition-all">
              <User size={18} />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md border-t border-border px-2 h-16 flex items-center justify-around z-40 safe-bottom transition-colors duration-200">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full transition-all relative ${
                isActive ? 'text-brand' : 'text-text-muted'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
              <span className="text-[9px] font-semibold truncate w-full text-center">
                {link.shortName}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="mobileTab"
                  className="absolute top-0 w-10 h-0.5 bg-brand rounded-b-full"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
