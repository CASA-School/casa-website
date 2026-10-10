import type { SlotKind } from './overlay';

/**
 * The shapes the website editor's screen receives. No database import here, so
 * the client components can share them (CLAUDE.md: a client component must not
 * reach src/lib/admin/db.ts).
 */

export type LocaleStatus = 'live' | 'draft' | 'upcoming' | 'stale' | 'missing';

export type LocaleState = {
  /** What the editor opens with: the draft, else a release still waiting, else the live text. */
  value: string;
  /** What the public site shows now. */
  live: string;
  /** The repository's text, when there is one for this language. */
  fallback: string | null;
  draft: { value: string; by: string | null; at: string } | null;
  upcoming: { value: string; state: 'pending' | 'scheduled'; publishAt: string | null } | null;
  stale: boolean;
  status: LocaleStatus;
};

export type SlotState = {
  key: string;
  label: string;
  section: string;
  kind: SlotKind;
  max: number;
  scope: string;
  path: string | null;
  locales: Record<string, LocaleState>;
  comments: number;
};

export type ChangeItem = {
  key: string;
  locale: string;
  value: string;
  previous: string;
  label: string;
  section: string;
  scope: string;
  /** The internal path of its page, when it belongs to one. */
  path: string | null;
  by: string | null;
  /** Languages the public site serves that still say the old thing, when this is the source text. */
  staleLocales: string[];
};

export type ReleaseState = 'pending' | 'scheduled' | 'published' | 'rejected' | 'undone' | 'cancelled';

export type ReleaseSummary = {
  id: string;
  state: ReleaseState;
  /** Published, or scheduled and its time has come. */
  live: boolean;
  note: string | null;
  publishAt: string | null;
  createdBy: string | null;
  createdAt: string;
  decidedBy: string | null;
  items: { key: string; locale: string; value: string; previous: string; label: string; scope: string }[];
};

export type VersionEntry = {
  releaseId: string;
  state: ReleaseState;
  live: boolean;
  locale: string;
  value: string;
  at: string;
  by: string | null;
};

export type CommentEntry = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type PresenceEntry = { staffId: string; name: string; initials: string; path: string | null; key: string | null };

export type SearchHit = {
  key: string;
  scope: string;
  label: string;
  section: string;
  path: string | null;
  locale: string;
  text: string;
};

export type Proposal = {
  key: string;
  locale: string;
  value: string;
  previous: string;
  label: string;
  scope: string;
  reason: string;
};

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
