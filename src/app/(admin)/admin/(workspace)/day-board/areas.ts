import type { TaskArea } from '@/lib/admin/day-board';

/**
 * Area names, in the team's words.
 *
 * Client-safe on purpose: no database import, so a client component may read
 * these (CLAUDE.md, Conventions).
 */
export const AREA_LABELS: Record<TaskArea, string> = {
  students: 'Students',
  courses: 'Courses',
  accommodation: 'Accommodation',
  exams: 'Exams',
  finance: 'Payments',
  other: 'Anything else',
};

/**
 * The order areas appear on the board — the order of a working day, roughly:
 * who is coming, what they are booked on, where they sleep, what they sit,
 * what they owe.
 */
export const AREA_ORDER: readonly TaskArea[] = [
  'students',
  'courses',
  'accommodation',
  'exams',
  'finance',
  'other',
];
