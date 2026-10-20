import type { Bilingual } from './i18n';

/**
 * The Tagesplan's words and choices, without the database, so the page's client parts can use them
 * (CLAUDE.md: a client component must not import a module that reaches `db.ts`).
 */

/** Where a task stands — chosen from a menu; SchoolMan's „erledigt" was typed into a text field. */
export const TASK_STATUSES = ['open', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const isTaskStatus = (value: unknown): value is TaskStatus => (TASK_STATUSES as readonly unknown[]).includes(value);

export const TASK_STATUS_LABELS: Record<TaskStatus, Bilingual> = {
  open: { de: 'Offen', en: 'Open' },
  in_progress: { de: 'In Arbeit', en: 'In progress' },
  done: { de: 'Erledigt', en: 'Done' },
};

/** The dot beside a status: grey waiting, blue being worked on, green done. */
export const TASK_STATUS_DOTS: Record<TaskStatus, string> = {
  open: 'bg-[#9aa5b5]',
  in_progress: 'bg-[#2f6fd6]',
  done: 'bg-[#1f9d55]',
};

/** The parts of a teaching day, as SchoolMan's calendar lists them. */
export const SESSIONS = ['morning', 'afternoon', 'evening'] as const;
export type Session = (typeof SESSIONS)[number];
export const SESSION_LABELS: Record<Session, Bilingual> = {
  morning: { de: 'Vormittag', en: 'Morning' },
  afternoon: { de: 'Nachmittag', en: 'Afternoon' },
  evening: { de: 'Abend', en: 'Evening' },
};

/** Where an office colleague works. */
export const DESKS = ['front', 'back'] as const;
export type Desk = (typeof DESKS)[number];
export const DESK_LABELS: Record<Desk, Bilingual> = {
  front: { de: 'Rezeption', en: 'Reception' },
  back: { de: 'Büro', en: 'Office' },
};

/** How many days one attendance sheet shows: four weeks, as SchoolMan's `DateBooking_FourWeekPresence.Dynamic`. */
export const SHEET_DAYS = 28;

/** Why a group is taught with another (0074): preset „Krankheit" when its teacher is reported sick. */
export const MERGE_REASONS = ['sick', 'holiday', 'few_learners', 'room', 'other'] as const;
export type MergeReason = (typeof MERGE_REASONS)[number];
export const isMergeReason = (value: unknown): value is MergeReason => (MERGE_REASONS as readonly unknown[]).includes(value);
export const MERGE_REASON_LABELS: Record<MergeReason, Bilingual> = {
  sick: { de: 'Krankheit', en: 'Illness' },
  holiday: { de: 'Urlaub', en: 'Holiday' },
  few_learners: { de: 'Zu wenige Teilnehmende', en: 'Too few learners' },
  room: { de: 'Raum', en: 'Room' },
  other: { de: 'Sonstiges', en: 'Other' },
};
