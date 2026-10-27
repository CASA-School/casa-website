import { describe, expect, it } from 'vitest';

import { sign, verify } from '../signature';

describe('SchoolMan sync signature', () => {
  const key = 'k'.repeat(64);
  const body = '{"table":"Booking","records":[]}';
  const now = 1_793_000_000;

  it('accepts its own signature', () => {
    expect(verify(key, body, sign(key, body, now), now)).toBe(true);
  });

  it('refuses another body, another key, no header and a stale or future time', () => {
    const header = sign(key, body, now);
    expect(verify(key, `${body} `, header, now)).toBe(false);
    expect(verify('x'.repeat(64), body, header, now)).toBe(false);
    expect(verify(key, body, null, now)).toBe(false);
    expect(verify(key, body, header, now + 301)).toBe(false);
    expect(verify(key, body, header, now - 301)).toBe(false);
  });

  it('refuses a malformed signature without throwing', () => {
    expect(verify(key, body, `t=${now},v1=abc`, now)).toBe(false);
    expect(verify(key, body, 'garbage', now)).toBe(false);
  });
});
