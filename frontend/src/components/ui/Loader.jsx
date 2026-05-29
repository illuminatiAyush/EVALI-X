import React from 'react';
import { motion } from 'framer-motion';

/**
 * 1. SleekSpinner - A premium minimalist gradient spinner with soft glow
 */
export function SleekSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className={`rounded-full border-t-brand border-r-transparent border-b-teal-200/30 border-l-transparent ${sizeClasses[size] || sizeClasses.md} shadow-[0_0_15px_rgba(13,148,136,0.15)]`}
      />
    </div>
  );
}

/**
 * 2. BrainPulse - An elegant pulsing brain loader with concentric neural wave rings
 */
export function BrainPulse({ className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Pulsing Outer Rings */}
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-teal-500/20 bg-teal-500/5"
        />
        <motion.div
          animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
          transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-teal-500/30 bg-teal-500/5"
        />
        
        {/* Central Glowing Orb */}
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 border border-teal-400/20 flex items-center justify-center shadow-lg shadow-teal-500/20"
        >
          {/* Internal Brain Circuit Icon Simulation */}
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </motion.div>
      </div>
      <p className="mt-4 font-display font-bold text-gray-800 text-sm tracking-tight">Synthesizing Context...</p>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1 animate-pulse">Evalix AI Core</p>
    </div>
  );
}

/**
 * 3. ShimmerCard - High-fidelity skeleton component for dashboards & batch views
 */
export function ShimmerCard({ count = 3, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 border border-gray-100 rounded-2xl bg-white shadow-soft relative overflow-hidden">
          {/* Shimmer Effect */}
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50 to-transparent skew-x-[-15deg]"
            style={{ width: '200%' }}
          />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-gray-100 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded-md w-1/3" />
              <div className="h-3 bg-gray-50 rounded-md w-1/2" />
            </div>
            <div className="w-16 h-7 bg-gray-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 4. GlowingRing - A nested orbit loop loader for micro-interactions
 */
export function GlowingRing({ className = '' }) {
  return (
    <div className={`relative w-24 h-24 flex items-center justify-center ${className}`}>
      {/* Outer loop */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="absolute w-20 h-20 rounded-full border-t-2 border-r-transparent border-b-2 border-l-transparent border-teal-500"
      />
      {/* Inner loop */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        className="absolute w-14 h-14 rounded-full border-t-2 border-r-teal-200 border-b-2 border-l-transparent border-orange-500"
      />
      {/* Center dot */}
      <div className="w-3.5 h-3.5 bg-teal-500 rounded-full shadow-[0_0_10px_rgba(13,148,136,0.5)] animate-pulse" />
    </div>
  );
}

/**
 * 5. FullPageLoader - Fullscreen backdrop with SleekSpinner
 */
export function FullPageLoader({ title = 'Initializing Session', subtitle = 'Preparing your workspace' }) {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6">
      <div className="relative mb-6">
        <GlowingRing />
      </div>
      <h3 className="text-lg font-display font-extrabold text-gray-800 tracking-tight">{title}</h3>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1.5">{subtitle}</p>
    </div>
  );
}
