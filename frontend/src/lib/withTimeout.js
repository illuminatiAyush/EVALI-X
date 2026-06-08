import { debugLifecycle } from './debugLifecycle';

/**
 * Wraps a promise with a timeout.
 * @param {Promise} promise - The promise to wrap.
 * @param {number} ms - The timeout in milliseconds.
 * @param {string} label - A label for logging.
 * @returns {Promise}
 */
export function withTimeout(promise, ms, label = 'OPERATION') {
  return Promise.race([
    promise.then(result => {
      debugLifecycle.log(`[${label} SUCCESS]`);
      return result;
    }).catch(error => {
      debugLifecycle.log(`[${label} ERROR]`, { error: error.message });
      throw error;
    }),
    new Promise((_, reject) =>
      setTimeout(() => {
        debugLifecycle.log(`[${label} TIMEOUT] after ${ms}ms`);
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms)
    ),
  ]);
}
