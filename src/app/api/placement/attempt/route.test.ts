import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock('@/lib/placement/attempt.server', () => ({
  startAttempt: mocks.start,
  computeProgress: vi.fn(),
  toClientState: vi.fn(),
}));

import { POST } from './route';

const request = (forwardedFor: string) =>
  new Request('http://localhost/api/placement/attempt', {
    method: 'POST',
    headers: { 'x-forwarded-for': forwardedFor },
    body: '{}',
  }) as NextRequest;

beforeEach(() => resetRateLimits());

describe('starting a placement attempt', () => {
  it('allows sixty starts from one address in ten minutes, a class on one network', async () => {
    for (let i = 0; i < 60; i += 1) {
      // Refused as invalid, but counted: the limit runs before parsing.
      expect((await POST(request('203.0.113.9'))).status).toBe(400);
    }

    expect((await POST(request('203.0.113.9'))).status).toBe(429);
    expect((await POST(request('203.0.113.10'))).status).toBe(400);
    expect(mocks.start).not.toHaveBeenCalled();
  });
});
