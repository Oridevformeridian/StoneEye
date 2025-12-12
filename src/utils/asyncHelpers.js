/**
 * Async Helper Utilities
 * 
 * Wrapper functions for async operations with built-in error handling,
 * retry logic, timeouts, and cancellation support.
 */

import { handleError, Severity } from '../services/errorHandler';

/**
 * Wrap async function with error handling
 * 
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.context - Context for error logging
 * @param {Function} options.onError - Custom error handler
 * @param {boolean} options.rethrow - Whether to rethrow errors
 * @param {Function} options.fallback - Fallback value/function if error occurs
 * @returns {Function} Wrapped async function
 */
export function withErrorHandler(asyncFn, options = {}) {
  const {
    context = 'AsyncOperation',
    onError = null,
    rethrow = false,
    fallback = null,
  } = options;

  return async function wrappedFunction(...args) {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const errorResponse = handleError(error, {
        severity: Severity.ERROR,
        context: { operation: context, args },
        rethrow: false,
      });

      if (onError) {
        onError(errorResponse);
      }

      if (fallback !== null) {
        return typeof fallback === 'function' ? fallback(error) : fallback;
      }

      if (rethrow) {
        throw error;
      }

      return null;
    }
  };
}

/**
 * Retry async function with exponential backoff
 * 
 * @param {Function} asyncFn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.backoffMultiplier - Backoff multiplier (default: 2)
 * @param {Function} options.onRetry - Callback on each retry
 * @param {Function} options.shouldRetry - Predicate to determine if should retry
 * @returns {Function} Wrapped async function with retry logic
 */
export function withRetry(asyncFn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry = null,
    shouldRetry = null,
  } = options;

  return async function retriedFunction(...args) {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn(...args);
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (shouldRetry && !shouldRetry(error, attempt)) {
          throw error;
        }

        // Don't delay on last attempt
        if (attempt < maxRetries) {
          if (onRetry) {
            onRetry(error, attempt + 1, delay);
          }

          console.warn(`[withRetry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));

          // Exponential backoff
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }
    }

    // All retries exhausted
    console.error(`[withRetry] All ${maxRetries + 1} attempts failed`);
    throw lastError;
  };
}

/**
 * Add timeout to async function
 * 
 * @param {Function} asyncFn - Async function to add timeout to
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} timeoutMessage - Custom timeout error message
 * @returns {Function} Wrapped async function with timeout
 */
export function withTimeout(asyncFn, timeoutMs, timeoutMessage = 'Operation timed out') {
  return async function timedFunction(...args) {
    return Promise.race([
      asyncFn(...args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      ),
    ]);
  };
}

/**
 * Add AbortController support to async function
 * 
 * @param {Function} asyncFn - Async function that accepts AbortSignal
 * @returns {Object} Object with execute function and abort method
 */
export function withAbort(asyncFn) {
  let controller = null;

  return {
    execute: async function abortableFunction(...args) {
      // Create new abort controller
      controller = new AbortController();

      try {
        // Pass signal as first argument
        return await asyncFn(controller.signal, ...args);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.info('[withAbort] Operation aborted');
          return null;
        }
        throw error;
      }
    },

    abort: function () {
      if (controller) {
        controller.abort();
        controller = null;
      }
    },

    get signal() {
      return controller?.signal;
    },
  };
}

/**
 * Debounce async function
 * 
 * @param {Function} asyncFn - Async function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced async function
 */
export function debounceAsync(asyncFn, delay) {
  let timeoutId = null;
  let pending = null;

  return function debouncedFunction(...args) {
    // Cancel pending execution
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Return existing promise if still pending
    if (pending) {
      return pending;
    }

    // Create new promise
    pending = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await asyncFn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          pending = null;
          timeoutId = null;
        }
      }, delay);
    });

    return pending;
  };
}

/**
 * Throttle async function
 * 
 * @param {Function} asyncFn - Async function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled async function
 */
export function throttleAsync(asyncFn, limit) {
  let inThrottle = false;
  let lastResult = null;

  return async function throttledFunction(...args) {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = await asyncFn(...args);

      setTimeout(() => {
        inThrottle = false;
      }, limit);

      return lastResult;
    }

    return lastResult;
  };
}

/**
 * Execute async functions in sequence with error handling
 * 
 * @param {Array<Function>} asyncFns - Array of async functions
 * @param {Object} options - Execution options
 * @param {boolean} options.stopOnError - Stop execution on first error
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<Array>} Array of results (or errors)
 */
export async function executeSequence(asyncFns, options = {}) {
  const { stopOnError = true, onProgress = null } = options;
  const results = [];

  for (let i = 0; i < asyncFns.length; i++) {
    try {
      const result = await asyncFns[i]();
      results.push({ success: true, result });

      if (onProgress) {
        onProgress(i + 1, asyncFns.length, result);
      }
    } catch (error) {
      results.push({ success: false, error });

      if (onProgress) {
        onProgress(i + 1, asyncFns.length, null, error);
      }

      if (stopOnError) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Execute async functions in parallel with concurrency limit
 * 
 * @param {Array<Function>} asyncFns - Array of async functions
 * @param {number} concurrency - Maximum concurrent executions
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} Array of results
 */
export async function executeParallel(asyncFns, concurrency = 5, onProgress = null) {
  const results = new Array(asyncFns.length);
  let completed = 0;
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < asyncFns.length) {
      const index = nextIndex++;
      try {
        results[index] = { success: true, result: await asyncFns[index]() };
      } catch (error) {
        results[index] = { success: false, error };
      }

      completed++;
      if (onProgress) {
        onProgress(completed, asyncFns.length);
      }
    }
  }

  // Start workers
  const workers = Array(Math.min(concurrency, asyncFns.length))
    .fill()
    .map(() => runNext());

  await Promise.all(workers);
  return results;
}

export default {
  withErrorHandler,
  withRetry,
  withTimeout,
  withAbort,
  debounceAsync,
  throttleAsync,
  executeSequence,
  executeParallel,
};
