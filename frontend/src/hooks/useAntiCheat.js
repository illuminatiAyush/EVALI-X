import { useState, useEffect, useCallback } from 'react';

export function useAntiCheat(maxStrikes = 3, onForceSubmit) {
  const [strikeCount, setStrikeCount] = useState(0);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  const handleViolation = useCallback(() => {
    setStrikeCount((prevCount) => {
      const newCount = prevCount + 1;
      
      if (newCount >= maxStrikes) {
        // Close modal and force submission immediately
        setIsWarningModalOpen(false);
        onForceSubmit('Max tab-switch violations reached');
      } else {
        // Trap the user in the warning modal
        setIsWarningModalOpen(true);
      }
      
      return newCount;
    });
  }, [maxStrikes, onForceSubmit]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleViolation();
    };

    const handleBlur = () => {
      // Prevents split-screening or clicking out of the window
      handleViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Strict Mode Safe Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleViolation]);

  const dismissWarning = () => setIsWarningModalOpen(false);

  return { strikeCount, isWarningModalOpen, dismissWarning };
}
