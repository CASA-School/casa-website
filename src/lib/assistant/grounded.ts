import { snippet, type Hit, type KnowledgeIndex } from '@/lib/knowledge/engine';
import { terms } from '@/lib/knowledge/text';

import type { AssistantQuickLink, AssistantRuntimeLocale } from './types';

/**
 * CLARA's answer from the site itself: the best FAQ answer or page section for
 * the question, quoted in a few sentences, with the pages it came from as
 * links. Nothing is invented — what the site does not say, CLARA does not say.
 */

export type Grounding = {
  /** The best match per page, in this language, best first. */
  hits: Hit[];
  /** Whether the best match answers enough of the question to quote. */
  strong: boolean;
  message?: string;
  links: AssistantQuickLink[];
};

/** Below this, a match is a stray word rather than an answer. Calibrated on the golden questions. */
const MIN_SCORE = 3.2;
const pathOf = (url: string) => url.split('#')[0];

function shorten(text: string, max: number): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  const cut = compact.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return sentenceEnd > max * 0.5 ? cut.slice(0, sentenceEnd + 1) : `${cut.replace(/\s+\S*$/, '')} …`;
}

export function groundedAnswer(
  index: KnowledgeIndex,
  question: string,
  locale: AssistantRuntimeLocale,
  { pagePath }: { pagePath?: string } = {}
): Grounding {
  const plain = [...new Set(terms(question).filter((term) => !term.startsWith('~')))];
  const raw = index.search(question, { locale, limit: 40 });

  // What kind of answer is wanted: a price question is answered by a passage with
  // an amount in it, a times question by one with times, a "when" by one with dates.
  const asked = new Set(terms(question));
  const wants = [
    asked.has('~price') && /€|\bEUR\b/,
    asked.has('~time') && /\b\d{1,2}[:.]\d{2}\b/,
    asked.has('~date') && /\b\d{1,2}\.\s?(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|\d{1,2}\.)|\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b|\b(montags|dienstags|mittwochs|donnerstags|freitags|Mondays?|Tuesdays?|Wednesdays?|Thursdays?|Fridays?)\b/,
  ].filter(Boolean) as RegExp[];

  const rescored = raw
    .map((hit) => {
      let score = hit.score;
      // The page the visitor is on answers "how do I register here?" a little better.
      if (pagePath && pathOf(hit.doc.url) === pathOf(pagePath)) score *= 1.2;
      for (const pattern of wants) if (pattern.test(hit.doc.answer ?? hit.doc.text)) score *= 1.5;
      return { ...hit, score };
    })
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const hit of rescored) {
    if (hit.doc.locale !== locale) continue;
    const key = hit.doc.type === 'faq' ? hit.doc.id : pathOf(hit.doc.url);
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(hit);
    if (hits.length === 4) break;
  }

  // The catalogue's page documents are lists of a page's short texts: good for
  // finding the page, not for quoting. CLARA quotes the best real passage near the top.
  const quotable = (hit: Hit) => !hit.doc.id.startsWith('catalog:');
  const first = hits[0];
  const top = first && !quotable(first) ? hits.find((hit) => quotable(hit) && hit.score >= first.score * 0.6) ?? first : first;
  const coverage = top && plain.length > 0 ? top.matched.length / plain.length : 0;
  const strong = Boolean(top) && top.score >= MIN_SCORE && (plain.length <= 1 ? coverage >= 1 : coverage >= 0.5);
  if (top && top !== first) {
    hits.splice(hits.indexOf(top), 1);
    hits.unshift(top);
  }

  // Only a page's list of texts matched: say which page answers it, with its best line.
  const pageOnly = Boolean(top) && !quotable(top) && top.score >= MIN_SCORE && coverage >= 0.5;
  const bestLine = (doc: Hit['doc']) =>
    doc.text
      .split(' · ')
      .map((line) => ({ line, found: terms(line).filter((term) => plain.includes(term)).length }))
      .sort((a, b) => b.found - a.found || b.line.length - a.line.length)[0]?.line;

  const message = top
    ? top.doc.answer
      ? shorten(top.doc.answer, 560)
      : pageOnly
        ? (() => {
            const line = bestLine(top.doc);
            const lead = locale === 'de' ? `Das findest du auf unserer Seite „${top.doc.page}“.` : `You will find this on our page “${top.doc.page}”.`;
            return line && line.length > 30 ? `${lead} ${locale === 'de' ? 'Dort steht' : 'It says'}: „${shorten(line, 260)}“` : lead;
          })()
        : snippet(top.doc.text, question, 440)
    : undefined;

  const linkSeen = new Set<string>();
  const links: AssistantQuickLink[] = [];
  for (const hit of hits) {
    const href = hit.doc.type === 'faq' ? '/faq' : pathOf(hit.doc.url);
    if (linkSeen.has(href)) continue;
    linkSeen.add(href);
    links.push({ href, label: hit.doc.type === 'faq' ? (locale === 'de' ? 'Häufige Fragen' : 'FAQ') : hit.doc.page });
    if (links.length === 3) break;
  }

  return { hits, strong, message, links };
}
