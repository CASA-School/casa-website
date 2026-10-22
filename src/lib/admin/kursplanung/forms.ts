import type { Bilingual } from '../i18n';

/**
 * Reading the group form (a teacher's rules are the staff page's since 2026-10-22).
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

export type GroupFormResult =
  | { ok: true; registrations: number; teacherFirst: string | null; teacherSecond: string | null; filemakerCourseId: string | null }
  | { ok: false; error: Bilingual };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseGroupForm(f: FormReader): GroupFormResult {
  const registrations = Number(f.get('registrations') ?? '0');
  if (!Number.isInteger(registrations) || registrations < 0 || registrations > 999) return { ok: false, error: { de: 'Anmeldungen: eine Zahl ab 0.', en: 'Registrations: a number from 0.' } };
  const teacher = (name: string) => { const v = (f.get(name) ?? '').trim(); if (!v) return null; return UUID.test(v) ? v : undefined; };
  const teacherFirst = teacher('teacherFirst'), teacherSecond = teacher('teacherSecond');
  if (teacherFirst === undefined || teacherSecond === undefined) return { ok: false, error: { de: 'Unbekannte Lehrkraft.', en: 'Unknown teacher.' } };
  if (teacherFirst && teacherFirst === teacherSecond) return { ok: false, error: { de: 'Zwei verschiedene Lehrkräfte, oder eine Hälfte leer lassen.', en: 'Two different teachers, or leave one half empty.' } };
  const filemakerCourseId = (f.get('filemakerCourseId') ?? '').trim().slice(0, 40) || null;
  return { ok: true, registrations, teacherFirst, teacherSecond, filemakerCourseId };
}
