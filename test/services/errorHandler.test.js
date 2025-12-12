import { describe, test, expect } from 'vitest';
import {
  ErrorType,
  Severity,
  classifyError,
  getUserMessage,
  isRecoverable,
  createErrorResponse,
} from '../../src/services/errorHandler';

describe('errorHandler Service', () => {
  describe('classifyError', () => {
    test('classifies network errors', () => {
      const networkError = new Error('fetch failed');
      expect(classifyError(networkError)).toBe(ErrorType.NETWORK);

      const corsError = new Error('CORS policy blocked');
      expect(classifyError(corsError)).toBe(ErrorType.NETWORK);
    });

    test('classifies database errors', () => {
      const dbError = new Error('Dexie: QuotaExceededError');
      expect(classifyError(dbError)).toBe(ErrorType.DATABASE);

      const indexedDbError = new Error('IndexedDB transaction failed');
      expect(classifyError(indexedDbError)).toBe(ErrorType.DATABASE);
    });

    test('classifies parsing errors', () => {
      const parseError = new SyntaxError('Unexpected token');
      expect(classifyError(parseError)).toBe(ErrorType.PARSING);

      const jsonError = new Error('JSON parse error');
      expect(classifyError(jsonError)).toBe(ErrorType.PARSING);
    });

    test('classifies validation errors', () => {
      const validationError = new Error('validation failed');
      expect(classifyError(validationError)).toBe(ErrorType.VALIDATION);

      const invalidError = new Error('invalid input');
      expect(classifyError(invalidError)).toBe(ErrorType.VALIDATION);
    });

    test('classifies permission errors', () => {
      const permError = new Error('permission denied');
      expect(classifyError(permError)).toBe(ErrorType.PERMISSION);

      const accessError = new Error();
      accessError.code = 'EACCES';
      expect(classifyError(accessError)).toBe(ErrorType.PERMISSION);
    });

    test('classifies not found errors', () => {
      const notFoundError = new Error('not found');
      expect(classifyError(notFoundError)).toBe(ErrorType.NOT_FOUND);

      const error404 = new Error('404 error');
      expect(classifyError(error404)).toBe(ErrorType.NOT_FOUND);
    });

    test('returns UNKNOWN for unclassified errors', () => {
      const unknownError = new Error('something random');
      expect(classifyError(unknownError)).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('getUserMessage', () => {
    test('returns user-friendly message for each error type', () => {
      const networkError = new Error('fetch failed');
      const message = getUserMessage(networkError);
      expect(message).toContain('connect to the server');
      expect(message).toContain('internet connection');
    });

    test('returns database-specific message', () => {
      const dbError = new Error('Dexie error');
      const message = getUserMessage(dbError);
      expect(message).toContain('database');
      expect(message).toContain('data is safe');
    });

    test('returns generic message for unknown errors', () => {
      const unknownError = new Error('random error');
      const message = getUserMessage(unknownError);
      expect(message).toContain('unexpected error');
    });
  });

  describe('isRecoverable', () => {
    test('network errors are recoverable', () => {
      const networkError = new Error('fetch failed');
      expect(isRecoverable(networkError)).toBe(true);
    });

    test('database errors are recoverable', () => {
      const dbError = new Error('Dexie error');
      expect(isRecoverable(dbError)).toBe(true);
    });

    test('permission errors are recoverable', () => {
      const permError = new Error('permission denied');
      expect(isRecoverable(permError)).toBe(true);
    });

    test('parsing errors are not recoverable', () => {
      const parseError = new SyntaxError('Unexpected token');
      expect(isRecoverable(parseError)).toBe(false);
    });

    test('validation errors are not recoverable', () => {
      const validationError = new Error('validation failed');
      expect(isRecoverable(validationError)).toBe(false);
    });
  });

  describe('createErrorResponse', () => {
    test('creates standardized error response', () => {
      const error = new Error('test error');
      const context = { operation: 'testOp' };
      const response = createErrorResponse(error, context);

      expect(response).toHaveProperty('type');
      expect(response).toHaveProperty('message', 'test error');
      expect(response).toHaveProperty('userMessage');
      expect(response).toHaveProperty('recoverable');
      expect(response).toHaveProperty('context', context);
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('stack');
    });

    test('includes error classification', () => {
      const networkError = new Error('fetch failed');
      const response = createErrorResponse(networkError);

      expect(response.type).toBe(ErrorType.NETWORK);
      expect(response.recoverable).toBe(true);
    });

    test('timestamp is in ISO format', () => {
      const error = new Error('test');
      const response = createErrorResponse(error);

      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
