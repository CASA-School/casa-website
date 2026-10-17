import type { Teacher } from './types';

/** What the teacher dialog edits — kept apart from repo.ts so client and pure modules can import it without `pg`. */
/** The board's rules for a teacher; the contract is the staff page's (0039). */
export type TeacherRules = Pick<Teacher, 'shortName' | 'shifts' | 'daysPerWeek' | 'weekdays' | 'levels' | 'note'>;
