import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({ turn: vi.fn() }));
vi.mock('@/lib/assistant/runtime', () => ({ runAssistantTurn: mocks.turn }));

import { POST } from './route';

const request = (body: unknown) =>
  new Request('http://localhost/api/assistant', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as NextRequest;

const conversation = (length: number) =>
  Array.from({ length }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `message ${index}`,
  }));

beforeEach(() => {
  resetRateLimits();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  mocks.turn.mockResolvedValue({ locale: 'en', toolCalls: [], cta: { href: '/contact' }, message: 'ok' });
});

afterEach(() => vi.restoreAllMocks());

describe('assistant request bounds', () => {
  it('refuses a single message over 1,000 characters', async () => {
    const response = await POST(request({ messages: [{ role: 'user', content: 'a'.repeat(1001) }] }));

    expect(response.status).toBe(400);
    expect(mocks.turn).not.toHaveBeenCalled();
  });

  it('answers a long conversation from its latest twenty messages', async () => {
    // The widget sends the whole conversation; a long one is cut, not refused.
    const response = await POST(request({ messages: conversation(31) }));

    expect(response.status).toBe(200);
    const { messages } = mocks.turn.mock.calls[0][0];
    expect(messages).toHaveLength(20);
    expect(messages.at(-1).content).toBe('message 30');
  });

  it('limits one client to sixty turns a minute', async () => {
    for (let i = 0; i < 60; i += 1) {
      expect((await POST(request({ messages: conversation(1) }))).status).toBe(200);
    }
    expect((await POST(request({ messages: conversation(1) }))).status).toBe(429);
  });
});
