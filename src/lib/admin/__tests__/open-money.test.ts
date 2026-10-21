import { describe, expect, it } from 'vitest';

import { OPEN_FROM, owesMoney, owesSql } from '../open-money';
import { paidInFull } from '../bookings';

// Rahman, 2026-10-21: under 5 € counts as paid — a leftover of cents or a few euros is not chased.
describe('open money', () => {
  it('owes from 5 € on, not below', () => {
    expect(OPEN_FROM).toBe(5);
    expect(owesMoney(0.02)).toBe(false);
    expect(owesMoney(4.99)).toBe(false);
    expect(owesMoney(5)).toBe(true);
    expect(owesMoney(480)).toBe(true);
    expect(owesMoney(-120)).toBe(false);
  });

  it('a booking with a leftover under 5 € is paid in full; nothing charged is not', () => {
    expect(paidInFull(1077.12, 1077.1)).toBe(true);
    expect(paidInFull(1018.97, 1016.97)).toBe(true);
    expect(paidInFull(1018.97, 996)).toBe(false);
    expect(paidInFull(0, 0)).toBe(false);
  });

  it('says the same in SQL', () => {
    expect(owesSql('charged - paid')).toBe('(charged - paid) >= 5');
  });
});
