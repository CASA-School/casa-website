/**
 * The rota's rules: office hours, whether reception is covered, the words for
 * an absence. No database here, so the screens' client parts may use it.
 */

export const ABSENCE_REASONS = ['leave', 'sick', 'time_off', 'training', 'unpaid', 'other'] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

/** FileMaker's codes, in words: TU leave, kr sick, AÜ time off in lieu, uU unpaid. */
export const ABSENCE_LABELS: Record<AbsenceReason, string> = {
  leave: 'On leave',
  sick: 'Sick',
  time_off: 'Time off',
  training: 'Training',
  unpaid: 'Unpaid leave',
  other: 'Away',
};

export const isAbsenceReason = (value: string): value is AbsenceReason =>
  (ABSENCE_REASONS as readonly string[]).includes(value);

export type Span = { from: string; to: string };

/**
 * CASA's office hours, as the public site states them (`footerConfig.contact.
 * officeHours`, guarded by a test): the hours reception has to be covered.
 * Monday is 1, Friday 5; the weekend is closed.
 */
export const OFFICE_HOURS: Readonly<Record<number, Span>> = {
  1: { from: '08:30', to: '19:00' },
  2: { from: '08:30', to: '19:00' },
  3: { from: '08:30', to: '19:00' },
  4: { from: '08:30', to: '19:00' },
  5: { from: '08:30', to: '13:00' },
};

/** The office hours of a day, `YYYY-MM-DD`; null on a weekend. */
export function officeHoursOn(date: string): Span | null {
  const [y, m, d] = date.split('-').map(Number);
  return OFFICE_HOURS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? null;
}

const minutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
const hm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** A gap shorter than this is a handover, not an empty desk. */
const SHORTEST_GAP = 15;

/**
 * The stretches of a day's office hours nobody at the desk covers — what
 * FileMaker left to the eye. Shifts may overlap, start early or end late; only
 * the office hours count. A closed day has no gaps.
 */
export function receptionGaps(date: string, shifts: readonly Span[]): Span[] {
  const hours = officeHoursOn(date);
  if (!hours) return [];
  const open = minutes(hours.from);
  const close = minutes(hours.to);
  const covered = shifts
    .map((s) => [Math.max(open, minutes(s.from)), Math.min(close, minutes(s.to))] as const)
    .filter(([a, b]) => a < b)
    .sort((x, y) => x[0] - y[0]);

  const gaps: Span[] = [];
  let at = open;
  for (const [a, b] of covered) {
    if (a - at >= SHORTEST_GAP) gaps.push({ from: hm(at), to: hm(a) });
    at = Math.max(at, b);
  }
  if (close - at >= SHORTEST_GAP) gaps.push({ from: hm(at), to: hm(close) });
  return gaps;
}

/** "07:00" to "20:00" in quarter hours: the times a shift may start or end. */
export const SHIFT_TIMES: readonly string[] = Array.from({ length: 53 }, (_, i) => hm(7 * 60 + i * 15));

/** `08:30:00` from Postgres, `08:30` on screen. */
export const shortTime = (time: string) => time.slice(0, 5);
