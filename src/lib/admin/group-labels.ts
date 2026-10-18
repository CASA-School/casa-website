import type { Bilingual } from './i18n';

/**
 * The groups module's words (2026-10-18, migration 0058), client-safe: a visit's state, the views of the
 * list, the bands a group is taught at.
 */

export const GROUP_STATUSES = ['open', 'confirmed', 'cancelled'] as const;
export type GroupStatus = (typeof GROUP_STATUSES)[number];
export const GROUP_STATUS_LABELS: Record<GroupStatus, Bilingual> = {
  open: { de: 'Angefragt', en: 'Requested' },
  confirmed: { de: 'Bestätigt', en: 'Confirmed' },
  cancelled: { de: 'Abgesagt', en: 'Cancelled' },
};
export const isGroupStatus = (value: unknown): value is GroupStatus => (GROUP_STATUSES as readonly unknown[]).includes(value);

/**
 * The list's views: confirmed visits still to come or under way, those asked for and not yet decided,
 * those that are over, those called off, and all.
 */
export const GROUP_VIEWS = ['upcoming', 'open', 'past', 'cancelled', 'all'] as const;
export type GroupView = (typeof GROUP_VIEWS)[number];
export const GROUP_VIEW_LABELS: Record<GroupView, Bilingual> = {
  upcoming: { de: 'Kommend', en: 'Upcoming' },
  open: { de: 'Angefragt', en: 'Requested' },
  past: { de: 'Vergangen', en: 'Past' },
  cancelled: { de: 'Abgesagt', en: 'Cancelled' },
  all: { de: 'Alle', en: 'All' },
};
export const isGroupView = (value: unknown): value is GroupView => (GROUP_VIEWS as readonly unknown[]).includes(value);

/** The bands a group is taught at, as a course's. */
export const GROUP_LEVELS = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1', 'C2'] as const;
export type GroupLevel = (typeof GROUP_LEVELS)[number];
