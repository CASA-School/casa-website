import 'server-only';

import { draftMode } from 'next/headers';
import { cache } from 'react';

import { COURSE_PAGE_COPY, type CoursePageCopyKey } from '@/config/cms/course-page-copy';
import type { ContentLocale } from '@/lib/content/types';
import { getDb, logDatabaseFallback } from '@/lib/db/server';

import { treeFields } from './catalog';
import { overlayTree } from './overlay';
import { tagText } from './stega';

/**
 * What the public site reads: each slot's live text, or the repository's.
 *
 * LIVE. The latest revision per slot whose release has gone live — `published`
 * or `scheduled` with `publish_at` in the past, so a scheduled release switches
 * itself on at its minute, with no job. Read in one query and kept for fifteen
 * seconds per process, or until the next scheduled release is due, whichever is
 * first. A publish clears this process's copy at once; another replica catches
 * up within the fifteen seconds.
 *
 * PREVIEW. In draft mode — only the editor's iframe has it — a slot shows what
 * it is about to say: its draft, else a release waiting for approval or for its
 * time, else the live text. Never cached, and every value carries its tag
 * (stega.ts) so the editor can find it on the page.
 *
 * No database, no tables yet, or a failed read: every slot is the repository's
 * text. The site as committed is always the fallback.
 */

const LIVE_TTL_MS = 15_000;

type Values = Map<string, string>;
const slotId = (key: string, locale: string) => `${key}|${locale}`;

const LIVE_SQL = `
  SELECT DISTINCT ON (r.key, r.locale) r.key, r.locale, r.value
    FROM website_revisions r
    JOIN website_releases rel ON rel.id = r.release_id
   WHERE rel.state IN ('published', 'scheduled') AND rel.publish_at <= now()
   ORDER BY r.key, r.locale, rel.publish_at DESC, rel.created_at DESC`;

const NEXT_SQL = `
  SELECT min(publish_at) AS next
    FROM website_releases
   WHERE state = 'scheduled' AND publish_at > now()`;

const UPCOMING_SQL = `
  SELECT DISTINCT ON (r.key, r.locale) r.key, r.locale, r.value
    FROM website_revisions r
    JOIN website_releases rel ON rel.id = r.release_id
   WHERE rel.state = 'pending' OR (rel.state = 'scheduled' AND rel.publish_at > now())
   ORDER BY r.key, r.locale, rel.created_at DESC`;

const DRAFTS_SQL = `SELECT key, locale, value FROM website_drafts`;

type ValueRow = { key: string; locale: string; value: string };

const store = globalThis as typeof globalThis & { casaLiveContent?: { until: number; values: Values } };

function toValues(...sets: ValueRow[][]): Values {
  const values: Values = new Map();
  for (const rows of sets) for (const row of rows) values.set(slotId(row.key, row.locale), row.value);
  return values;
}

async function liveValues(): Promise<Values> {
  const now = Date.now();
  const cached = store.casaLiveContent;
  if (cached && now < cached.until) return cached.values;

  const db = getDb();
  if (!db) return new Map();

  try {
    const [rows, [upcoming]] = await Promise.all([
      db.query<ValueRow>(LIVE_SQL),
      db.query<{ next: Date | string | null }>(NEXT_SQL),
    ]);
    const nextAt = upcoming?.next ? new Date(upcoming.next).getTime() : Number.POSITIVE_INFINITY;
    const values = toValues(rows);
    store.casaLiveContent = { values, until: Math.min(now + LIVE_TTL_MS, nextAt) };
    return values;
  } catch (error) {
    logDatabaseFallback('website content', error);
    return new Map();
  }
}

async function previewValues(): Promise<Values> {
  const db = getDb();
  if (!db) return new Map();

  try {
    const [live, upcoming, drafts] = await Promise.all([
      db.query<ValueRow>(LIVE_SQL),
      db.query<ValueRow>(UPCOMING_SQL),
      db.query<ValueRow>(DRAFTS_SQL),
    ]);
    return toValues(live, upcoming, drafts);
  } catch (error) {
    logDatabaseFallback('website content preview', error);
    return new Map();
  }
}

/** Called after a publish, an undo or a cancel, so this process shows it at once. */
export function forgetLiveContent(): void {
  store.casaLiveContent = undefined;
}

export type PageContent = {
  /** Rendering inside the website editor. */
  editing: boolean;
  /** One of the course page's shared words. */
  t: (key: CoursePageCopyKey) => string;
  /** A course's tree from config/courses/*, with its editable leaves resolved. */
  tree: <T>(slug: string, treeId: string, value: T) => T;
  /** A value that lives in another record (a date, a price): marked in the editor, never editable. */
  data: (source: string, value: string) => string;
};

export const getPageContent = cache(async (locale: ContentLocale): Promise<PageContent> => {
  const editing = (await draftMode()).isEnabled;
  const values = editing ? await previewValues() : await liveValues();

  const pick = (key: string, fallback: string) => {
    const value = values.get(slotId(key, locale)) ?? fallback;
    return editing ? tagText(value, key) : value;
  };
  const data = (source: string, value: string) => (editing ? tagText(value, `data:${source}`) : value);

  return {
    editing,
    t: (key) => pick(key, COURSE_PAGE_COPY[key][locale]),
    tree: (slug, treeId, value) =>
      overlayTree(value, `course.${slug}.${treeId}`, treeFields(treeId), (key, fallback, field) =>
        field.data ? data(field.data, fallback) : pick(key, fallback)
      ),
    data,
  };
});
