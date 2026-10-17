import { describe, expect, it } from 'vitest';

import { bookingLight, bookingLightLabel, paidInFull } from '../bookings';

/**
 * The team's colours (docs/schoolman/bookings.md): red cancelled, yellow under observation, grey
 * „unklar" until paid in full, green all good — worked out, so grey cannot go stale the way
 * SchoolMan's `???` did on bookings long paid.
 */
const base = { status: 'confirmed' as const, observationReason: null, charged: 940, paid: 940 };

describe('bookingLight', () => {
  it('is green when nothing is open and nobody is watching', () => {
    expect(bookingLight(base)).toBe('ok');
  });

  it('is grey while anything is open, and when nothing has been charged yet', () => {
    expect(bookingLight({ ...base, paid: 100 })).toBe('unclear');
    expect(bookingLight({ ...base, paid: 0 })).toBe('unclear');
    expect(bookingLight({ ...base, charged: 0, paid: 0 })).toBe('unclear');
  });

  it('is green when paid over: a credit is not a debt', () => {
    expect(bookingLight({ ...base, paid: 1000 })).toBe('ok');
  });

  it('is yellow under observation, paid or not', () => {
    expect(bookingLight({ ...base, observationReason: 'level' })).toBe('watch');
    expect(bookingLight({ ...base, observationReason: 'visa', paid: 0 })).toBe('watch');
  });

  it('is red once cancelled, whatever else holds', () => {
    expect(bookingLight({ ...base, status: 'cancelled', observationReason: 'level', paid: 0 })).toBe('no');
  });

  it('counts a cent of rounding as paid', () => {
    expect(paidInFull(417.99, 417.985)).toBe(true);
    expect(paidInFull(417.99, 417.9)).toBe(false);
  });
});

describe('bookingLightLabel', () => {
  it('says what the grey is: open, part paid, or nothing charged', () => {
    expect(bookingLightLabel({ ...base, paid: 0 }).de).toBe('Offen');
    expect(bookingLightLabel({ ...base, paid: 200 }).de).toBe('Anzahlung erhalten');
    expect(bookingLightLabel({ ...base, charged: 0, paid: 0 }).de).toBe('Ohne Kosten');
    expect(bookingLightLabel(base).de).toBe('In Ordnung');
    expect(bookingLightLabel({ ...base, observationReason: 'level', paid: 0 }).de).toBe('Unter Beobachtung');
  });
});
