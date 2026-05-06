import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  Bell,
  GraduationCap,
  ChevronRight,
  Users,
  KeyRound,
  Menu,
  X,
  User,
  Sparkles
} from 'lucide-react';

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

  const roleColor = role === 'teacher' ? 'blue' : 'emerald';
  const roleBg = role === 'teacher' ? 'bg-teal-50 text-teal-600' : 'bg-emerald-50 text-emerald-600';
  const roleLabel = role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <div className="min-h-screen bg-background text-text flex flex-col lg:flex-row font-sans pb-16 lg:pb-0">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden lg:flex flex-col sticky top-0 h-screen z-40">
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-display font-bold text-slate-800 tracking-tight">Evalix</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Navigation</p>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group text-[13px] font-medium ${
                  isActive 
                    ? 'bg-teal-50 text-teal-600 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{link.name}</span>
                </div>
                {isActive && <ChevronRight size={14} className="text-teal-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm ${roleBg}`}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] font-medium text-slate-400 capitalize">{roleLabel}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Header ─── */}
      <header className="lg:hidden h-14 bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center text-white">
            <GraduationCap size={15} />
          </div>
          <span className="text-base font-display font-bold text-slate-800">Evalix</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <Bell size={18} />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-500 bg-slate-50 border border-slate-100 rounded-lg"
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
            className="lg:hidden fixed inset-x-0 top-14 bg-white border-b border-slate-100 z-20 p-4 shadow-lg"
          >
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm ${roleBg}`}>
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] font-medium text-slate-400 capitalize">{roleLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to={`/${role}/profile`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-2.5 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                <User size={16} />
                <span>Account</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 p-2.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg border border-red-100"
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
        <header className="hidden lg:flex h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 px-8 items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-600">Online</span>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl relative transition-all">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />
            </button>
            <Link to={`/${role}/profile`} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
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
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-2 h-16 flex items-center justify-around z-40 safe-bottom">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full transition-all relative ${
                isActive ? 'text-teal-500' : 'text-slate-400'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
              <span className="text-[9px] font-semibold truncate w-full text-center">
                {link.shortName}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="mobileTab"
                  className="absolute top-0 w-10 h-0.5 bg-teal-500 rounded-b-full"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
