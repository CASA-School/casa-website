import { performance } from 'node:perf_hooks';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { runAssistantTurn } from '@/lib/assistant/runtime';
import type { AssistantUserContext } from '@/lib/assistant/types';

const assistantRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .min(1),
  locale: z.enum(['en', 'de', 'es', 'fr', 'zh']).nullable().optional(),
  userContext: z
    .object({
      isAuthenticated: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export async function POST(request: NextRequest) {
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
