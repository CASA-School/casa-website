import {
  ABSENCE_REASONS,
  LEVELS,
  SHIFTS,
  WEEKDAYS,
  isAbsenceReason,
  isLevel,
  isShift,
  isWeekday,
  type Absence,
  type Contract,
} from './types';
import type { PlanningWeek } from './weeks';
import type { TeacherRules } from './repo-types';

/**
 * Reading the teacher and group forms.
 *
 * Pure functions over a `FormData`-like reader, so the parsing that decides
 * what lands in the database is tested without a request. The server actions
 * call these and only then touch the database.
 */
export type FormReader = { get(name: string): string | null; getAll(name: string): string[] };

export const fromFormData = (fd: FormData): FormReader => ({
  get: (n) => { const v = fd.get(n); return typeof v === 'string' ? v : null; },
  getAll: (n) => fd.getAll(n).filter((v): v is string => typeof v === 'string'),
});

export type TeacherFormResult =
  | { ok: true; rules: TeacherRules; absences: Absence[] }
  | { ok: false; error: string };

export function parseTeacherForm(f: FormReader, teacherId: string, weeks: readonly PlanningWeek[]): TeacherFormResult {
  const shortName = (f.get('shortName') ?? '').trim().slice(0, 40);
  if (!shortName) return { ok: false, error: 'Der Name auf dem Brett darf nicht leer sein.' };

  const shifts = f.getAll('shifts').filter(isShift);
  if (!shifts.length) return { ok: false, error: 'Mindestens eine Schicht.' };

  const daysPerWeek = Number(f.get('daysPerWeek'));
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 5) return { ok: false, error: 'Tage pro Woche: 1 bis 5.' };

  const weekdays = WEEKDAYS.filter((d) => f.getAll('weekdays').includes(d));
  if (!weekdays.length) return { ok: false, error: 'Mindestens ein Wochentag.' };

  const levels = LEVELS.filter((l) => f.getAll('levels').includes(l));
  const contractRaw = f.get('contract') ?? 'employed';
  const contract: Contract = contractRaw === 'freelance' ? 'freelance' : 'employed';
  const note = (f.get('note') ?? '').trim().slice(0, 200) || null;

  const absences: Absence[] = [];
  for (const w of weeks) {
    const days = f.getAll(`abs_${w.start}`).filter(isWeekday);
    if (!days.length) continue;
    const reasonRaw = f.get(`reason_${w.start}`) ?? 'Urlaub';
    const reason = isAbsenceReason(reasonRaw) ? reasonRaw : ABSENCE_REASONS[0];
    for (const d of days) {
      const date = w.days[WEEKDAYS.indexOf(d)];
      if (date) absences.push({ teacherId, onDate: date, reason });
    }
  }

  return { ok: true, rules: { shortName, contract, shifts, daysPerWeek, weekdays, levels, note }, absences };
}

export type GroupFormResult =
  | { ok: true; registrations: number; teacherFirst: string | null; teacherSecond: string | null; filemakerCourseId: string | null }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseGroupForm(f: FormReader): GroupFormResult {
  const registrations = Number(f.get('registrations') ?? '0');
  if (!Number.isInteger(registrations) || registrations < 0 || registrations > 999) return { ok: false, error: 'Anmeldungen: eine Zahl ab 0.' };
  const teacher = (name: string) => { const v = (f.get(name) ?? '').trim(); if (!v) return null; return UUID.test(v) ? v : undefined; };
  const teacherFirst = teacher('teacherFirst'), teacherSecond = teacher('teacherSecond');
  if (teacherFirst === undefined || teacherSecond === undefined) return { ok: false, error: 'Unbekannte Lehrkraft.' };
  if (teacherFirst && teacherFirst === teacherSecond) return { ok: false, error: 'Zwei verschiedene Lehrkräfte, oder eine Hälfte leer lassen.' };
  const filemakerCourseId = (f.get('filemakerCourseId') ?? '').trim().slice(0, 40) || null;
  return { ok: true, registrations, teacherFirst, teacherSecond, filemakerCourseId };
}

export { SHIFTS, LEVELS, WEEKDAYS, ABSENCE_REASONS, isLevel };
