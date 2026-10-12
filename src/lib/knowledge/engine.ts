import { conceptFor, editDistance, fold, stem, terms, typoAllowance, words } from './text';

/**
 * The site's knowledge index: every page section, course, exam, FAQ answer and
 * news item as a document, ranked with BM25 over three fields. Search and CLARA
 * both ask it. It forgives what people type: umlauts left out, a typo or two, a
 * compound split or joined („Abendkurs", "abend kurs"), the other language
 * ("evening course" on the German site), half a word while typing.
 *
 * Pure and synchronous: index.server.ts decides which documents go in.
 */

export type KnowledgeLocale = 'de' | 'en';
export type DocType = 'page' | 'course' | 'exam' | 'faq' | 'news' | 'guide' | 'accommodation' | 'career';

export type KnowledgeDoc = {
  id: string;
  locale: KnowledgeLocale;
  type: DocType;
  /** Internal path (`/courses/intensive-german`), with `#anchor` for a section. */
  url: string;
  /** The page's title: „Intensivkurse". */
  page: string;
  /** The section's heading, when the document is a section of a page. */
  heading?: string;
  /** The section's plain text. */
  text: string;
  /** A FAQ entry's answer, kept whole for CLARA to quote. */
  answer?: string;
  keywords?: string[];
  /** Ranking weight; 1 when absent. Course and exam pages a little more, legal pages less. */
  boost?: number;
  badges?: string[];
  meta?: string[];
};

export type Hit = {
  doc: KnowledgeDoc;
  score: number;
  /** The question's words this document matched (stems), for coverage and snippets. */
  matched: string[];
};

export type SearchOptions = {
  locale?: KnowledgeLocale;
  types?: DocType[];
  limit?: number;
  /** The query is still being typed: its last word may be half a word. */
  prefix?: boolean;
};

type Posting = { doc: number; tf: number };

const FIELD_WEIGHT = { page: 2.2, heading: 2.6, keywords: 2, text: 1 };
const K1 = 1.2;
const B = 0.72;
/** A document in the other language still counts, at a third of its score. */
const OTHER_LANGUAGE = 0.35;

type Expansion = { term: string; weight: number; base: string };

export class KnowledgeIndex {
  readonly docs: KnowledgeDoc[];
  private readonly postings = new Map<string, Posting[]>();
  private readonly lengths: number[] = [];
  private readonly averageLength: number;
  /** Plain terms (no concepts) with how many documents use them. */
  private readonly documentFrequency = new Map<string, number>();
  /** For "did you mean": a stem's most common written form. */
  private readonly surface = new Map<string, Map<string, number>>();
  private readonly vocabulary: string[];

  constructor(docs: KnowledgeDoc[]) {
    this.docs = docs;
    docs.forEach((doc, index) => {
      const frequencies = new Map<string, number>();
      let length = 0;
      const add = (text: string | undefined, weight: number) => {
        if (!text) return;
        for (const term of terms(text)) {
          frequencies.set(term, (frequencies.get(term) ?? 0) + weight);
          length += weight;
        }
        for (const word of words(text)) {
          const key = stem(word);
          const forms = this.surface.get(key) ?? new Map<string, number>();
          forms.set(word, (forms.get(word) ?? 0) + 1);
          this.surface.set(key, forms);
        }
      };
      add(doc.page, FIELD_WEIGHT.page);
      add(doc.heading, FIELD_WEIGHT.heading);
      add(doc.keywords?.join(' '), FIELD_WEIGHT.keywords);
      add(doc.text, FIELD_WEIGHT.text);
      this.lengths.push(length);
      for (const [term, tf] of frequencies) {
        const list = this.postings.get(term) ?? [];
        list.push({ doc: index, tf });
        this.postings.set(term, list);
        if (!term.startsWith('~')) this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
      }
    });
    this.averageLength = this.lengths.reduce((sum, value) => sum + value, 0) / Math.max(1, this.lengths.length);
    this.vocabulary = [...this.documentFrequency.keys()];
  }

  get size() {
    return this.docs.length;
  }

  private idf(term: string) {
    const df = this.postings.get(term)?.length ?? 0;
    return Math.log(1 + (this.docs.length - df + 0.5) / (df + 0.5));
  }

  private has(term: string) {
    return this.documentFrequency.has(term);
  }

  /** Terms the index knows that a typed term probably means. */
  private expand(term: string, isLast: boolean, prefix: boolean): Expansion[] {
    if (term.startsWith('~')) return [{ term, weight: 0.6, base: term }];
    const out: Expansion[] = [];
    if (this.has(term)) out.push({ term, weight: 1, base: term });

    // A typo: only when the word is unknown or rare, or every query would drift.
    const allowance = typoAllowance(term);
    if (allowance > 0 && (this.documentFrequency.get(term) ?? 0) < 2 && !/\d/.test(term)) {
      const near = this.vocabulary
        .filter((candidate) => candidate !== term && Math.abs(candidate.length - term.length) <= allowance && candidate[0] === term[0])
        .map((candidate) => ({ candidate, distance: editDistance(term, candidate, allowance) }))
        .filter(({ distance }) => distance <= allowance)
        .sort((a, b) => a.distance - b.distance || (this.documentFrequency.get(b.candidate) ?? 0) - (this.documentFrequency.get(a.candidate) ?? 0))
        .slice(0, 3);
      for (const { candidate, distance } of near) {
        out.push({ term: candidate, weight: distance === 1 ? 0.75 : 0.55, base: term });
        const concept = conceptFor(candidate);
        if (concept) out.push({ term: `~${concept}`, weight: 0.5, base: term });
      }
    }

    // Half a word, while typing.
    if (prefix && isLast && term.length >= 3) {
      this.vocabulary
        .filter((candidate) => candidate.length > term.length && candidate.startsWith(term))
        .sort((a, b) => (this.documentFrequency.get(b) ?? 0) - (this.documentFrequency.get(a) ?? 0))
        .slice(0, 8)
        .forEach((candidate) => out.push({ term: candidate, weight: 0.6, base: term }));
    }

    // German compounds: "kurs" finds „Abendkurs"; „abendkurs" finds "abend" + "kurs".
    if (term.length >= 4 && !/\d/.test(term)) {
      this.vocabulary
        .filter((candidate) => candidate.length >= term.length + 3 && (candidate.endsWith(term) || candidate.startsWith(term)))
        .sort((a, b) => (this.documentFrequency.get(b) ?? 0) - (this.documentFrequency.get(a) ?? 0))
        .slice(0, 10)
        .forEach((candidate) => out.push({ term: candidate, weight: 0.45, base: term }));
      // Split a compound into two words the site uses — always when the compound
      // itself is unknown, and for long ones anyway („Prüfungsvorbereitung" is
      // also "Prüfung" + "Vorbereitung" on another page).
      if (!this.has(term) || term.length >= 10) {
        const weight = this.has(term) ? 0.5 : 0.7;
        for (let cut = term.length - 4; cut >= 4; cut -= 1) {
          const head = term.slice(0, cut);
          const rest = term.slice(cut);
          const tail = stem(rest.length > 4 && rest[0] === 's' && !this.has(stem(rest)) ? rest.slice(1) : rest);
          const headTerm = this.has(head) ? head : head.endsWith('s') && this.has(head.slice(0, -1)) ? head.slice(0, -1) : null;
          if (headTerm && this.has(tail)) {
            out.push({ term: headTerm, weight, base: term }, { term: tail, weight, base: term });
            const concepts = [conceptFor(headTerm), conceptFor(tail)].filter(Boolean);
            for (const concept of concepts) out.push({ term: `~${concept}`, weight: 0.4, base: term });
            break;
          }
        }
      }
    }
    return out;
  }

  search(query: string, options: SearchOptions = {}): Hit[] {
    const base = [...new Set(terms(query))];
    if (base.length === 0) return [];
    const plain = base.filter((term) => !term.startsWith('~'));
    const lastPlain = plain[plain.length - 1];

    const expansions = new Map<string, Expansion>();
    for (const term of base) {
      for (const expansion of this.expand(term, term === lastPlain, options.prefix ?? false)) {
        const key = `${expansion.base}|${expansion.term}`;
        const existing = expansions.get(key);
        if (!existing || existing.weight < expansion.weight) expansions.set(key, expansion);
      }
    }

    const scores = new Map<number, { score: number; matched: Set<string> }>();
    for (const { term, weight, base: from } of expansions.values()) {
      const list = this.postings.get(term);
      if (!list) continue;
      const idf = this.idf(term);
      for (const { doc, tf } of list) {
        const norm = tf + K1 * (1 - B + (B * this.lengths[doc]) / this.averageLength);
        const value = weight * idf * ((tf * (K1 + 1)) / norm);
        const entry = scores.get(doc) ?? { score: 0, matched: new Set<string>() };
        entry.score += value;
        if (!from.startsWith('~')) entry.matched.add(from);
        scores.set(doc, entry);
      }
    }

    const foldedQuery = fold(query).replace(/[^a-z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
    const hits: Hit[] = [];
    for (const [index, { score, matched }] of scores) {
      const doc = this.docs[index];
      if (options.types && !options.types.includes(doc.type)) continue;
      let value = score;
      // Documents that answer more of the question's words rank above ones that repeat one word.
      if (plain.length > 1) value *= 0.45 + 0.55 * (matched.size / plain.length);
      if (plain.length > 1 && foldedQuery.length > 6) {
        const haystack = fold(`${doc.heading ?? ''} ${doc.text}`).replace(/[^a-z0-9+ ]/g, ' ');
        if (haystack.includes(foldedQuery)) value *= 1.3;
      }
      value *= doc.boost ?? 1;
      if (options.locale && doc.locale !== options.locale) value *= OTHER_LANGUAGE;
      hits.push({ doc, score: value, matched: [...matched] });
    }
    hits.sort((a, b) => b.score - a.score);
    return options.limit ? hits.slice(0, options.limit) : hits;
  }

  /** The query with each unknown word replaced by the word the site most likely means, or null. */
  didYouMean(query: string): string | null {
    let changed = false;
    const corrected = query.split(/(\s+)/).map((part) => {
      const folded = words(part);
      if (folded.length !== 1) return part;
      const term = stem(folded[0]);
      const allowance = typoAllowance(term);
      if (this.has(term) || allowance === 0 || /\d/.test(term)) return part;
      const best = this.vocabulary
        .filter((candidate) => candidate[0] === term[0] && Math.abs(candidate.length - term.length) <= allowance)
        .map((candidate) => ({ candidate, distance: editDistance(term, candidate, allowance) }))
        .filter(({ distance }) => distance <= allowance)
        .sort((a, b) => a.distance - b.distance || (this.documentFrequency.get(b.candidate) ?? 0) - (this.documentFrequency.get(a.candidate) ?? 0))[0];
      if (!best) return part;
      const forms = this.surface.get(best.candidate);
      if (!forms) return part;
      const written = [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
      changed = true;
      return written;
    });
    return changed ? corrected.join('') : null;
  }
}

/** The sentences of `text` that answer the question best, at most `max` characters. */
export function snippet(text: string, query: string, max = 220): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  const wanted = new Set(terms(query).filter((term) => !term.startsWith('~')));
  const sentences = compact.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„"])/);
  let best = 0;
  let bestScore = -1;
  sentences.forEach((sentence, index) => {
    const found = new Set(terms(sentence).filter((term) => wanted.has(term)));
    const score = found.size * 10 - index * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  let out = sentences[best];
  for (let next = best + 1; next < sentences.length && out.length + sentences[next].length + 1 <= max; next += 1) {
    out = `${out} ${sentences[next]}`;
  }
  if (out.length > max) out = `${out.slice(0, max - 1).replace(/\s+\S*$/, '')} …`;
  return out;
}
