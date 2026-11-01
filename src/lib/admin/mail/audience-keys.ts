import type { Bilingual } from '../i18n';

/**
 * A group to write to at once („Rundmail", Rahman 2026-11-01: „send all active intensive course students an
 * email … the ones doing courses monday-wednesday or tuesday-thursday … all active teachers or only the
 * Angestellte"). A group is a question, not a list: who is in it is read from the bookings and the staff
 * register each time it is opened and again when it is sent, so it is never out of date. Its key is the
 * question in a few words — `evening.tue-thu`, `teaching.employed` — and travels in the mail screen's
 * address (`/admin/mail?to=learners:evening.tue-thu`). Safe for the browser.
 */

export const COURSE_KINDS = ['intensive', 'evening', 'special', 'other'] as const;
export type CourseKind = (typeof COURSE_KINDS)[number];
export const SESSIONS = ['morning', 'afternoon', 'evening'] as const;
export type AudienceSession = (typeof SESSIONS)[number];
export const DAY_PAIRS = ['mon-wed', 'tue-thu'] as const;
export type DayPair = (typeof DAY_PAIRS)[number];
/** In a course today; starting within the next two weeks; or either. */
export const WHENS = ['now', 'soon', 'both'] as const;
export type When = (typeof WHENS)[number];

export type LearnerAudience = { kind: CourseKind | null; session: AudienceSession | null; days: DayPair | null; when: When };

export const TEAM_ROLES = ['teaching', 'office'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export const TEAM_CONTRACTS = ['employed', 'freelance'] as const;
export type TeamContract = (typeof TEAM_CONTRACTS)[number];
export type TeamAudience = { role: TeamRole | null; contract: TeamContract | null };

/** How many days ahead „beginnt bald" looks. */
export const SOON_DAYS = 14;

const has = <T extends string>(list: readonly T[], token: string): token is T => (list as readonly string[]).includes(token);

/** `evening.tue-thu.soon` → the question; anything not in the vocabulary, or twice, is no group. */
export function parseLearnerKey(key: string): LearnerAudience | null {
  const audience: LearnerAudience = { kind: null, session: null, days: null, when: 'now' };
  if (key === 'all') return audience;
  const seen = new Set<string>();
  for (const token of key.split('.')) {
    if (seen.has(token)) return null;
    seen.add(token);
    // „evening" is a course kind; the time of day is written `pm` for the evening session.
    if (has(COURSE_KINDS, token) && !audience.kind) audience.kind = token;
    else if (token === 'am') audience.session = 'morning';
    else if (token === 'noon') audience.session = 'afternoon';
    else if (token === 'pm') audience.session = 'evening';
    else if (has(DAY_PAIRS, token) && !audience.days) audience.days = token;
    else if ((token === 'soon' || token === 'both') && audience.when === 'now') audience.when = token;
    else return null;
  }
  return audience;
}

export function learnerKey(a: LearnerAudience): string {
  const session = a.session === 'morning' ? 'am' : a.session === 'afternoon' ? 'noon' : a.session === 'evening' ? 'pm' : null;
  const tokens = [a.kind, session, a.days, a.when === 'now' ? null : a.when].filter(Boolean);
  return tokens.length ? tokens.join('.') : 'all';
}

export function parseTeamKey(key: string): TeamAudience | null {
  const audience: TeamAudience = { role: null, contract: null };
  if (key === 'all') return audience;
  const tokens = key.split('.');
  if (tokens.length > 2) return null;
  for (const token of tokens) {
    if (has(TEAM_ROLES, token) && !audience.role) audience.role = token;
    else if (has(TEAM_CONTRACTS, token) && !audience.contract) audience.contract = token;
    else return null;
  }
  return audience;
}

export function teamKey(a: TeamAudience): string {
  return [a.role, a.contract].filter(Boolean).join('.') || 'all';
}

export const COURSE_KIND_NAMES: Record<CourseKind, Bilingual> = {
  intensive: { de: 'Intensivkurs', en: 'Intensive course' },
  evening: { de: 'Abendkurs', en: 'Evening course' },
  special: { de: 'Spezialkurs', en: 'Special course' },
  other: { de: 'Weitere Kurse', en: 'Other courses' },
};
const SESSION_NAMES: Record<AudienceSession, Bilingual> = {
  morning: { de: 'Vormittag', en: 'Morning' },
  afternoon: { de: 'Nachmittag', en: 'Afternoon' },
  evening: { de: 'Abend', en: 'Evening' },
};
export const DAY_PAIR_NAMES: Record<DayPair, Bilingual> = {
  'mon-wed': { de: 'Mo + Mi', en: 'Mon + Wed' },
  'tue-thu': { de: 'Di + Do', en: 'Tue + Thu' },
};

/** The group in words: „Teilnehmende · Abendkurs · Di + Do", „Team · Lehrkräfte · Angestellt". */
export function learnerAudienceName(a: LearnerAudience): Bilingual {
  const parts: Bilingual[] = [{ de: 'Teilnehmende', en: 'Students' }];
  if (a.kind) parts.push(COURSE_KIND_NAMES[a.kind]);
  if (a.session) parts.push(SESSION_NAMES[a.session]);
  if (a.days) parts.push(DAY_PAIR_NAMES[a.days]);
  if (a.when === 'soon') parts.push({ de: 'beginnen bald', en: 'starting soon' });
  if (a.when === 'both') parts.push({ de: 'mit denen, die bald beginnen', en: 'with those starting soon' });
  return { de: parts.map((p) => p.de).join(' · '), en: parts.map((p) => p.en).join(' · ') };
}

export function teamAudienceName(a: TeamAudience): Bilingual {
  const parts: Bilingual[] = [{ de: 'Team', en: 'Team' }];
  if (a.role === 'teaching') parts.push({ de: 'Lehrkräfte', en: 'Teachers' });
  if (a.role === 'office') parts.push({ de: 'Büro', en: 'Office' });
  if (a.contract === 'employed') parts.push({ de: 'Angestellte', en: 'Employed' });
  if (a.contract === 'freelance') parts.push({ de: 'Honorarkräfte', en: 'Freelance' });
  return { de: parts.map((p) => p.de).join(' · '), en: parts.map((p) => p.en).join(' · ') };
}

/** A booked period as the groups see it. */
export type LearnerFact = { personId: string; kind: CourseKind; session: AudienceSession | null; days: DayPair | null; now: boolean; soon: boolean };

/** Whether one period puts its learner in the group. */
export function periodMatches(f: LearnerFact, a: LearnerAudience): boolean {
  if (a.when === 'now' ? !f.now : a.when === 'soon' ? !f.soon : !(f.now || f.soon)) return false;
  if (a.kind && f.kind !== a.kind) return false;
  if (a.session && f.session !== a.session) return false;
  if (a.days && f.days !== a.days) return false;
  return true;
}

/** The learners in the group: anyone with a period that matches, once each. */
export function learnersIn(facts: readonly LearnerFact[], a: LearnerAudience): string[] {
  return [...new Set(facts.filter((f) => periodMatches(f, a)).map((f) => f.personId))];
}

/** A colleague as the groups see them. */
export type TeamFact = { staffId: string; teaches: boolean; contract: string | null };

export function teamMatches(f: TeamFact, a: TeamAudience): boolean {
  if (a.role === 'teaching' && !f.teaches) return false;
  if (a.role === 'office' && f.teaches) return false;
  if (a.contract && f.contract !== a.contract) return false;
  return true;
}
