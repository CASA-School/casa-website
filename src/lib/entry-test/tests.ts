import type { Answer, EntryTestId, Task } from './types';

/**
 * The three tests and the classes that write them (Rahman, 2026-10-20): each checks the level below the
 * course it opens, and is named after the course, as the corrected booklets are („Kurs B1 · Geprüfte
 * Kenntnisse: A2"). B2 classes write none for now. Safe for the browser: no answer in here.
 */
export const ENTRY_TESTS: Record<EntryTestId, { course: 'A2' | 'B1' | 'B1+'; checks: 'A1' | 'A2' | 'B1'; title: string }> = {
  a2: { course: 'A2', checks: 'A1', title: 'Einstufungstest A2 Tag 1' },
  b1: { course: 'B1', checks: 'A2', title: 'Einstufungstest B1 Tag 1' },
  b1plus: { course: 'B1+', checks: 'B1', title: 'Einstufungstest B1+ Tag 1' },
};

export const ENTRY_TEST_IDS = Object.keys(ENTRY_TESTS) as EntryTestId[];
export const isEntryTestId = (value: unknown): value is EntryTestId => typeof value === 'string' && value in ENTRY_TESTS;

/** Minutes a sitting runs unless the office sets another time; the booklets recommend 35–40. */
export const DEFAULT_MINUTES = 40;
/** Two points per correct answer, as on the Google test and its printed teacher key (80 for 40 answers); the booklets count one. */
export const POINTS_PER_ANSWER = 2;
/** Saves that arrive this long after the deadline are still taken (a phone on a slow network). */
export const GRACE_MS = 90_000;
/** Hidden this long counts as leaving the page; a notification pulled down by accident does not. */
export const LEAVE_MS = 2_000;

/**
 * The test a class writes on its first day, by its level: the first part of a level (A2.1, B1.1, B1+.1),
 * or the bare level. A second part (A2.2) continues a class and writes none.
 */
export function entryTestFor(level: string | null | undefined): EntryTestId | null {
  const match = /^(A2|B1\+|B1)(?:\.1)?$/.exec(level?.trim() ?? '');
  if (!match) return null;
  return match[1] === 'A2' ? 'a2' : match[1] === 'B1' ? 'b1' : 'b1plus';
}

/**
 * The test for someone who joins an A2, B1 or B1+ intensive class after its first day („Heute öffnen"):
 * by the level's family, either part (A2.1, A2.2).
 */
export function entryTestForClass(level: string | null | undefined): EntryTestId | null {
  const match = /^(A2|B1\+|B1)(?:\.\d+)?$/.exec(level?.trim() ?? '');
  if (!match) return null;
  return match[1] === 'A2' ? 'a2' : match[1] === 'B1' ? 'b1' : 'b1plus';
}

/** Answer slots of a test, in order: one per multiple-choice task, one per reading statement. */
export function slotKinds(tasks: Task[]): ('mc' | 'rf')[] {
  return tasks.flatMap((task) => (task.type === 'mc' ? (['mc'] as const) : task.statements.map(() => 'rf' as const)));
}

/** What each answer slot is called on the booklet: „12" for a multiple-choice task, „17.2" for a reading statement. */
export function slotLabels(tasks: Task[]): string[] {
  return tasks.flatMap((task) => (task.type === 'mc' ? [String(task.n)] : task.statements.map((_, i) => `${task.n}.${i + 1}`)));
}

/** Answers kept only where they fit their slot; anything else is blank. Null when the length is wrong. */
export function cleanAnswers(raw: unknown, kinds: ('mc' | 'rf')[]): Answer[] | null {
  if (!Array.isArray(raw) || raw.length !== kinds.length) return null;
  return raw.map((value, i) => {
    const v = typeof value === 'string' ? value : '';
    if (kinds[i] === 'mc') return v === 'A' || v === 'B' || v === 'C' || v === 'D' ? v : '';
    return v === 'richtig' || v === 'falsch' ? v : '';
  });
}

export type Mark = 'right' | 'wrong' | 'blank';
export type Score = {
  marks: Mark[];
  total: number;
  max: number;
  /** The multiple-choice part (grammar and vocabulary). */
  grammar: number;
  grammarMax: number;
  reading: number;
  readingMax: number;
  blank: number;
};

/** Marks answers against a key: right, wrong or blank per slot; points only for right ones, no minus points. */
export function scoreAnswers(answers: readonly Answer[], key: readonly string[]): Score {
  const marks: Mark[] = key.map((solution, i) => {
    const given = answers[i] ?? '';
    return !given ? 'blank' : given.toLowerCase() === solution.toLowerCase() ? 'right' : 'wrong';
  });
  const reading = (i: number) => key[i] === 'richtig' || key[i] === 'falsch';
  const sum = (filter: (i: number) => boolean, onlyRight: boolean) =>
    marks.reduce((acc, mark, i) => acc + (filter(i) && (!onlyRight || mark === 'right') ? POINTS_PER_ANSWER : 0), 0);
  return {
    marks,
    total: sum(() => true, true),
    max: sum(() => true, false),
    grammar: sum((i) => !reading(i), true),
    grammarMax: sum((i) => !reading(i), false),
    reading: sum(reading, true),
    readingMax: sum(reading, false),
    blank: marks.filter((m) => m === 'blank').length,
  };
}
