/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  DEBUG LOGGER — Structured Console Logging for Evalix          ║
 * ║  Provides color-coded, context-rich logs for fast debugging.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const COLORS = {
  auth:     'color: #a78bfa; font-weight: bold',  // purple
  api:      'color: #22d3ee; font-weight: bold',  // cyan
  router:   'color: #f59e0b; font-weight: bold',  // amber
  db:       'color: #34d399; font-weight: bold',  // green
  ui:       'color: #f472b6; font-weight: bold',  // pink
  system:   'color: #94a3b8; font-weight: bold',  // slate
};

const LEVEL_STYLES = {
  info:  'color: #60a5fa',
  warn:  'color: #fbbf24',
  error: 'color: #ef4444; font-weight: bold',
  debug: 'color: #a1a1aa',
};

/**
 * Structured logger with context tagging.
 * 
 * Usage:
 *   debug.auth.info('Login successful', { userId: '...' })
 *   debug.api.error('Edge function failed', { fn: 'get-tests', error })
 *   debug.db.warn('RLS policy may be blocking insert', { table: 'profiles' })
 */
function createLogger(category) {
  const prefix = `[Evalix:${category.toUpperCase()}]`;
  const catStyle = COLORS[category] || COLORS.system;

  return {
    info(message, data = null) {
      if (data) {
        console.log(`%c${prefix} %c${message}`, catStyle, LEVEL_STYLES.info, data);
      } else {
        console.log(`%c${prefix} %c${message}`, catStyle, LEVEL_STYLES.info);
      }
    },

    warn(message, data = null) {
      if (data) {
        console.warn(`%c${prefix} %c⚠ ${message}`, catStyle, LEVEL_STYLES.warn, data);
      } else {
        console.warn(`%c${prefix} %c⚠ ${message}`, catStyle, LEVEL_STYLES.warn);
      }
    },

    error(message, data = null) {
      if (data) {
        console.error(`%c${prefix} %c✖ ${message}`, catStyle, LEVEL_STYLES.error, data);
      } else {
        console.error(`%c${prefix} %c✖ ${message}`, catStyle, LEVEL_STYLES.error);
      }
    },

    debug(message, data = null) {
      if (data) {
        console.debug(`%c${prefix} %c${message}`, catStyle, LEVEL_STYLES.debug, data);
      } else {
        console.debug(`%c${prefix} %c${message}`, catStyle, LEVEL_STYLES.debug);
      }
    },

    /** Logs a table of key-value pairs for quick inspection */
    table(label, obj) {
      console.groupCollapsed(`%c${prefix} %c${label}`, catStyle, LEVEL_STYLES.info);
      console.table(obj);
      console.groupEnd();
    },

    /** Times an async operation */
    async time(label, fn) {
      const start = performance.now();
      try {
        const result = await fn();
        const ms = (performance.now() - start).toFixed(1);
        console.log(`%c${prefix} %c${label} completed in ${ms}ms`, catStyle, LEVEL_STYLES.info);
        return result;
      } catch (err) {
        const ms = (performance.now() - start).toFixed(1);
        console.error(`%c${prefix} %c✖ ${label} failed after ${ms}ms`, catStyle, LEVEL_STYLES.error, err);
        throw err;
      }
    }
  };
}

export const debug = {
  auth:   createLogger('auth'),
  api:    createLogger('api'),
  router: createLogger('router'),
  db:     createLogger('db'),
  ui:     createLogger('ui'),
  system: createLogger('system'),
};

export default debug;
