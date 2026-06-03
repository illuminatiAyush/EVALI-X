import React, { useState, useEffect } from 'react';

export default function AssessmentCard({ assessment, onStartTest }) {
  const { title, duration_minutes, scheduled_for, computed_status } = assessment;
  
  // Hydration-safe state mapping
  const [status, setStatus] = useState(computed_status);
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  useEffect(() => {
    if (status !== 'LOCKED') return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const scheduledTime = new Date(scheduled_for).getTime();
      const distance = scheduledTime - now;

      if (distance <= 0) {
        clearInterval(interval);
        setStatus('ACTIVE'); // Optimistic UI upgrade without hard refresh
        setTimeLeft('00:00:00');
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Format to HH:MM:SS
        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval); // Strict-mode safe cleanup
  }, [scheduled_for, status]);

  const isLocked = status === 'LOCKED';
  const isMissed = status === 'MISSED';
  const isActive = status === 'ACTIVE';

  return (
    <div className={`p-6 border rounded-2xl transition-all ${isMissed ? 'bg-surface-muted opacity-60 border-border grayscale' : 'bg-surface border-border shadow-sm'}`}>
      <h3 className="text-xl font-bold text-text">{title}</h3>
      <p className="text-sm text-text-muted mt-2 flex items-center gap-2">
        <span>⏱️ {duration_minutes} Minutes</span>
      </p>
      
      {/* Dynamic Status Blocks */}
      <div className="mt-6">
        {isMissed && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-semibold text-center">
            Missed / Expired
          </div>
        )}

        {isLocked && (
          <div className="p-4 bg-blue-50/50 border border-blue-100 text-blue-800 rounded-xl flex items-center justify-between">
            <span className="text-sm font-semibold">Unlocks in:</span>
            <span className="font-mono text-lg font-bold tracking-tight bg-surface px-3 py-1 rounded shadow-sm">
              {timeLeft}
            </span>
          </div>
        )}

        {isActive && (
          <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-sm font-bold text-center">
            Available Now
          </div>
        )}
      </div>

      <button
        onClick={() => onStartTest(assessment.assessment_id)}
        disabled={!isActive}
        className={`mt-4 w-full py-3 rounded-xl font-semibold transition-all ${
          isActive 
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-0.5' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isLocked ? 'Waiting to Start...' : 'Start Assessment'}
      </button>
    </div>
  );
}
