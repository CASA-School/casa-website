import 'server-only';

import { nativeName } from './locales';

/**
 * The website editor's writing help: shorten, check the voice, translate, and
 * turn a plain-language request into proposed edits.
 *
 * Every answer is a suggestion a colleague reads and accepts; nothing here saves
 * a text. Only website copy is sent, which is public by nature, never a record
 * from the workspace. Off unless `ANTHROPIC_API_KEY` is set; `CMS_AI_MODEL`
 * picks the model. The voice rules are docs/VOICE_AND_TONE.md, condensed.
 */

const API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5-5';

export class AiError extends Error {}

export const aiEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

const englishName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};

const VOICE = `You write website copy for CASA, a non-profit (gemeinnützige GmbH) language school in Bremen, Germany, founded in 1983.

German: warm, plain, complete sentences, the way casa-bremen.de writes. "wir" speaks for CASA. Address the reader with lowercase "du" (du, dich, dir, dein) — never "Sie". Prefer Beratung and Gemeinschaft to Support and Community.
English: natural British English (practise as a verb, programme, enrol, centre, organise). Warm and plain, "we" for CASA and "you" for the reader. Headings short, in sentence case.
Other languages: natural and warm, with the informal address where the language has one.
Never: marketing clichés (journey, unlock, seamless, world-class, immerse yourself, elevate), dash asides, colon reveals, "not X but Y".
Keep every fact exactly: numbers, prices, dates, times, levels, names. Keep these names as they are: CASA, Bildungszeit, telc Deutsch B2, telc Deutsch C1 Hochschule, Netzwerk neu, Kontext, Fachsprachprüfung.
Never promise admission, a visa, a job, exam results or availability.`;

async function complete(task: string, maxTokens = 1200): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError('Writing help is not switched on.');

  let response: Response;
  try {
    response = await fetch(API, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.CMS_AI_MODEL ?? DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: VOICE,
        messages: [{ role: 'user', content: task }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AiError('The writing help did not answer. Try again.');
  }
  if (!response.ok) throw new AiError(`The writing help did not answer (${response.status}).`);

  const body = (await response.json()) as { content?: { type: string; text?: string }[] };
  return (body.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start < 0 || end < start) throw new AiError('The writing help answered in a form the editor could not read.');
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new AiError('The writing help answered in a form the editor could not read.');
  }
}

type SlotContext = { label: string; section: string; scope: string; kind: string; max: number };

const describe = (slot: SlotContext) =>
  `It is the "${slot.label}" (${slot.kind}) in the "${slot.section}" section of ${slot.scope}. At most ${slot.max} characters.`;

export async function shorten(input: { text: string; locale: string; slot: SlotContext }): Promise<string[]> {
  const answer = await complete(
    `Shorten this ${englishName(input.locale)} website text. ${describe(input.slot)}
Give three versions, each clearly under ${input.slot.max} characters, keeping every fact and the meaning. Vary how much you cut.
Answer with JSON only: {"options": ["…", "…", "…"]}

Text:
${input.text}`
  );
  const { options } = parseJson<{ options?: unknown }>(answer);
  return (Array.isArray(options) ? options : [])
    .filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    .map((option) => option.trim())
    .slice(0, 3);
}

export async function checkVoice(input: {
  text: string;
  locale: string;
  slot: SlotContext;
}): Promise<{ notes: string[]; suggestion: string | null }> {
  const answer = await complete(
    `Check this ${englishName(input.locale)} website text against CASA's voice. ${describe(input.slot)}
List at most three concrete problems in English, each one short sentence a colleague can act on (empty if it is fine). If anything should change, give one improved version that keeps every fact.
Answer with JSON only: {"notes": ["…"], "suggestion": "…" or null}

Text:
${input.text}`
  );
  const result = parseJson<{ notes?: unknown; suggestion?: unknown }>(answer);
  const notes = (Array.isArray(result.notes) ? result.notes : []).filter(
    (note): note is string => typeof note === 'string' && note.trim().length > 0
  );
  const suggestion =
    typeof result.suggestion === 'string' && result.suggestion.trim() && result.suggestion.trim() !== input.text.trim()
      ? result.suggestion.trim()
      : null;
  return { notes: notes.slice(0, 3), suggestion };
}

export async function translate(input: {
  source: string;
  sourceLocale: string;
  target: string;
  current: string | null;
  slot: SlotContext;
}): Promise<string> {
  const answer = await complete(
    `Translate this ${englishName(input.sourceLocale)} website text into ${englishName(input.target)} (${nativeName(input.target)}). ${describe(input.slot)}
Write it the way a native speaker on CASA's front desk would say it, not word for word. Keep every fact and name.
${input.current ? `The current ${englishName(input.target)} text, for its wording where it still fits:\n${input.current}\n` : ''}
Answer with JSON only: {"text": "…"}

${englishName(input.sourceLocale)} text:
${input.source}`
  );
  const { text } = parseJson<{ text?: unknown }>(answer);
  if (typeof text !== 'string' || !text.trim()) throw new AiError('The writing help returned no translation.');
  return text.trim();
}

export type ChangeCandidate = SlotContext & { key: string; locale: string; value: string };

export async function proposeChanges(input: {
  instruction: string;
  candidates: ChangeCandidate[];
}): Promise<{ key: string; locale: string; value: string; reason: string }[]> {
  const listing = input.candidates
    .map(
      (candidate) =>
        `- key: ${candidate.key} | language: ${candidate.locale} | ${candidate.scope} › ${candidate.section} › ${candidate.label} | max ${candidate.max}\n  text: ${candidate.value}`
    )
    .join('\n');

  const answer = await complete(
    `A colleague at CASA asks for this change to the website:
"${input.instruction}"

These are the editable texts that may be affected, with their current wording:
${listing}

Propose the edits that carry out the request, and only those. Change every language that says the same thing, so they stay in step. Keep each text within its maximum, keep facts the request does not change, and leave a text alone if it does not need to change. For each edit give a short reason in English.
Answer with JSON only: {"changes": [{"key": "…", "language": "…", "text": "…", "reason": "…"}]}`,
    4000
  );
  const { changes } = parseJson<{ changes?: unknown }>(answer);
  const known = new Map(input.candidates.map((candidate) => [`${candidate.key}|${candidate.locale}`, candidate]));

  return (Array.isArray(changes) ? changes : []).flatMap((change) => {
    if (!change || typeof change !== 'object') return [];
    const { key, language, text, reason } = change as Record<string, unknown>;
    if (typeof key !== 'string' || typeof language !== 'string' || typeof text !== 'string') return [];
    const candidate = known.get(`${key}|${language}`);
    if (!candidate || !text.trim() || text.trim() === candidate.value) return [];
    return [{ key, locale: language, value: text.trim(), reason: typeof reason === 'string' ? reason : '' }];
  });
}
