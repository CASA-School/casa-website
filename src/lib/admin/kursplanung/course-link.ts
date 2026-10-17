import { isLevel, type Level } from './types';
import { addDays, nextMonth } from './weeks';

/**
 * How a course start and Kursplanung name the same class (2026-10-17; docs/KURSPLANUNG.md §Course starts).
 *
 * A start's level group is a Kursplanung group: `B1.1` at the intensive start of 31 August is the B1
 * group of phase 1 in the planning month September, and the same group, with its pair, is B1 phase 2
 * in October. A learner joining at `B1.2` on a start sits in that month's phase-2 group, the previous
 * start's class continued. The shift is the board's: a month's new `.1` courses all run in one shift.
 * Pure; the server side is `link.ts`.
 */

/**
 * The planning month a course start opens: the calendar month two weeks after its first day. A start
 * lies within a week of the month's planning start (31 Aug → September, 26 Oct → November, 4 Jan → January).
 */
export function planMonthOfStart(startDate: string): string {
  return addDays(startDate.slice(0, 10), 14).slice(0, 7);
}

/** `B1+.2` → B1+, phase 2; a level without a half (`B1+`) is a course start's phase 1. */
export function levelPlace(code: string): { level: Level; phase: '1' | '2' } | null {
  const match = /^(.+?)(?:\.([12]))?$/.exec(code);
  if (!match || !isLevel(match[1])) return null;
  return { level: match[1], phase: match[2] === '2' ? '2' : '1' };
}

/** The workspace's level code for a Kursplanung group: B1 phase 1 → `B1.1`. C1H has no code of its own. */
export function levelCodeOf(level: Level, phase: '1' | '2'): string | null {
  return level === 'C1H' ? null : `${level}.${phase}`;
}

/** The planning months a start's phase-1 group runs in: its own, and the next as phase 2. */
export function startMonths(startDate: string): { first: string; second: string } {
  const first = planMonthOfStart(startDate);
  return { first, second: nextMonth(first) };
}
