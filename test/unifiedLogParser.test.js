import { describe, test, expect, beforeEach, vi } from 'vitest';
import { resetParserState } from '../src/utils/unifiedLogParser.js';

/**
 * Note: Full integration tests for unifiedLogParser are in test/integration/vendorTracking.test.js
 * These unit tests focus on the parser state management and exported functions
 * 
 * The parser is currently tightly coupled to the global db instance which makes
 * unit testing difficult. This should be refactored in Phase 4 (Code Consolidation)
 * to accept a db instance as a parameter, enabling proper dependency injection.
 */

describe('unifiedLogParser - State Management', () => {
  beforeEach(() => {
    resetParserState();
  });

  test('resetParserState function exists and can be called', () => {
    expect(resetParserState).toBeDefined();
    expect(typeof resetParserState).toBe('function');
    
    // Should not throw
    expect(() => resetParserState()).not.toThrow();
  });

  test('parser exports parseAndStoreLog function', async () => {
    const { parseAndStoreLog } = await import('../src/utils/unifiedLogParser.js');
    expect(parseAndStoreLog).toBeDefined();
    expect(typeof parseAndStoreLog).toBe('function');
  });

  test('parseAndStoreLog handles empty content', async () => {
    const { parseAndStoreLog } = await import('../src/utils/unifiedLogParser.js');
    const result = await parseAndStoreLog('', 'empty.log');
    
    expect(result).toBeDefined();
    expect(result.entriesWritten).toBe(0);
  });

  test('parseAndStoreLog handles whitespace-only content', async () => {
    const { parseAndStoreLog } = await import('../src/utils/unifiedLogParser.js');
    const result = await parseAndStoreLog('   \n\n  \n  ', 'whitespace.log');
    
    expect(result).toBeDefined();
    expect(result.entriesWritten).toBe(0);
  });
});

// TODO: Phase 4 - Refactor unifiedLogParser to accept db as parameter
// This will enable proper unit testing with mock databases
// For now, see integration tests for full parser functionality

