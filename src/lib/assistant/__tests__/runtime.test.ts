import { describe, expect, it, vi } from 'vitest';

import { runAssistantTurn } from '@/lib/assistant/runtime';
import { listCourseOptions } from '@/lib/assistant/tools/list-course-options';
import { searchPublicKB } from '@/lib/assistant/tools/search-public-kb';
import { getCourseFinderData } from '@/lib/content/repository';

// The real finder, so every suite here reads the real catalogue; the course-card
// test swaps in stubbed courses for a single call.
vi.mock('@/lib/content/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content/repository')>();
  return { ...actual, getCourseFinderData: vi.fn(actual.getCourseFinderData) };
});

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

  it('states no visa minimum and calls no course visa-suitable', async () => {
    for (const [locale, content] of [
      ['en', 'Do I need 3 months for a visa?'],
      ['de', 'Welche Voraussetzungen gibt es für ein Visum?'],
    ] as const) {
      const response = await runAssistantTurn({
        locale,
        userContext: anonymousContext,
        messages: [{ role: 'user', content }],
      });

      expect(response.intent).toBe('visa');
      expect(response.message).not.toMatch(/3 (months|Monate)|20 (lessons|Lektionen)/);
      expect(response.quickLinks?.some((link) => link.href === '/faq')).toBe(true);
    }
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

  /*
   * Figures the facts document rejects (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md):
   * German for Medical has no published fee, hours or dates; Bildungszeit is
   * €280 / €520 from B1, not €640 from A2; telc prep for B2 is €260.
   */
  it('quotes only figures the facts document verifies', () => {
    const content = (query: string, locale: 'en' | 'de') =>
      searchPublicKB(query, locale, 6).passages.map((entry) => entry.content).join('\n');

    for (const locale of ['en', 'de'] as const) {
      const medical = content(locale === 'de' ? 'medizin arzt' : 'medical doctor', locale);
      expect(medical).not.toMatch(/\b400\b|13:00|26\. ?Jun|26 Jun/);

      const bildungszeit = content('bildungszeit', locale);
      expect(bildungszeit).toContain('280');
      expect(bildungszeit).not.toMatch(/\b640\b|5 (days|Tage)/);

      const b2 = content('telc b2', locale);
      expect(b2).toContain('260');
      expect(b2).not.toMatch(/Vorbereitungskurs verfügbar für 520|Preparation course available at EUR 520/);

      const intensive = content(locale === 'de' ? 'intensivkurs visum' : 'intensive visa', locale);
      expect(intensive).not.toMatch(/Meets visa requirements|Visumstauglich|erfüllt diese Anforderung|meets this requirement/);
    }
  });
});

describe('assistant course cards', () => {
  /*
   * A zero is how the course data says "not published". Asserted on the rows
   * the card is built from, not on the rendered value: the formatter writes a
   * zero as "ab 0 €" (with a no-break space) or "from €0", which the pattern
   * this replaced never matched.
   */
  it('never shows a zero price or a zero weekly load', async () => {
    const zeroes = [
      { pricing_mode: 'from', default_price: 0 },
      { pricing_mode: 'fixed', default_price: 0 },
      // Postgres returns numeric(10,2) as a string.
      { pricing_mode: 'from', default_price: '0.00' as unknown as number },
    ] as const;

    for (const locale of ['en', 'de'] as const) {
      const finder = await getCourseFinderData(locale);
      const [template] = finder.courses;
      const courses = zeroes.map((zero, index) => ({ ...template, ...zero, id: `zero-${index}`, lessons_per_week: 0 }));
      vi.mocked(getCourseFinderData).mockResolvedValueOnce({ ...finder, courses });

      const cards = await listCourseOptions({}, locale, 6);

      expect(cards).toHaveLength(zeroes.length);
      for (const card of cards) {
        const labels = card.meta.map((entry) => entry.label);
        expect(labels, card.id).not.toContain(locale === 'de' ? 'Preis' : 'Price');
        expect(labels, card.id).not.toContain(locale === 'de' ? 'Lektionen/Woche' : 'Lessons/week');
      }
    }
  });

  it('says a quoted product is priced on request', async () => {
    const cards = await listCourseOptions({ goal: 'medical' }, 'en', 6);
    const medical = cards.find((card) => card.href.includes('medical'));

    expect(medical).toBeDefined();
    expect(medical!.meta).toContainEqual({ label: 'Price', value: 'On request' });
    expect(medical!.meta.some((entry) => entry.label === 'Lessons/week')).toBe(false);
  });
});
