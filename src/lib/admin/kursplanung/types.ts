/**
 * The course-planning domain, as data.
 *
 * Vocabulary follows the planners' sheet: a SHIFT is Vormittag or Nachmittag,
 * a LEVEL is a CEFR step plus CASA's C1H, a WEEKDAY is one of the five the
 * school teaches. Dates are ISO `yyyy-mm-dd` strings throughout — the board
 * compares and groups them constantly, and a string compares without a
 * timezone.
 */

export const SHIFTS = ['morning', 'afternoon'] as const;
export type Shift = (typeof SHIFTS)[number];

export const LEVELS = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C1H'] as const;
export type Level = (typeof LEVELS)[number];

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const ABSENCE_REASONS = [
  'Urlaub',
  'Krank',
  'Fortbildung',
  'Freistellung',
  'Elternzeit',
  'Sonstiges',
] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

export type Contract = 'employed' | 'freelance';

/**
 * How a shift is taught. The morning runs five days, the afternoon four; each
 * is split into two halves that a course's two regular teachers hold (Mo–Mi /
 * Do–Fr in the morning, Mo–Di / Mi–Do in the afternoon). `half` is the index
 * of the first day of the second half.
 */
export const SHIFT_INFO: Record<
  Shift,
  { label: string; days: number; half: number; time: string; halves: [string, string] }
> = {
  morning: { label: 'Vormittag', days: 5, half: 3, time: '09:00–12:30', halves: ['Mo–Mi', 'Do–Fr'] },
  afternoon: { label: 'Nachmittag', days: 4, half: 2, time: '13:00–17:30', halves: ['Mo–Di', 'Mi–Do'] },
};

export type Teacher = {
  id: string;
  /** As written on the board: 'Claudia G'. */
  shortName: string;
  fullName: string;
  contract: Contract;
  shifts: readonly Shift[];
  daysPerWeek: number;
  weekdays: readonly Weekday[];
  levels: readonly Level[];
  note: string | null;
  filemakerStaffId: string | null;
  isActive: boolean;
};

export type CourseGroup = {
  id: string;
  /** First day of the planning month, `yyyy-mm-01`. */
  month: string;
  shift: Shift;
  level: Level;
  /** '1' starts this month, '2' is the course's second month. */
  phase: '1' | '2';
  groupIndex: number;
  registrations: number;
  teacherFirst: string | null;
  teacherSecond: string | null;
  roomId: string | null;
  filemakerCourseId: string | null;
};

export type Assignment = {
  groupId: string;
  onDate: string;
  teacherId: string;
  isSubstitute: boolean;
  isTentative: boolean;
};

export type Absence = {
  teacherId: string;
  onDate: string;
  reason: AbsenceReason;
};

export const isShift = (value: string): value is Shift => (SHIFTS as readonly string[]).includes(value);
export const isLevel = (value: string): value is Level => (LEVELS as readonly string[]).includes(value);
export const isWeekday = (value: string): value is Weekday =>
  (WEEKDAYS as readonly string[]).includes(value);
export const isAbsenceReason = (value: string): value is AbsenceReason =>
  (ABSENCE_REASONS as readonly string[]).includes(value);

/** The code of a course group as the planners say it: `A2.2 · Gruppe 1`. */
export function groupCode(group: Pick<CourseGroup, 'level' | 'phase' | 'groupIndex'>, of = 1): string {
  return `${group.level}.${group.phase}${of > 1 ? ` · Gruppe ${group.groupIndex}` : ''}`;
}
