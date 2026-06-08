import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../lib/api';

export function useAntiCheat(attemptId, onForceSubmit) {
  const [strikeCount, setStrikeCount] = useState(0);
  const [warningState, setWarningState] = useState({ isOpen: false, severity: null, message: null });

  const recordViolation = useCallback(async (type) => {
    if (!attemptId) return;

    try {
      // Fire-and-forget to backend
      const res = await apiService.recordViolation(attemptId, type);
      
      if (res && res.success) {
        setStrikeCount(res.data.violation_count);
        const severity = res.data.severity;
        
        if (severity === 'HIGH') {
          setWarningState({
            isOpen: true,
            severity: 'HIGH',
            message: `CRITICAL VIOLATION: You have committed a severe violation (${type}). This is strike ${res.data.violation_count}. Further violations will result in automatic submission.`,
          });
          
          // Optionally auto-submit if it's the 3rd tab switch or something else (handled by backend or here)
          if (res.data.violation_count >= 3 && type === 'tab_switch') {
             onForceSubmit('Auto-Submitted: Max tab-switch violations reached');
          }
        } else if (severity === 'MEDIUM') {
          setWarningState({
            isOpen: true,
            severity: 'MEDIUM',
            message: `WARNING: You left the secure environment (${type}). Please return immediately.`,
          });
        } else {
          // LOW severity — just show a subtle toast or brief warning
          setWarningState({
            isOpen: true,
            severity: 'LOW',
            message: `Notice: Activity detected (${type}). Please stay focused on the assessment.`,
          });
        }
      }
    } catch (err) {
      console.warn('[AntiCheat] Failed to record violation:', err);
    }
  }, [attemptId, onForceSubmit]);

  useEffect(() => {
    if (!attemptId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation('tab_switch');
      }
    };

    const handleBlur = () => {
      recordViolation('blur');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation('right_click');
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      recordViolation(e.type === 'copy' ? 'copy_attempt' : e.type === 'paste' ? 'paste_attempt' : 'cut_attempt');
    };

    const handleKeyDown = (e) => {
      // Prevent Print (Ctrl+P)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        recordViolation('print_attempt');
      }
      // Prevent DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j'))
      ) {
        e.preventDefault();
        recordViolation('devtools_attempt');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [attemptId, recordViolation]);

  const dismissWarning = () => setWarningState({ isOpen: false, severity: null, message: null });

  return { strikeCount, warningState, dismissWarning };
}
