import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe('fallback career positions', () => {
  it('carry a fixed posting date, not the time the server started', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    vi.resetModules();

    const { listMockRows } = await import('../store');

    for (const row of listMockRows('career_positions', 'posted_at')) {
      expect(row.posted_at, String(row.slug)).toBe('2026-08-12T00:00:00.000Z');
    }
  });

  it('send applicants to the published applications address', async () => {
    const { listMockRows } = await import('../store');

    for (const row of listMockRows('career_positions')) {
      expect(row.apply_email, String(row.slug)).toBe('bewerbungen@casa-bremen.de');
    }
  });
});
