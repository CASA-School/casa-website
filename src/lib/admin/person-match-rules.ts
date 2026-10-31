import { foldSearch } from './search-query';

/**
 * Is the person who registered already at CASA? (2026-10-31, Rahman: „they search for the person with
 * their first and last name … if they are, they don't create a new student record".) The judgement of
 * one candidate against what was sent, field by field — pure, so the panel and the tests read the same
 * rule; `person-match.ts` finds the candidates and calls it.
 *
 * Forgiving where people really differ from their own records: accents and ä/ae, a typo in a name, first
 * and last name swapped, a double surname written in part, a nickname's start (Alex — Alexander), day and
 * month of a birth date exchanged, a phone number with or without its country code, an address with a
 * typo in its domain. Strict where families differ: the same address and surname with another first
 * name and another birthday is a brother or a sister, never „sure".
 */

export type MatchFacts = {
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD`. */
  birthDate: string | null;
  emails: readonly string[];
  phones: readonly string[];
  nationalityCode: string | null;
  /** A candidate's other names: a second surname, a nickname. */
  otherNames?: readonly (string | null)[];
};

/** A field compared: the same, nearly the same (a typo, a swap), different, or missing on one side. */
export type FieldVerdict = 'same' | 'close' | 'different' | 'unknown';

export type MatchField = 'name' | 'birthDate' | 'email' | 'phone' | 'nationality';

export type MatchReason =
  | 'email'
  | 'email_close'
  | 'phone'
  | 'birth'
  | 'birth_close'
  | 'name'
  | 'name_swapped'
  | 'name_close'
  | 'surname'
  | 'birth_differs'
  | 'first_name_differs';

/** `sure`: the same person beyond doubt; `likely`: probably; `possible`: worth a look. */
export type MatchStrength = 'sure' | 'likely' | 'possible';

export type MatchJudgement = {
  score: number;
  strength: MatchStrength | null;
  fields: Record<MatchField, FieldVerdict>;
  /** What agrees, then what speaks against it, for the chips. */
  reasons: MatchReason[];
};

const words = (value: string | null | undefined) => (value ? foldSearch(value).split(' ').filter(Boolean) : []);

/** Edits between two words (insert, delete, change, swap two neighbours), stopping above `max`. */
export function distance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = [...Array(a.length + 1)].map((_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      best = Math.min(best, rows[i][j]);
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/** A name as it sounds: Sophia — Sofia, Mayer — Meier, Carl — Karl, Schmitt — Schmidt, Anna — Ana. */
export function soundOf(word: string): string {
  return word
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ck/g, 'k')
    .replace(/c(?=[aou])/g, 'k')
    .replace(/dt\b/g, 't')
    .replace(/(?<=[a-z])d\b/g, 't')
    .replace(/[ae][iy]/g, 'ai')
    .replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

/**
 * Two name words that are one: the same; or close — the same sound, a typo (one edit in a short name, two
 * from six letters on), or one the start of the other (Alex — Alexander).
 */
function nearWord(a: string, b: string): 'same' | 'close' | null {
  if (a === b) return 'same';
  const shorter = Math.min(a.length, b.length);
  if (shorter >= 3 && (a.startsWith(b) || b.startsWith(a))) return 'close';
  if (shorter >= 3 && soundOf(a) === soundOf(b)) return 'close';
  const edits = shorter >= 6 ? 2 : 1;
  if (shorter >= 4 && distance(soundOf(a), soundOf(b), edits) <= edits) return 'close';
  return null;
}

/** How well every word of `from` is found among `among`: all the same, all at least close, or not. */
function wordsIn(from: readonly string[], among: readonly string[]): 'same' | 'close' | null {
  if (!from.length || !among.length) return null;
  let verdict: 'same' | 'close' = 'same';
  for (const word of from) {
    const found = among.map((other) => nearWord(word, other));
    if (found.includes('same')) continue;
    if (found.includes('close')) verdict = 'close';
    else return null;
  }
  return verdict;
}

function compareNames(sent: MatchFacts, record: MatchFacts): { verdict: FieldVerdict; reason: MatchReason | null; surnameOnly: boolean } {
  const first = words(sent.firstName);
  const last = words(sent.lastName);
  const theirFirst = words(record.firstName);
  const theirLast = [...words(record.lastName), ...(record.otherNames ?? []).flatMap(words)];
  if (!first.length || !last.length || !theirFirst.length) return { verdict: 'unknown', reason: null, surnameOnly: false };

  // The first name is matched on its first word (a middle name is often left out); the surname on all of them.
  const byOrder = { first: wordsIn(first.slice(0, 1), theirFirst), last: wordsIn(last, theirLast) ?? wordsIn(theirLast.slice(0, 1), last) };
  const swapped = { first: wordsIn(first.slice(0, 1), theirLast), last: wordsIn(last, theirFirst) };
  if (byOrder.first === 'same' && byOrder.last === 'same') return { verdict: 'same', reason: 'name', surnameOnly: false };
  if (swapped.first === 'same' && swapped.last === 'same') return { verdict: 'close', reason: 'name_swapped', surnameOnly: false };
  if (byOrder.first && byOrder.last) return { verdict: 'close', reason: 'name_close', surnameOnly: false };
  if (swapped.first && swapped.last) return { verdict: 'close', reason: 'name_swapped', surnameOnly: false };
  return { verdict: 'different', reason: byOrder.last === 'same' ? 'surname' : null, surnameOnly: byOrder.last === 'same' };
}

const digits = (phone: string) => {
  const plain = phone.replace(/\D/g, '');
  return plain.length >= 7 ? plain.slice(-9) : null;
};

function compareSets(sent: readonly string[], record: readonly string[], near: (a: string, b: string) => boolean): FieldVerdict {
  if (!sent.length || !record.length) return 'unknown';
  if (sent.some((a) => record.includes(a))) return 'same';
  return sent.some((a) => record.some((b) => near(a, b))) ? 'close' : 'different';
}

/** One address nearly the other: the same before the @ at another provider, the same name spelt otherwise, or one typo in all of it (gmial.com). */
const nearEmail = (a: string, b: string) => {
  const [localA, domainA] = a.split('@');
  const [localB, domainB] = b.split('@');
  if (localA.length >= 5 && localA === localB && domainA !== domainB) return true;
  // sofia.rossi@ — sophia.rossi@: the same name spelt another way, at the same provider.
  if (domainA === domainB && localA.length >= 5 && soundOf(localA) === soundOf(localB)) return true;
  return distance(a, b, 1) <= 1;
};

function compareBirth(sent: string | null, record: string | null): FieldVerdict {
  if (!sent || !record) return 'unknown';
  if (sent === record) return 'same';
  const [y1, m1, d1] = sent.split('-');
  const [y2, m2, d2] = record.split('-');
  // Day and month exchanged (03.04. for 04.03.), or one digit of it typed wrong.
  if (y1 === y2 && m1 === d2 && d1 === m2) return 'close';
  if (distance(sent.replace(/-/g, ''), record.replace(/-/g, ''), 1) <= 1) return 'close';
  return 'different';
}

/** The candidate judged against what was sent. */
export function judgeMatch(sent: MatchFacts, record: MatchFacts): MatchJudgement {
  const lower = (list: readonly string[]) => list.map((e) => e.trim().toLowerCase()).filter(Boolean);
  const name = compareNames(sent, record);
  const email = compareSets(lower(sent.emails), lower(record.emails), nearEmail);
  const sentPhones = sent.phones.map(digits).filter((p): p is string => Boolean(p));
  const recordPhones = record.phones.map(digits).filter((p): p is string => Boolean(p));
  const phone = compareSets(sentPhones, recordPhones, () => false);
  const birthDate = compareBirth(sent.birthDate, record.birthDate);
  const nationality: FieldVerdict =
    !sent.nationalityCode || !record.nationalityCode ? 'unknown' : sent.nationalityCode === record.nationalityCode ? 'same' : 'different';

  let score = 0;
  score += email === 'same' ? 40 : email === 'close' ? 15 : 0;
  score += phone === 'same' ? 30 : 0;
  score += birthDate === 'same' ? 30 : birthDate === 'close' ? 12 : birthDate === 'different' ? -15 : 0;
  score += name.verdict === 'same' ? 35 : name.verdict === 'close' ? 24 : name.surnameOnly ? 10 : 0;
  score += nationality === 'same' ? 3 : 0;

  const nameFits = name.verdict === 'same' || name.verdict === 'close';
  const contact = email === 'same' || phone === 'same';
  // Another birthday on both sides is another person, whatever else agrees: a namesake, a sibling.
  const conflict = birthDate === 'different';
  const strength: MatchStrength | null =
    nameFits && !conflict && (contact || birthDate === 'same')
      ? 'sure'
      : (nameFits && !conflict && (name.verdict === 'same' || email === 'close' || birthDate === 'close')) || (contact && birthDate === 'same')
        ? 'likely'
        : // Someone who shares nothing but a birthday, or only a nationality, is no candidate.
          nameFits || contact || email === 'close' || (name.surnameOnly && birthDate === 'same')
          ? 'possible'
          : null;

  const reasons: MatchReason[] = [];
  if (name.reason && name.reason !== 'surname') reasons.push(name.reason);
  if (email === 'same') reasons.push('email');
  else if (email === 'close') reasons.push('email_close');
  if (phone === 'same') reasons.push('phone');
  if (birthDate === 'same') reasons.push('birth');
  else if (birthDate === 'close') reasons.push('birth_close');
  if (name.surnameOnly) reasons.push('surname', 'first_name_differs');
  if (birthDate === 'different') reasons.push('birth_differs');

  return { score, strength, fields: { name: name.verdict, birthDate, email, phone, nationality }, reasons };
}

/** The order candidates are shown in: the surest first, then the score. */
export const STRENGTH_RANK: Record<MatchStrength, number> = { sure: 0, likely: 1, possible: 2 };
