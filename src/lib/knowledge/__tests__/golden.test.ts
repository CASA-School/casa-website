import { mkdirSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { runAssistantTurn } from '@/lib/assistant/runtime';
import { searchPublicContent } from '@/lib/search/public-search';

import golden from './golden-questions.json';

/**
 * 124 questions visitors ask, in German and English, typed carefully and
 * carelessly, each with the pages that answer it and the facts a right answer
 * contains (written 2026-10-12 against the site's content). This measures the
 * structured half of the index — FAQ, catalogue, CLARA's passages — the part
 * every runtime mode has; production adds every rendered page on top.
 *
 * Measured 2026-10-12 (this structured half / production with every page read):
 * search finds the page first 79% / 78%, in its top three 90% / 94%; CLARA
 * points to it 90% / 95% and states its facts 74%. The old search and CLARA,
 * on the same questions: 31% / 39% and 37% / 7%. The visa-requirement
 * questions expect no figures: CLARA never states a visa minimum (runtime.test).
 *
 * The floors below are the measured scores minus a small margin: a change that
 * makes search or CLARA worse at these questions fails here. Raise them when
 * the scores rise. `GOLDEN_REPORT=1 npx vitest run golden` writes every miss to output/golden/.
 */

type Golden = { id: string; locale: 'de' | 'en'; query: string; kind: 'question' | 'search'; expect: string[]; facts: string[]; topic: string };
const entries = golden as Golden[];

const pathOf = (href: string) => href.split(/[?#]/)[0];
const report = process.env.GOLDEN_REPORT === '1';
// Dates move; the three next-start entries are checked for their page only.
const timeless = (entry: Golden) => entry.topic !== 'next_start';

/** output/golden/<part>.txt: the scores and every miss, for tuning. */
function writeReport(part: string, scores: Record<string, number>, misses: string[]) {
  mkdirSync('output/golden', { recursive: true });
  writeFileSync(`output/golden/${part}.txt`, `${JSON.stringify(scores)}\n${misses.join('\n')}\n`);
}

describe('golden questions', () => {
  it('search finds the answering page', { timeout: 120_000 }, async () => {
    let first = 0;
    let topThree = 0;
    const misses: string[] = [];
    for (const entry of entries) {
      const result = await searchPublicContent({ locale: entry.locale, query: entry.query, scope: 'all' });
      const paths = result.top.map((item) => pathOf(item.href));
      const answerPath = result.answer ? pathOf(result.answer.href) : undefined;
      const ranked = answerPath ? [answerPath, ...paths] : paths;
      if (entry.expect.includes(ranked[0])) first += 1;
      if (ranked.slice(0, 3).some((path) => entry.expect.includes(path))) topThree += 1;
      else misses.push(`${entry.id}: "${entry.query}" → ${ranked.slice(0, 3).join(', ') || '(nothing)'} (want ${entry.expect.join(' | ')})`);
    }
    const scores = { first: first / entries.length, topThree: topThree / entries.length };
    if (report) writeReport('search', scores, misses);
    expect(scores.topThree).toBeGreaterThanOrEqual(0.86);
    expect(scores.first).toBeGreaterThanOrEqual(0.75);
  });

  it('CLARA points to the answering page and states its facts', { timeout: 120_000 }, async () => {
    const questions = entries.filter((entry) => entry.kind === 'question');
    let pointed = 0;
    let factual = 0;
    let withFacts = 0;
    const misses: string[] = [];
    for (const entry of questions) {
      const response = await runAssistantTurn({
        messages: [{ role: 'user', content: entry.query }],
        locale: entry.locale,
        userContext: { isAuthenticated: false },
      });
      const paths = [response.cta.href, ...(response.quickLinks ?? []).map((link) => link.href), ...(response.basedOn ?? []), ...(response.cards ?? []).map((card) => card.href)].map(pathOf);
      const hit = paths.some((path) => entry.expect.includes(path));
      if (hit) pointed += 1;
      const facts = timeless(entry) ? entry.facts : [];
      if (facts.length > 0) {
        withFacts += 1;
        const text = response.message.replace(/ /g, ' ');
        const missing = facts.filter((fact) => !text.toLowerCase().includes(fact.toLowerCase()));
        if (missing.length === 0) factual += 1;
        else misses.push(`${entry.id}: "${entry.query}" lacks ${missing.join(', ')} — ${text.slice(0, 160)}`);
      }
      if (!hit) misses.push(`${entry.id}: "${entry.query}" → ${[...new Set(paths)].slice(0, 4).join(', ')} (want ${entry.expect.join(' | ')})`);
      // The German answers say du, never Sie.
      if (entry.locale === 'de') expect(response.message, entry.id).not.toMatch(/\b(Sie|Ihnen|Ihr|Ihre)\b(?! [a-zäöü])/);
    }
    const scores = { pointed: pointed / questions.length, factual: factual / Math.max(1, withFacts) };
    if (report) writeReport('clara', scores, misses);
    expect(scores.pointed).toBeGreaterThanOrEqual(0.86);
    expect(scores.factual).toBeGreaterThanOrEqual(0.68);
  });
});
