import { performance } from 'node:perf_hooks';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { rateLimit } from '@/lib/api/rate-limit';
import { runAssistantTurn } from '@/lib/assistant/runtime';
import type { AssistantUserContext } from '@/lib/assistant/types';

/** The runtime reads only this much of the conversation. */
const MAX_MESSAGES = 20;

/*
 * Bounded, because the runtime normalises every user message on each turn and
 * an unbounded body kept the shared event loop busy for seconds. The widget
 * sends the whole conversation, so a long one is cut to its latest messages
 * rather than refused; a single message over 1,000 characters is refused.
 */
const assistantRequestSchema = z.object({
  messages: z.preprocess(
    (value) => (Array.isArray(value) ? value.slice(-MAX_MESSAGES) : value),
    z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().min(1).max(1000),
        })
      )
      .min(1)
      .max(MAX_MESSAGES)
  ),
  locale: z.enum(['en', 'de', 'es', 'fr', 'zh']).nullable().optional(),
  userContext: z
    .object({
      isAuthenticated: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'assistant', { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid request payload.',
      },
      { status: 400 }
    );
  }

  const parsed = assistantRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: 'error',
        message: parsed.error.issues[0]?.message ?? 'Invalid assistant request.',
      },
      { status: 400 }
    );
  }

  const start = performance.now();
  const requestedContext = parsed.data.userContext;

  const effectiveContext: AssistantUserContext = {
    isAuthenticated: requestedContext?.isAuthenticated === true,
  };

  const result = await runAssistantTurn({
    messages: parsed.data.messages,
    locale: parsed.data.locale,
    userContext: effectiveContext,
  });

  const latencyMs = Math.round(performance.now() - start);
  console.info('[assistant-api]', {
    latencyMs,
    locale: result.locale,
    isAuthenticated: effectiveContext.isAuthenticated,
    toolCalls: result.toolCalls,
    ctaHref: result.cta.href,
  });

  return NextResponse.json({
    status: 'ok',
    data: result,
  });
}
