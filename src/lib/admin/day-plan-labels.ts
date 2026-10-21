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

/**
 * Each part of the day has its colour, across the workspace (Rahman, 2026-10-21: „green for Vormittag,
 * blue-ish for afternoon and purple-ish for Abend … a bit of an identifier"): the Tagesplan's Kurse and
 * Raumplan, Kursplanung's shifts, and a dot before a course where a list names one. It identifies, it
 * does not decorate: a dot or an edge, never a filled row. Two colours are not a session's and keep their
 * own meaning everywhere: amber is Vertretung (`COVER_COLOUR`), red a teacher who is away (`AWAY_COLOUR`).
 * docs/ADMIN_WORKSPACE.md §Design standards, the colours of the day.
 */
export const SESSION_COLOURS: Record<Session, { hex: string; dot: string; band: string; block: string }> = {
  morning: { hex: '#0f8a7a', dot: 'bg-[#0f8a7a]', band: 'bg-[#eef8f6]', block: 'border-[#0f8a7a] bg-[#e1f4f0] text-[#0b4a41]' },
  afternoon: { hex: '#2f6fd6', dot: 'bg-[#2f6fd6]', band: 'bg-[#eef5ff]', block: 'border-[#2f6fd6] bg-[#e4eefc] text-[#12305f]' },
  evening: { hex: '#6d4ed6', dot: 'bg-[#6d4ed6]', band: 'bg-[#f3f0fd]', block: 'border-[#6d4ed6] bg-[#ece7fb] text-[#2e1f63]' },
};

/** Vertretung: the teacher standing in, on the plans and in Kursplanung. */
export const COVER_COLOUR = { hex: '#d99a00', block: 'border-[#d99a00] bg-[#ffeec2] text-[#4a3500]' };
/** A teacher away with nobody standing in. */
export const AWAY_COLOUR = { hex: '#d14343', block: 'border-[#d14343] bg-[#fde3e3] text-[#7f1d1d]' };

/** A stored session, or none: courses and starts keep it as text. */
export const isSession = (value: unknown): value is Session => (SESSIONS as readonly unknown[]).includes(value);

/** The part of the day a lesson starting at „09:00" (or „09:00-12:30") is in: before 12, before 17, after. */
export function sessionAt(time: string | null | undefined): Session | null {
  const hour = Number(/^(\d{1,2})/.exec(time ?? '')?.[1]);
  if (!Number.isFinite(hour)) return null;
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

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
