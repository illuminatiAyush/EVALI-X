import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-xl transition-all relative overflow-hidden group border border-transparent hover:border-border ${className}`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <motion.div
        initial={false}
        animate={{ 
          rotate: theme === 'dark' ? 90 : 0,
          scale: theme === 'dark' ? 0 : 1,
          opacity: theme === 'dark' ? 0 : 1
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex items-center justify-center"
      >
        <Sun size={18} className="text-amber-500 group-hover:rotate-12 transition-transform duration-300" />
      </motion.div>
      
      <motion.div
        initial={false}
        animate={{ 
          rotate: theme === 'dark' ? 0 : -90,
          scale: theme === 'dark' ? 1 : 0,
          opacity: theme === 'dark' ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Moon size={18} className="text-teal-400 group-hover:-rotate-12 transition-transform duration-300" />
      </motion.div>
    </button>
  );
}
