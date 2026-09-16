import type { Teacher } from './types';

/** What the teacher dialog edits — kept apart from repo.ts so client and pure modules can import it without `pg`. */
export type TeacherRules = Pick<Teacher, 'shortName' | 'contract' | 'shifts' | 'daysPerWeek' | 'weekdays' | 'levels' | 'note'>;
