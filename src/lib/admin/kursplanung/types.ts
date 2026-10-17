import type { Bilingual } from '../i18n';

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

/** A weekday as the board writes it. The code (`Mo`) is the stored value; this is only its label. */
export const WEEKDAY_LABELS: Record<Weekday, Bilingual> = {
  Mo: { de: 'Mo', en: 'Mon' },
  Di: { de: 'Di', en: 'Tue' },
  Mi: { de: 'Mi', en: 'Wed' },
  Do: { de: 'Do', en: 'Thu' },
  Fr: { de: 'Fr', en: 'Fri' },
};

export const ABSENCE_REASONS = [
  'Urlaub',
  'Krank',
  'Fortbildung',
  'Freistellung',
  'Elternzeit',
  'Sonstiges',
] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

/** A reason's label. The German word is the stored value; this is what the screens show. */
export const ABSENCE_LABELS: Record<AbsenceReason, Bilingual> = {
  Urlaub: { de: 'Urlaub', en: 'Holiday' },
  Krank: { de: 'Krank', en: 'Sick' },
  Fortbildung: { de: 'Fortbildung', en: 'Training' },
  Freistellung: { de: 'Freistellung', en: 'Released from duty' },
  Elternzeit: { de: 'Elternzeit', en: 'Parental leave' },
  Sonstiges: { de: 'Sonstiges', en: 'Other' },
};

export type Contract = 'employed' | 'freelance';

/**
 * How a shift is taught. The morning runs five days, the afternoon four; each
 * is split into two halves that a course's two regular teachers hold (Mo–Mi /
 * Do–Fr in the morning, Mo–Di / Mi–Do in the afternoon). `half` is the index
 * of the first day of the second half.
 */
export const SHIFT_INFO: Record<
  Shift,
  { label: Bilingual; days: number; half: number; time: string; halves: [Bilingual, Bilingual] }
> = {
  morning: {
    label: { de: 'Vormittag', en: 'Morning' },
    days: 5,
    half: 3,
    time: '09:00–12:30',
    halves: [{ de: 'Mo–Mi', en: 'Mon–Wed' }, { de: 'Do–Fr', en: 'Thu–Fri' }],
  },
  afternoon: {
    label: { de: 'Nachmittag', en: 'Afternoon' },
    days: 4,
    half: 2,
    time: '13:00–17:30',
    halves: [{ de: 'Mo–Di', en: 'Mon–Tue' }, { de: 'Mi–Do', en: 'Wed–Thu' }],
  },
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
  /** Its learners: live from its course when it has one (`live`), else the number typed on the Kurse screen. */
  registrations: number;
  /** Whether `registrations` is its course's learners, read (2026-10-17, Rahman: live counts on the board). */
  live: boolean;
  /** The number typed on the Kurse screen, kept for a group of no course. */
  typedRegistrations: number;
  teacherFirst: string | null;
  teacherSecond: string | null;
  roomId: string | null;
  filemakerCourseId: string | null;
  /**
   * The first and last day of the group's course (`course_id`, 0045), `yyyy-mm-dd`: a planning month
   * opens on the Monday of the week the 1st falls in, which can lie before a start's first day or after
   * the previous start's last. Null for a group of no course: every day of its month is open.
   */
  courseStart?: string | null;
  courseEnd?: string | null;
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
