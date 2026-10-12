import 'server-only';

import type { Hit } from '@/lib/knowledge/engine';

import type { AssistantMessage, AssistantRuntimeLocale } from './types';

/**
 * CLARA's AI mode: a language model writes the answer in plain conversation,
 * grounded only in what the deterministic layer found — the site's passages for
 * this question and the live values. It never decides a button, a link or a
 * course card; those stay the deterministic layer's. Visa, safety and login
 * answers keep their fixed wording and never come here.
 *
 * OFF unless `CLARA_AI=on` and `ANTHROPIC_API_KEY` are both set. Switching it on
 * sends the visitor's messages to the model provider, so the privacy policy's
 * section „Assistent und Suche" must say so first (docs/CLARA_AND_SEARCH.md).
 * `CLARA_AI_MODEL` picks the model; a fast one keeps answers under two seconds.
 */

const API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-5-5';
const TIMEOUT_MS = 8_000;

/** „Sie", „Ihnen", „Ihr…" capitalised in the middle of a sentence: the formal address. */
const FORMAL_ADDRESS = /(?<![.!?:]\s)(?<![.!?:]\s[„"])(?<!^)\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)\b/m;

export const claraAiEnabled = () => process.env.CLARA_AI === 'on' && Boolean(process.env.ANTHROPIC_API_KEY);

const RULES = `You are CLARA, the assistant on the website of CASA, a non-profit (gemeinnützige GmbH) German language school in Bremen, founded in 1983.

Answer ONLY from the SOURCES and FACTS given with the question. They are the website's own words and today's values. If they do not answer the question, say so in one sentence and suggest contacting the CASA team (info@casa-bremen.de, the contact form, or by phone) — never guess, never use outside knowledge about CASA, prices, dates or German law.

Rules:
- Keep every figure exactly as the sources write it: prices, dates, times, levels, names.
- Visas: the embassy decides. Never state a minimum course length or weekly load, never call a course visa-suitable.
- Never promise admission, a visa, a place, exam results or availability. No legal or medical advice. Never ask for documents or personal data.
- 2 to 4 short sentences, or a very short list. No greeting after the first turn. No links or URLs in the text: the page shows the right buttons below your answer.

Language:
- Answer in the language of the question: German or English.
- German: warm, plain, complete sentences, the way casa-bremen.de writes; "wir" for CASA; address the reader with lowercase "du" (du, dich, dir, dein) — never "Sie". Amounts as "520 €", "117,50 €".
- English: plain British English (enrol, programme, practise); "we" for CASA, "you" for the reader. Amounts as "€520".
- No marketing clichés, no superlatives.`;

export async function aiAnswer({
  messages,
  locale,
  hits,
  facts,
  draft,
}: {
  messages: AssistantMessage[];
  locale: AssistantRuntimeLocale;
  hits: Hit[];
  facts: Record<string, string>;
  /** The deterministic answer: a live value, a quoted passage. The model may rephrase it, not contradict it. */
  draft: string;
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const sources = hits
    .slice(0, 4)
    .map((hit, index) => `[${index + 1}] ${hit.doc.page}${hit.doc.heading ? ` — ${hit.doc.heading}` : ''}\n${(hit.doc.answer ?? hit.doc.text).slice(0, 1200)}`)
    .join('\n\n');
  const factLines = Object.entries(facts)
    .filter(([, value]) => value && value !== '–')
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n');

  const history = messages.slice(-8).map((message) => ({ role: message.role, content: message.content.slice(0, 1000) }));
  const last = history.pop();
  if (!last || last.role !== 'user') return null;

  const grounded = `${last.content}

---
SOURCES (the website):
${sources || '(none found)'}

FACTS (today's values on the website):
${factLines}

DRAFT (what the website answers; keep its facts):
${draft}
---
Answer in ${locale === 'de' ? 'German' : 'English'}.`;

  try {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.CLARA_AI_MODEL ?? DEFAULT_MODEL,
        max_tokens: 450,
        temperature: 0.2,
        system: RULES,
        messages: [...history, { role: 'user', content: grounded }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn('[clara-ai] no answer', response.status);
      return null;
    }
    const body = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = (body.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
      .trim();
    if (!text) return null;
    // The fixed rule again, after the fact: a German answer that says „Sie" to the
    // reader is not shown. Mid-sentence only — „Sie dauert acht Wochen" opens a sentence.
    if (locale === 'de' && FORMAL_ADDRESS.test(text)) return null;
    return text;
  } catch (error) {
    console.warn('[clara-ai] failed', error instanceof Error ? error.name : error);
    return null;
  }
}
