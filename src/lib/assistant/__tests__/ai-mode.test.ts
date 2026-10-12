import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runAssistantTurn } from '@/lib/assistant/runtime';

/*
 * The AI mode (ai.server.ts) is off unless CLARA_AI=on and a key exist; when on
 * it only rewrites the message, and fixed answers never reach it.
 */

const ask = (content: string, locale: 'de' | 'en' = 'de') =>
  runAssistantTurn({ messages: [{ role: 'user', content }], locale, userContext: { isAuthenticated: false } });

const modelSays = (text: string) =>
  vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 }));

describe('CLARA AI mode', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('is off by default: no model call', async () => {
    const fetchMock = modelSays('nope');
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const response = await ask('Was kostet der Intensivkurs?');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.message).toContain('520');
  });

  it('when on, writes the message and keeps the deterministic button', async () => {
    vi.stubEnv('CLARA_AI', 'on');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const fetchMock = modelSays('Der Intensivkurs kostet 520 € für vier Wochen. Melde dich gern an.');
    vi.stubGlobal('fetch', fetchMock);
    const response = await ask('Was kostet der Intensivkurs?');
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.messages.at(-1).content).toContain('SOURCES');
    expect(response.message).toBe('Der Intensivkurs kostet 520 € für vier Wochen. Melde dich gern an.');
    expect(response.cta.href).toBe('/courses/intensive-german');
  });

  it('never rewrites a visa answer', async () => {
    vi.stubEnv('CLARA_AI', 'on');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const fetchMock = modelSays('Du brauchst 3 Monate Kurs.');
    vi.stubGlobal('fetch', fetchMock);
    const response = await ask('Brauche ich für das Visum einen Intensivkurs?');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.intent).toBe('visa');
  });

  it('falls back to the site answer when the model fails or says „Sie"', async () => {
    vi.stubEnv('CLARA_AI', 'on');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 529 })));
    expect((await ask('Was kostet der Intensivkurs?')).message).toContain('520');
    vi.stubGlobal('fetch', modelSays('Gern schicken wir Ihnen die Preise.'));
    expect((await ask('Was kostet der Intensivkurs?')).message).toContain('520');
  });
});
