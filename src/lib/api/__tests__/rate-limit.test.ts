import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clientAddress, rateLimit, resetRateLimits } from '../rate-limit';

const request = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/contact', { method: 'POST', headers });

const budget = { limit: 2, windowMs: 60_000 };

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-23T08:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('clientAddress', () => {
  it('takes the last X-Forwarded-For hop, the one the ingress appended', () => {
    // Everything to the left was written by the client and can be forged.
    expect(clientAddress(request({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }))).toBe(
      '203.0.113.9'
    );
  });

  it('falls back to X-Real-IP, then to one shared bucket', () => {
    expect(clientAddress(request({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
    expect(clientAddress(request())).toBe('unknown');
  });

  it('accepts bare headers, as a server action has them', () => {
    expect(clientAddress(new Headers({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9');
  });
});

describe('rateLimit', () => {
  it('lets a client through up to its budget, then answers 429 in both shapes', async () => {
    const from = { 'x-forwarded-for': '203.0.113.9' };

    expect(rateLimit(request(from), 'contact', budget)).toBeNull();
    expect(rateLimit(request(from), 'contact', budget)).toBeNull();

    const refused = rateLimit(request(from), 'contact', budget);
    expect(refused?.status).toBe(429);
    expect(refused?.headers.get('retry-after')).toBe('60');
    expect(await refused?.json()).toMatchObject({
      data: null,
      error: { code: 'RATE_LIMITED' },
      status: 'error',
      message: expect.stringContaining('Zu viele Anfragen'),
    });
  });

  it('answers in English when the form was on an English page', async () => {
    const from = { 'x-forwarded-for': '203.0.113.9', referer: 'https://casa-bremen.de/en/contact' };
    rateLimit(request(from), 'contact', { limit: 0, windowMs: 60_000 });
    const refused = rateLimit(request(from), 'contact', { limit: 0, windowMs: 60_000 });
    expect((await refused?.json()).message).toContain('Too many requests');
  });

  it('counts each client and each bucket separately', () => {
    const a = { 'x-forwarded-for': '203.0.113.9' };
    const b = { 'x-forwarded-for': '203.0.113.10' };

    rateLimit(request(a), 'contact', budget);
    rateLimit(request(a), 'contact', budget);

    expect(rateLimit(request(b), 'contact', budget)).toBeNull();
    expect(rateLimit(request(a), 'careers-apply', budget)).toBeNull();
    expect(rateLimit(request(a), 'contact', budget)?.status).toBe(429);
  });

  it('opens a fresh window once the old one has passed', () => {
    const from = { 'x-forwarded-for': '203.0.113.9' };

    rateLimit(request(from), 'contact', budget);
    rateLimit(request(from), 'contact', budget);
    expect(rateLimit(request(from), 'contact', budget)?.status).toBe(429);

    vi.advanceTimersByTime(60_000);
    expect(rateLimit(request(from), 'contact', budget)).toBeNull();
  });
});
