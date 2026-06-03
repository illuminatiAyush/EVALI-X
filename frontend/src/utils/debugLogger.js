/**
 * EVALIX AI - CRITICAL REALTIME SYNCHRONIZATION LOGGER
 */

export const debug = {
  log: (...args) => {
    console.log('[EVALIX DEBUG]', ...args);
  },
  auth: {
    info: (...args) => console.log('[AUTH]', ...args),
    error: (...args) => console.error('[AUTH ERROR]', ...args),
  },
  realtime: {
    info: (...args) => console.log('[REALTIME]', ...args),
    error: (...args) => console.error('[REALTIME ERROR]', ...args),
  },
  teacher: {
    info: (...args) => console.log('[TEACHER]', ...args),
    error: (...args) => console.error('[TEACHER ERROR]', ...args),
  },
  student: {
    info: (...args) => console.log('[STUDENT]', ...args),
    error: (...args) => console.error('[STUDENT ERROR]', ...args),
  },
  db: {
    info: (...args) => console.log('[DB]', ...args),
    error: (...args) => console.error('[DB ERROR]', ...args),
  },
  submission: {
    info: (...args) => console.log('[SUBMISSION]', ...args),
    error: (...args) => console.error('[SUBMISSION ERROR]', ...args),
  }
};

export default debug;
