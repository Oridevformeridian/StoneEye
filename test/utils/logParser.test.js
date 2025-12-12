import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import parseAndStoreLog from '../../src/utils/unifiedLogParser';
import LogService from '../../src/services/logService';

vi.mock('../../src/services/logService');

describe('parseAndStoreLog (unified log parser)', () => {
  beforeAll(() => {
    vi.spyOn(LogService, 'writeLog').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  const sampleLog = [
    '[2025-12-05 14:30:22] Logged in as character TestChar. Time UTC=12/05/2025',
    'ProcessStartInteraction(1234, NPC_Ragabir, 3032.843, flag, Ragabir)',
    'ProcessVendorScreen(1234, Ragabir, 3032, 1000, 60, ...)',
  ].join('\n');

  it('parses character login and vendor interaction', async () => {
    const result = await parseAndStoreLog(sampleLog, 'player.log');
    expect(result).toHaveProperty('entriesWritten');
    expect(result.entriesWritten).toBeGreaterThan(0);
    expect(result).toHaveProperty('character');
    expect(result.character).toBe('TestChar');
  });

  it('handles missing ProcessStartInteraction gracefully', async () => {
    const log = '[2025-12-05 14:30:22] ProcessVendorScreen(5678, Bob, 100, 200, 30, ...)';
    const result = await parseAndStoreLog(log, 'player.log');
    expect(result.entriesWritten).toBeGreaterThanOrEqual(0);
  });

  it('parses multiple vendor screens', async () => {
    const log = [
      'ProcessStartInteraction(1, NPC_A, 100, flag, A)',
      'ProcessVendorScreen(1, A, 100, 200, 30, ...)',
      'ProcessStartInteraction(2, NPC_B, 200, flag, B)',
      'ProcessVendorScreen(2, B, 200, 300, 40, ...)',
    ].join('\n');
    const result = await parseAndStoreLog(log, 'player.log');
    expect(result.entriesWritten).toBeGreaterThanOrEqual(2);
  });

  it('returns zero entries for empty log', async () => {
    const result = await parseAndStoreLog('', 'player.log');
    expect(result.entriesWritten).toBe(0);
  });

  it('parses and records transactions', async () => {
    const log = [
      'Logged in as character TestChar. Time UTC=12/05/2025',
      'ProcessStartInteraction(1, NPC_A, 100, flag, A)',
      'ProcessVendorScreen(1, A, 100, 200, 30, ...)',
      'ProcessVendorUpdateAvailableGold(90, 200, 30, ...)',
    ].join('\n');
    const result = await parseAndStoreLog(log, 'player.log');
    expect(result.entriesWritten).toBeGreaterThanOrEqual(1);
    expect(result.character).toBe('TestChar');
  });

  it('adds interaction without vendor screen', async () => {
    const log = [
      '[2025-12-05 14:30:22] Logged in as character TestChar. Time UTC=12/05/2025',
      'ProcessStartInteraction(42, NPC_Solo, 555, flag, Solo)',
    ].join('\n');
    const result = await parseAndStoreLog(log, 'player.log');
    expect(result.entriesWritten).toBe(1);
  });
});
