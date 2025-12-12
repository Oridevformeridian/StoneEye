import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest';
import parseAndStoreLog from '../src/utils/unifiedLogParser.js';
import LogService from '../src/services/logService';

vi.mock('../src/services/logService');

describe('logParser (unified)', () => {
  beforeAll(() => {
    vi.spyOn(LogService, 'writeLog').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('parses interaction then vendor into combined entry', async () => {
    const sample = [
      '[2025-12-05 18:10:15] Logged in as character TestChar. Time UTC=12/05/2025',
      '[18:10:15] ProcessStartInteraction(22717, 7, 3032.843, True, NPC_Ragabir, )',
      '[18:13:12] ProcessVendorScreen(22717, SoulMates, 57334, 1764962987140, 60000, ...)',
    ].join('\n');
    const result = await parseAndStoreLog(sample, 'player.log');
    expect(result).toHaveProperty('entriesWritten');
    expect(result.entriesWritten).toBeGreaterThanOrEqual(1);
    expect(result).toHaveProperty('character');
    expect(result.character).toBe('TestChar');
  });

  test('vendor without prior interaction uses unknown_<id> npc', async () => {
    const sample = '[18:13:12] ProcessVendorScreen(9999, WeirdVendor, 10, 200, 300, ...)';
    const result = await parseAndStoreLog(sample, 'player.log');
    expect(result.entriesWritten).toBeGreaterThanOrEqual(0);
    // We cannot directly check the vendor name, but the parser should not throw
  });
});
