import { describe, test, expect } from 'vitest';
import { parseLogContent } from '../src/utils/logParser.js';

describe('logParser', () => {
  test('parses interaction then vendor into combined entry', () => {
    const sample = ` [18:10:15] LocalPlayer: ProcessStartInteraction(22717, 7, 3032.843, True, NPC_Ragabir, )\n` +
                   `[18:13:12] LocalPlayer: ProcessVendorScreen(22717, SoulMates, 57334, 1764962987140, 60000, Now if this was a Human potion store, you'd have to worry about catching Mummy Rot from a dirty potion bottle. But not here! All my bottles are clean!, VendorInfo[], VendorInfo[], VendorInfo[], VendorPurchaseCap[], System.Int32[], System.String[], -1601, )`;

    const parsed = parseLogContent(sample);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);

    const p = parsed[0];
    expect(p.id).toBe(22717);
    expect(p.npc).toBe('NPC_Ragabir');
    expect(p.vendorName).toBe('NPC_Ragabir');
    expect(p.favorLabel).toBe('SoulMates');
    expect(p.favor).toBe(3032.843);
    expect(p.balance).toBe(57334);
    expect(p.resetTimer).toBe(1764962987140);
    expect(p.maxBalance).toBe(60000);
  });

  test('vendor without prior interaction uses unknown_<id> npc', () => {
    const sample = `[12:00:00] LocalPlayer: ProcessVendorScreen(9999, WeirdVendor, 10, 200, 300, , )`;
    const parsed = parseLogContent(sample);
    expect(parsed.length).toBe(1);
    expect(parsed[0].npc).toBe('unknown_9999');
  });
});
