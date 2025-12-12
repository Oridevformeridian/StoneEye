import { describe, it, expect } from 'vitest';
import { validateItem } from '../../src/validation/validate';

const validItem = {
  id: 'item1',
  name: 'Sword',
  type: 'weapon',
  data: { IconId: 123, Level: 10 },
};

const invalidItem = {
  id: 'item2',
  name: 123, // should be string
  type: 'weapon',
  data: { IconId: 123, Level: 10 },
};

describe('Zod runtime validation', () => {
  it('accepts valid item', () => {
    expect(() => validateItem(validItem)).not.toThrow();
  });

  it('throws on invalid item', () => {
    expect(() => validateItem(invalidItem)).toThrow();
  });
});
