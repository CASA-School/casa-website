import { describe, expect, it } from 'vitest';

import { runAssistantTurn } from '@/lib/assistant/runtime';
import { searchPublicKB } from '@/lib/assistant/tools/search-public-kb';

const anonymousContext = {
  isAuthenticated: false,
} as const;

describe('assistant runtime', () => {
  it('returns course options when enough course signals are provided', async () => {
    const response = await runAssistantTurn({
      locale: 'en',
      userContext: anonymousContext,
      messages: [
        {
          role: 'user',
          content: 'I need a B2 evening german course and then registration details.',
        },
      ],
    });

    expect(response.intent).toBe('course_match');
    expect(response.cards && response.cards.length > 0).toBeTruthy();
    expect(response.cta.href).toBe('/registration/course');
  });

  it('routes dashboard questions to contact support without implying a live portal', async () => {
    const response = await runAssistantTurn({
      locale: 'en',
      userContext: {
        isAuthenticated: true,
      },
      messages: [
        {
          role: 'user',
          content: 'Help me open the right dashboard page in portal.',
        },
      ],
    });

    expect(response.intent).toBe('contact');
    expect(response.cta.href).toBe('/contact');
    expect(response.message.toLowerCase()).toContain('does not currently offer a live learner or staff dashboard');
  });

  it('adds visa disclaimer guidance', async () => {
    const response = await runAssistantTurn({
      locale: 'en',
      userContext: anonymousContext,
      messages: [
        {
          role: 'user',
          content: 'Can you confirm my visa requirements?',
        },
      ],
    });

    expect(response.intent).toBe('visa');
    expect(response.message.toLowerCase()).toContain('not legal certainty');
    expect(response.cta.href).toContain('/contact');
  });

  it('keeps course guidance coherent on short follow-up messages', async () => {
    const response = await runAssistantTurn({
      locale: 'en',
      userContext: anonymousContext,
      messages: [
        {
          role: 'user',
          content: 'I am B2 and looking for a german class.',
        },
        {
          role: 'assistant',
          content: 'Tell me your preferred rhythm.',
        },
        {
          role: 'user',
          content: 'evening please',
        },
      ],
    });

    expect(response.intent).toBe('course_match');
    expect(response.cta.href).toBe('/registration/course');
  });

  it('keeps exam intent on short follow-up prompts', async () => {
    const response = await runAssistantTurn({
      locale: 'en',
      userContext: anonymousContext,
      messages: [
        {
          role: 'user',
          content: 'Help me choose between telc B2 and C1 Hochschule.',
        },
        {
          role: 'assistant',
          content: 'What is your target exam level?',
        },
        {
          role: 'user',
          content: 'dates?',
        },
      ],
    });

    expect(response.intent).toBe('exam_pathway');
    expect(response.cta.href).toBe('/exams');
  });
});

describe('assistant knowledge search', () => {
  it('returns exam-focused passages for exam queries', () => {
    const result = searchPublicKB('telc c1 exam route', 'en');
    expect(result.passages.length).toBeGreaterThan(0);
    expect(result.passages.some((entry) => entry.url.startsWith('/exams'))).toBeTruthy();
  });

  it('returns accommodation-focused passages for german housing queries', () => {
    const result = searchPublicKB('unterkunft gastfamilie und wg', 'de');
    expect(result.passages.length).toBeGreaterThan(0);
    expect(result.routeSuggestions.some((entry) => entry.href.startsWith('/accommodation'))).toBeTruthy();
  });

  it('routes nonprofit and integration queries to the public-benefit pages', () => {
    const nonprofit = searchPublicKB('gemeinnützige gGmbH Mittelverwendung', 'de');
    const integration = searchPublicKB('Here Ahead Garantiefonds Hochschule Integration', 'de');

    expect(nonprofit.passages.some((entry) => entry.url === '/ueber-uns/gemeinnuetzigkeit')).toBeTruthy();
    expect(nonprofit.routeSuggestions.some((entry) => entry.href === '/ueber-uns/gemeinnuetzigkeit')).toBeTruthy();
    expect(integration.passages.some((entry) => entry.url === '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte')).toBeTruthy();
    expect(integration.routeSuggestions.some((entry) => entry.href === '/ueber-uns/gemeinnuetzigkeit#integrationsprojekte')).toBeTruthy();
  });
});
