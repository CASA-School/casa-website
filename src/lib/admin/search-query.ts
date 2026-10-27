/**
 * The workspace search's reading of what was typed, and the order of what it found (2026-10-27).
 *
 * Pure — no database, no `server-only` — so the server (src/lib/admin/search.ts) ranks with it and
 * the palette (src/components/admin/command-search.tsx) filters its shortcuts with the same rule, and
 * both are unit-tested (src/lib/admin/__tests__/search-query.test.ts).
 *
 * Forgiving: case and accents do not matter, nor ä/ae, ß/ss, Ş/S; words may be partial and in any
 * order; a phone number matches whatever spaces, dashes or prefix it was typed with. Ranked: an
 * exact identifier (a booking number, an address, a phone number, a SchoolMan number, a birth date)
 * first, then how well the name matches, then what is current — a learner in a course now, a course
 * that runs, an offer still open — above what is long past.
 */

/** Everything punctuation that separates words; `@ . +` stay (an address, „B1.1", „B1+"). */
const SEPARATORS = /[\s!"#$%&'()*,/:;<=>?^_`{|}~[\]\\\-–—‘’‚“”„«»·]+/gu;
const UNDECOMPOSED: Record<string, string> = { ł: 'l', ø: 'o', đ: 'd', ð: 'd', ı: 'i' };

/**
 * The comparison form of a text. The same steps, in the same order, as the database's `ws_fold`
 * (db/migrations/0091_workspace_search.sql), which folds the records' side: change one, change both.
 */
export function foldSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/þ/g, 'th')
    .replace(/[łøđðı]/g, (c) => UNDECOMPOSED[c] ?? c)
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(SEPARATORS, ' ')
    .trim();
}

/** The folded words of a text, each once, without a stray full stop at either end. */
export function searchTokens(value: string): string[] {
  const words = foldSearch(value)
    .split(' ')
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
  return [...new Set(words)].slice(0, 8);
}

export type ParsedQuery = {
  /** What was typed, trimmed. */
  text: string;
  /** Its words, folded. Every one must be found for a record to match by its text. */
  tokens: string[];
  /** A booking number written in full (`B-2026-0042`), or the start of one (`b-2026-00`). */
  booking: { exact: string | null; prefix: string | null };
  /** An offer number, `2026-042`. */
  offer: string | null;
  /** An address, lower case — typed with an @. */
  email: string | null;
  /** Digits to find inside a phone number: as typed, and without the national 0 or the international 00. */
  phone: string[];
  /** A number that may be SchoolMan's: a learner's customer number or a course number. */
  number: string | null;
  /** A date typed as one (`14.03.1998`, `1998-03-14`), as `YYYY-MM-DD`. */
  date: string | null;
};

const pad = (n: string | number, size: number) => String(n).padStart(size, '0');

function parseDate(text: string, now: Date): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(text);
  let y: number;
  let m: number;
  let d: number;
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (german) {
    [d, m, y] = [Number(german[1]), Number(german[2]), Number(german[3])];
    // Two digits: this century up to this year, the last one before it (a birth year, mostly).
    if (german[3].length === 2) y += y <= now.getFullYear() % 100 ? 2000 : 1900;
  } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m, 2)}-${pad(d, 2)}`;
}

/** What the text could be: words to find, and the identifiers it looks like. */
export function parseQuery(raw: string, now = new Date()): ParsedQuery {
  const text = raw.trim().slice(0, 80);
  const compact = text.replace(/\s+/g, ' ');

  // B-2026-0042, b 2026 42, B-26-42 — and the start of one while it is typed: b-2026-00.
  let booking: ParsedQuery['booking'] = { exact: null, prefix: null };
  const b = /^b\s*-?\s*(\d{2}|\d{4})(?:\s*[-/ ]\s*(\d{0,5}))?$/i.exec(compact);
  const bare = /^(20\d{2})\s*[-/]\s*(\d{1,5})$/.exec(compact);
  if (b) {
    const year = b[1].length === 2 ? `20${b[1]}` : b[1];
    const seq = b[2] ?? '';
    booking = { exact: seq ? `b-${year}-${pad(seq, 4)}` : null, prefix: `b-${year}-${seq}` };
  } else if (bare) {
    booking = { exact: `b-${bare[1]}-${pad(bare[2], 4)}`, prefix: null };
  }
  const offer = bare && bare[2].length <= 3 ? `${bare[1]}-${pad(bare[2], 3)}` : null;

  const email = text.includes('@') ? text.toLowerCase().replace(/\s+/g, '') : null;
  const date = parseDate(compact, now);

  const digits = text.replace(/\D/g, '');
  const phoneLike = !date && /^[\d\s+()/.-]+$/.test(text);
  // Five digits at least: fewer are in too many numbers to mean one.
  const phone: string[] = [];
  if (phoneLike && digits.length >= 5) {
    phone.push(digits);
    const local = digits.startsWith('00') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : null;
    if (local && local.length >= 5) phone.push(local);
  }
  const number = /^\d{3,7}$/.test(text) ? text : null;

  // An identifier is looked up as one, not also as words: „B-2026-0042" read as words would
  // find every learner with a „b" in their name.
  const whole = !!(booking.exact || booking.prefix || offer || email || phone.length || date);
  return { text, tokens: whole ? [] : searchTokens(text), booking, offer, email, phone, number, date };
}

/** The text is (or begins) an identifier: a number, an address, a phone number, a date. */
export const isIdentifier = (q: ParsedQuery) => !!(q.booking.exact || q.booking.prefix || q.offer || q.email || q.phone.length || q.date || q.number);

/** How a record was matched, as the query that found it reports it. */
export type IdMatch = 'exact' | 'prefix' | null;

export type Candidate = {
  /** The record's own name, folded: what the words are scored against. */
  name: string;
  /** An identifier matched — a booking number, an address, a phone number, a customer number. */
  idMatch: IdMatch;
  /** Found through a record it belongs to (a booking through its learner, an organisation through a contact). */
  via?: boolean;
  /** Current: a learner in a course or about to start one, a course that runs, an offer still open. */
  live?: boolean;
  /** The date that says how recent it is (`YYYY-MM-DD` or an ISO timestamp). */
  at?: string | null;
};

/** How well the words fit a name: whole name, every word's start, inside the name, or elsewhere. */
export function nameScore(tokens: readonly string[], name: string): number {
  if (!tokens.length) return 0;
  const folded = ` ${name} `;
  if (tokens.join(' ') === name) return 500;
  const starts = tokens.filter((w) => folded.includes(` ${w}`)).length;
  if (starts === tokens.length) {
    // Typed from the name's first word („anna sch" for Anna Schmidt) a little above „sch anna";
    // a name with fewer words left untyped a little above a longer one.
    const leads = name.startsWith(tokens[0]) ? 20 : 0;
    const untyped = Math.max(0, name.split(' ').length - tokens.length);
    return 400 + leads - Math.min(10, untyped * 2);
  }
  const inside = tokens.filter((w) => name.includes(w)).length;
  if (inside === tokens.length) return 300 + starts * 10;
  return 200 + inside * 10;
}

const DAY = 86_400_000;

/** The score that orders the hits: identifier, then name, then current and recent. */
export function scoreCandidate(tokens: readonly string[], c: Candidate, now = new Date()): number {
  let score = c.idMatch === 'exact' ? 1000 : c.idMatch === 'prefix' ? 650 : nameScore(tokens, c.name);
  if (c.via && !c.idMatch) score -= 150;
  if (c.live) score += 60;
  if (c.at) {
    const at = new Date(c.at.length === 10 ? `${c.at}T12:00:00` : c.at).getTime();
    if (!Number.isNaN(at)) {
      // Up to 40 for something from the last weeks, nothing once it is three years old.
      const age = Math.abs(now.getTime() - at) / DAY;
      score += Math.max(0, 40 - (age / (3 * 365)) * 40);
    }
  }
  return Math.round(score);
}

/** Hits of several kinds, each group's best first, the groups in the order of their best hit. */
export function rankGroups<K extends string, H extends { kind: K; score: number }>(
  hits: readonly H[],
  kindOrder: readonly K[],
  perKind = 5
): { kind: K; hits: H[] }[] {
  const byKind = new Map<K, H[]>();
  for (const hit of hits) byKind.set(hit.kind, [...(byKind.get(hit.kind) ?? []), hit]);
  const place = (k: K) => (kindOrder.indexOf(k) === -1 ? kindOrder.length : kindOrder.indexOf(k));
  return [...byKind.entries()]
    .map(([kind, list]) => ({ kind, hits: [...list].sort((a, b) => b.score - a.score).slice(0, perKind) }))
    .sort((a, b) => b.hits[0].score - a.hits[0].score || place(a.kind) - place(b.kind));
}

/** A shortcut (a page, „Neu …") matches when every word starts a word of its label or its keywords. */
export function matchesShortcut(tokens: readonly string[], label: string, keywords = ''): boolean {
  if (!tokens.length) return false;
  const words = ` ${foldSearch(`${label} ${keywords}`)}`;
  return tokens.every((w) => words.includes(` ${w}`));
}
