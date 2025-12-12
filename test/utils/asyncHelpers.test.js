import { describe, test, expect, vi } from 'vitest';
import {
  withErrorHandler,
  withRetry,
  withTimeout,
  withAbort,
} from '../../src/utils/asyncHelpers';

describe('asyncHelpers', () => {
  describe('withErrorHandler', () => {
    test('returns result when no error occurs', async () => {
      const asyncFn = async () => 'success';
      const wrapped = withErrorHandler(asyncFn);

      const result = await wrapped();
      expect(result).toBe('success');
    });

    test('handles errors gracefully', async () => {
      const asyncFn = async () => {
        throw new Error('test error');
      };
      const wrapped = withErrorHandler(asyncFn);

      const result = await wrapped();
      expect(result).toBeNull();
    });

    test('calls custom error handler', async () => {
      const onError = vi.fn();
      const asyncFn = async () => {
        throw new Error('test error');
      };
      const wrapped = withErrorHandler(asyncFn, { onError });

      await wrapped();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test error',
        })
      );
    });

    test('returns fallback value on error', async () => {
      const asyncFn = async () => {
        throw new Error('test error');
      };
      const wrapped = withErrorHandler(asyncFn, { fallback: 'fallback value' });

      const result = await wrapped();
      expect(result).toBe('fallback value');
    });

    test('returns fallback function result on error', async () => {
      const asyncFn = async () => {
        throw new Error('test error');
      };
      const wrapped = withErrorHandler(asyncFn, {
        fallback: (error) => `Error: ${error.message}`,
      });

      const result = await wrapped();
      expect(result).toBe('Error: test error');
    });

    test('rethrows error when rethrow is true', async () => {
      const asyncFn = async () => {
        throw new Error('test error');
      };
      const wrapped = withErrorHandler(asyncFn, { rethrow: true });

      await expect(wrapped()).rejects.toThrow('test error');
    });
  });

  describe('withRetry', () => {
    test('succeeds on first attempt', async () => {
      const asyncFn = vi.fn().mockResolvedValue('success');
      const wrapped = withRetry(asyncFn, { maxRetries: 3 });

      const result = await wrapped();
      expect(result).toBe('success');
      expect(asyncFn).toHaveBeenCalledTimes(1);
    });

    test('retries on failure', async () => {
      const asyncFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const wrapped = withRetry(asyncFn, { 
        maxRetries: 3,
        initialDelay: 10,
      });

      const result = await wrapped();
      expect(result).toBe('success');
      expect(asyncFn).toHaveBeenCalledTimes(3);
    });

    test('throws after max retries exhausted', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('always fails'));

      const wrapped = withRetry(asyncFn, { 
        maxRetries: 2,
        initialDelay: 10,
      });

      await expect(wrapped()).rejects.toThrow('always fails');
      expect(asyncFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    test('calls onRetry callback', async () => {
      const onRetry = vi.fn();
      const asyncFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const wrapped = withRetry(asyncFn, {
        maxRetries: 2,
        initialDelay: 10,
        onRetry,
      });

      await wrapped();
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      );
    });

    test('respects shouldRetry predicate', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('no retry'));

      const shouldRetry = (error) => !error.message.includes('no retry');
      const wrapped = withRetry(asyncFn, {
        maxRetries: 3,
        initialDelay: 10,
        shouldRetry,
      });

      await expect(wrapped()).rejects.toThrow('no retry');
      expect(asyncFn).toHaveBeenCalledTimes(1); // Should not retry
    });
  });

  describe('withTimeout', () => {
    test('succeeds when operation completes in time', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      };

      const wrapped = withTimeout(asyncFn, 100);
      const result = await wrapped();
      expect(result).toBe('success');
    });

    test('throws timeout error when operation takes too long', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      };

      const wrapped = withTimeout(asyncFn, 50, 'Custom timeout message');
      await expect(wrapped()).rejects.toThrow('Custom timeout message');
    });
  });

  describe('withAbort', () => {
    test('executes function successfully', async () => {
      const asyncFn = async (signal) => {
        if (signal.aborted) throw new Error('Aborted');
        return 'success';
      };

      const abortable = withAbort(asyncFn);
      const result = await abortable.execute();
      expect(result).toBe('success');
    });

    test('aborts ongoing operation', async () => {
      const asyncFn = async (signal) => {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('success'), 100);
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
        return 'success';
      };

      const abortable = withAbort(asyncFn);
      const promise = abortable.execute();
      
      // Abort after a short delay
      setTimeout(() => abortable.abort(), 10);
      
      const result = await promise;
      expect(result).toBeNull(); // Returns null for aborted operations
    });

    test('provides abort signal', async () => {
      const asyncFn = vi.fn().mockResolvedValue('success');
      const abortable = withAbort(asyncFn);

      await abortable.execute('arg1', 'arg2');

      expect(asyncFn).toHaveBeenCalledWith(
        expect.objectContaining({ aborted: false }),
        'arg1',
        'arg2'
      );
    });
  });
});
