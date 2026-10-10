import type { PoolClient } from 'pg';

import { catalog, slotFor, type CatalogSlot } from '@/lib/cms/catalog';
import { placeholders } from '@/lib/cms/copy-key';
import {
  initialsOf,
  type ChangeItem,
  type CommentEntry,
  type LocaleState,
  type PresenceEntry,
  type ReleaseState,
  type ReleaseSummary,
  type SearchHit,
  type SlotState,
  type VersionEntry,
} from '@/lib/cms/editor-types';
import { cmsLocales, SOURCE_LOCALE } from '@/lib/cms/locales';

import type { StaffUser } from './auth';
import { query, withTransaction } from './db';

/**
 * The website editor's records (db/migrations/0019_website_editor.sql).
 *
 * A slot's text in a language is, in order: the colleague's draft, a release
 * still waiting (for approval or for its time), the live revision, the
 * repository's default. Everything here works on slot keys the catalog knows;
 * an unknown key is refused rather than stored, so nothing can be written that
 * no page reads.
 */

type Row = { key: string; locale: string; value: string };

const LIVE_SQL = `
  SELECT DISTINCT ON (r.key, r.locale) r.key, r.locale, r.value
    FROM website_revisions r
    JOIN website_releases rel ON rel.id = r.release_id
   WHERE rel.state IN ('published', 'scheduled') AND rel.publish_at <= now()
     AND ($1::text[] IS NULL OR r.key = ANY($1))
   ORDER BY r.key, r.locale, rel.publish_at DESC, rel.created_at DESC`;

const id = (key: string, locale: string) => `${key}|${locale}`;
const iso = (value: Date | string | null) => (value ? new Date(value).toISOString() : null);

export class WebsiteEditError extends Error {}

function knownSlot(key: string): CatalogSlot {
  const slot = slotFor(key);
  if (!slot) throw new WebsiteEditError('This text is not editable.');
  return slot;
}

function knownLocale(locale: string): string {
  if (!cmsLocales().some((candidate) => candidate.code === locale)) throw new WebsiteEditError('Unknown language.');
  return locale;
}

async function liveMap(keys: string[] | null): Promise<Map<string, string>> {
  const rows = await query<Row>(LIVE_SQL, [keys]);
  return new Map(rows.map((row) => [id(row.key, row.locale), row.value]));
}

const liveValue = (live: Map<string, string>, slot: CatalogSlot, locale: string) =>
  live.get(id(slot.key, locale)) ?? slot.defaults[locale] ?? '';

/** Everything the editor shows about these slots, in every language it writes. */
export async function describeSlots(keys: string[]): Promise<SlotState[]> {
  const slots = [...new Set(keys)].map((key) => slotFor(key)).filter((slot): slot is CatalogSlot => Boolean(slot));
  if (slots.length === 0) return [];
  const slotKeys = slots.map((slot) => slot.key);

  const [live, drafts, upcoming, stale, comments] = await Promise.all([
    liveMap(slotKeys),
    query<Row & { updated_at: Date; name: string | null }>(
      `SELECT d.key, d.locale, d.value, d.updated_at, s.name
         FROM website_drafts d LEFT JOIN staff_users s ON s.id = d.updated_by
        WHERE d.key = ANY($1)`,
      [slotKeys]
    ),
    query<Row & { state: 'pending' | 'scheduled'; publish_at: Date | null }>(
      `SELECT DISTINCT ON (r.key, r.locale) r.key, r.locale, r.value, rel.state, rel.publish_at
         FROM website_revisions r JOIN website_releases rel ON rel.id = r.release_id
        WHERE r.key = ANY($1)
          AND (rel.state = 'pending' OR (rel.state = 'scheduled' AND rel.publish_at > now()))
        ORDER BY r.key, r.locale, rel.created_at DESC`,
      [slotKeys]
    ),
    query<{ key: string; locale: string }>(`SELECT key, locale FROM website_stale WHERE key = ANY($1)`, [slotKeys]),
    query<{ key: string; count: string }>(
      `SELECT key, count(*) FROM website_comments WHERE key = ANY($1) AND resolved_at IS NULL GROUP BY key`,
      [slotKeys]
    ),
  ]);

  const draftBy = new Map(drafts.map((row) => [id(row.key, row.locale), row]));
  const upcomingBy = new Map(upcoming.map((row) => [id(row.key, row.locale), row]));
  const staleSet = new Set(stale.map((row) => id(row.key, row.locale)));
  const commentsBy = new Map(comments.map((row) => [row.key, Number(row.count)]));
  const locales = cmsLocales();

  return slots.map((slot) => {
    const states: Record<string, LocaleState> = {};
    const sourceDraft = draftBy.get(id(slot.key, SOURCE_LOCALE));

    for (const { code } of locales) {
      const draft = draftBy.get(id(slot.key, code));
      const next = upcomingBy.get(id(slot.key, code));
      const current = liveValue(live, slot, code);
      // A translation is behind when the German moved past it: published (a
      // stale row) or drafted, while this language has no draft of its own.
      const behind =
        code !== SOURCE_LOCALE &&
        !draft &&
        Boolean(current) &&
        (staleSet.has(id(slot.key, code)) || Boolean(sourceDraft));
      const value = draft?.value ?? next?.value ?? current;
      states[code] = {
        value,
        live: current,
        fallback: slot.defaults[code] ?? null,
        draft: draft ? { value: draft.value, by: draft.name, at: iso(draft.updated_at)! } : null,
        upcoming: next ? { value: next.value, state: next.state, publishAt: iso(next.publish_at) } : null,
        stale: behind,
        status: draft ? 'draft' : next ? 'upcoming' : !value ? 'missing' : behind ? 'stale' : 'live',
      };
    }

    return {
      key: slot.key,
      label: slot.label,
      section: slot.section,
      kind: slot.kind,
      max: slot.max,
      scope: slot.scope,
      path: slot.path,
      locales: states,
      comments: commentsBy.get(slot.key) ?? 0,
    };
  });
}

/** Saves a draft; a draft that says what is live already is no change, so it is removed. */
export async function saveDraft(user: StaffUser, key: string, locale: string, value: string): Promise<void> {
  const slot = knownSlot(key);
  knownLocale(locale);
  const text = value.replace(/\s+$/u, '').replace(/^\s+/u, '');
  const live = await liveMap([key]);

  if (!text || text === liveValue(live, slot, locale)) {
    await query(`DELETE FROM website_drafts WHERE key = $1 AND locale = $2`, [key, locale]);
    return;
  }

  // A placeholder is a value the page fills in; an edit keeps every one and adds none.
  const required = placeholders(slot.defaults[locale] ?? slot.defaults[SOURCE_LOCALE] ?? '');
  if (placeholders(text).join(',') !== required.join(',')) {
    throw new WebsiteEditError(`Keep ${required.map((name) => `{${name}}`).join(' ') || 'the text without {…}'} as it is.`);
  }

  await query(
    `INSERT INTO website_drafts (key, locale, value, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, timezone('utc', now()))
     ON CONFLICT (key, locale) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`,
    [key, locale, text, user.id]
  );
}

export async function discardDraft(key: string, locale: string | null): Promise<void> {
  knownSlot(key);
  if (locale) {
    await query(`DELETE FROM website_drafts WHERE key = $1 AND locale = $2`, [key, knownLocale(locale)]);
  } else {
    await query(`DELETE FROM website_drafts WHERE key = $1`, [key]);
  }
}

/** Confirms a translation still says what the changed German says. */
export async function confirmTranslation(key: string, locale: string): Promise<void> {
  knownSlot(key);
  await query(`DELETE FROM website_stale WHERE key = $1 AND locale = $2`, [key, knownLocale(locale)]);
}

/** Every unpublished draft, with what it replaces. */
export async function listChanges(): Promise<ChangeItem[]> {
  const drafts = await query<Row & { name: string | null }>(
    `SELECT d.key, d.locale, d.value, s.name
       FROM website_drafts d LEFT JOIN staff_users s ON s.id = d.updated_by
      ORDER BY d.updated_at`
  );
  const live = await liveMap(drafts.map((row) => row.key));
  const routed = cmsLocales().filter((locale) => locale.routed && !locale.source).map((locale) => locale.code);
  const drafted = new Set(drafts.map((row) => id(row.key, row.locale)));

  return drafts.flatMap((row) => {
    const slot = slotFor(row.key);
    if (!slot) return [];
    return [
      {
        key: row.key,
        locale: row.locale,
        value: row.value,
        previous: liveValue(live, slot, row.locale),
        label: slot.label,
        section: slot.section,
        scope: slot.scope,
        path: slot.path,
        by: row.name,
        staleLocales:
          row.locale === SOURCE_LOCALE ? routed.filter((code) => !drafted.has(id(row.key, code))) : [],
      },
    ];
  });
}

/*
 * After a release goes live: a German text published without the other
 * languages leaves them behind; a language published clears its own flag.
 */
async function markTranslations(client: PoolClient, releaseId: string): Promise<void> {
  const { rows } = await client.query<{ key: string; locale: string }>(
    `SELECT key, locale FROM website_revisions WHERE release_id = $1`,
    [releaseId]
  );
  const inRelease = new Set(rows.map((row) => id(row.key, row.locale)));
  const others = cmsLocales().filter((locale) => !locale.source).map((locale) => locale.code);

  for (const row of rows) {
    if (row.locale === SOURCE_LOCALE) {
      const slot = slotFor(row.key);
      for (const code of others) {
        if (inRelease.has(id(row.key, code))) continue;
        // A language with nothing written yet is missing, not behind.
        const { rows: written } = await client.query(
          `SELECT 1 FROM website_revisions r JOIN website_releases rel ON rel.id = r.release_id
            WHERE r.key = $1 AND r.locale = $2 AND rel.state IN ('published', 'scheduled') LIMIT 1`,
          [row.key, code]
        );
        if (!slot?.defaults[code] && written.length === 0) continue;
        await client.query(
          `INSERT INTO website_stale (key, locale) VALUES ($1, $2)
           ON CONFLICT (key, locale) DO UPDATE SET since = timezone('utc', now())`,
          [row.key, code]
        );
      }
    } else {
      await client.query(`DELETE FROM website_stale WHERE key = $1 AND locale = $2`, [row.key, row.locale]);
    }
  }
}

export type ReleaseMode = 'publish' | 'schedule' | 'request';

/** Turns drafts into a release: live now, live at `publishAt`, or waiting for approval. */
export async function createRelease(
  user: StaffUser,
  items: readonly { key: string; locale: string }[],
  mode: ReleaseMode,
  publishAt: Date | null,
  note: string | null
): Promise<{ id: string; count: number }> {
  for (const item of items) {
    knownSlot(item.key);
    knownLocale(item.locale);
  }
  const keys = [...new Set(items.map((item) => item.key))];
  const live = await liveMap(keys);
  const state: ReleaseState = mode === 'publish' ? 'published' : mode === 'schedule' ? 'scheduled' : 'pending';

  return withTransaction(async (client) => {
    const { rows: drafts } = await client.query<Row>(
      `SELECT key, locale, value FROM website_drafts
        WHERE (key, locale) IN (SELECT * FROM unnest($1::text[], $2::text[]))
        FOR UPDATE`,
      [items.map((item) => item.key), items.map((item) => item.locale)]
    );
    if (drafts.length === 0) throw new WebsiteEditError('There is nothing to publish.');

    const {
      rows: [release],
    } = await client.query<{ id: string }>(
      `INSERT INTO website_releases (state, note, publish_at, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [state, note, mode === 'publish' ? new Date() : mode === 'schedule' ? publishAt : null, user.id, user.name]
    );

    for (const draft of drafts) {
      const slot = knownSlot(draft.key);
      await client.query(
        `INSERT INTO website_revisions (release_id, key, locale, value, previous) VALUES ($1, $2, $3, $4, $5)`,
        [release.id, draft.key, draft.locale, draft.value, liveValue(live, slot, draft.locale)]
      );
      await client.query(`DELETE FROM website_drafts WHERE key = $1 AND locale = $2`, [draft.key, draft.locale]);
    }

    if (state !== 'pending') await markTranslations(client, release.id);
    return { id: release.id, count: drafts.length };
  });
}

/** Puts a release's texts back into drafts, unless a newer draft is already there. */
async function returnToDrafts(client: PoolClient, releaseId: string): Promise<void> {
  // The colleague who wrote them stays their author.
  await client.query(
    `INSERT INTO website_drafts (key, locale, value, updated_by)
     SELECT r.key, r.locale, r.value, rel.created_by
       FROM website_revisions r JOIN website_releases rel ON rel.id = r.release_id
      WHERE r.release_id = $1
     ON CONFLICT (key, locale) DO NOTHING`,
    [releaseId]
  );
}

export async function decideRelease(user: StaffUser, releaseId: string, approve: boolean): Promise<void> {
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE website_releases
          SET state = $2, publish_at = CASE WHEN $2 = 'published' THEN timezone('utc', now()) ELSE publish_at END,
              decided_by = $3, decided_by_name = $4, decided_at = timezone('utc', now())
        WHERE id = $1 AND state = 'pending'`,
      [releaseId, approve ? 'published' : 'rejected', user.id, user.name]
    );
    if (!rowCount) throw new WebsiteEditError('This request was already decided.');
    if (approve) await markTranslations(client, releaseId);
    else await returnToDrafts(client, releaseId);
  });
}

/** Takes a live release back off the site; the texts before it are live again. */
export async function undoRelease(user: StaffUser, releaseId: string): Promise<void> {
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE website_releases SET state = 'undone', decided_by = $2, decided_by_name = $3, decided_at = timezone('utc', now())
        WHERE id = $1 AND state IN ('published', 'scheduled') AND publish_at <= now()`,
      [releaseId, user.id, user.name]
    );
    if (!rowCount) throw new WebsiteEditError('Only a live release can be undone.');
    // The German it published is gone again, so the translations it left behind are not behind any more.
    await client.query(
      `DELETE FROM website_stale s
        USING website_revisions r, website_releases rel
        WHERE r.release_id = $1 AND rel.id = r.release_id AND r.locale = $2
          AND s.key = r.key AND s.since >= rel.publish_at`,
      [releaseId, SOURCE_LOCALE]
    );
  });
}

/** Withdraws a release that is not live yet; its texts go back to drafts. */
export async function cancelRelease(user: StaffUser, releaseId: string): Promise<void> {
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE website_releases SET state = 'cancelled', decided_by = $2, decided_by_name = $3, decided_at = timezone('utc', now())
        WHERE id = $1 AND (state = 'pending' OR (state = 'scheduled' AND publish_at > now()))`,
      [releaseId, user.id, user.name]
    );
    if (!rowCount) throw new WebsiteEditError('This release is already live or closed.');
    await returnToDrafts(client, releaseId);
  });
}

export async function listReleases(limit = 40): Promise<ReleaseSummary[]> {
  const releases = await query<{
    id: string;
    state: ReleaseState;
    note: string | null;
    publish_at: Date | null;
    created_by_name: string | null;
    created_at: Date;
    decided_by_name: string | null;
    live: boolean;
  }>(
    `SELECT id, state, note, publish_at, created_by_name, created_at, decided_by_name,
            (state IN ('published', 'scheduled') AND publish_at <= now()) AS live
       FROM website_releases
      ORDER BY coalesce(publish_at, created_at) DESC
      LIMIT $1`,
    [limit]
  );
  if (releases.length === 0) return [];

  const items = await query<Row & { release_id: string; previous: string | null }>(
    `SELECT release_id, key, locale, value, previous FROM website_revisions WHERE release_id = ANY($1) ORDER BY key, locale`,
    [releases.map((release) => release.id)]
  );

  return releases.map((release) => ({
    id: release.id,
    state: release.state,
    live: release.live,
    note: release.note,
    publishAt: iso(release.publish_at),
    createdBy: release.created_by_name,
    createdAt: iso(release.created_at)!,
    decidedBy: release.decided_by_name,
    items: items
      .filter((item) => item.release_id === release.id)
      .map((item) => {
        const slot = slotFor(item.key);
        return {
          key: item.key,
          locale: item.locale,
          value: item.value,
          previous: item.previous ?? '',
          label: slot ? `${slot.section} · ${slot.label}` : item.key,
          scope: slot?.scope ?? '',
        };
      }),
  }));
}

/** Every published, scheduled or waiting version of one slot, newest first. */
export async function slotVersions(key: string): Promise<VersionEntry[]> {
  knownSlot(key);
  const rows = await query<{
    release_id: string;
    state: ReleaseState;
    locale: string;
    value: string;
    at: Date;
    by: string | null;
    live: boolean;
  }>(
    `SELECT rel.id AS release_id, rel.state, r.locale, r.value,
            coalesce(rel.publish_at, rel.created_at) AS at,
            coalesce(rel.decided_by_name, rel.created_by_name) AS by,
            (rel.state IN ('published', 'scheduled') AND rel.publish_at <= now()) AS live
       FROM website_revisions r JOIN website_releases rel ON rel.id = r.release_id
      WHERE r.key = $1 AND rel.state <> 'cancelled'
      ORDER BY at DESC`,
    [key]
  );
  return rows.map((row) => ({
    releaseId: row.release_id,
    state: row.state,
    live: row.live,
    locale: row.locale,
    value: row.value,
    at: iso(row.at)!,
    by: row.by,
  }));
}

export async function listComments(key: string): Promise<CommentEntry[]> {
  knownSlot(key);
  const rows = await query<{
    id: string;
    body: string;
    author_name: string;
    created_at: Date;
    resolved_at: Date | null;
    resolved_by_name: string | null;
  }>(
    `SELECT id, body, author_name, created_at, resolved_at, resolved_by_name
       FROM website_comments WHERE key = $1 ORDER BY created_at`,
    [key]
  );
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    author: row.author_name,
    createdAt: iso(row.created_at)!,
    resolvedAt: iso(row.resolved_at),
    resolvedBy: row.resolved_by_name,
  }));
}

export async function addComment(user: StaffUser, key: string, body: string): Promise<void> {
  knownSlot(key);
  await query(`INSERT INTO website_comments (key, body, author_id, author_name) VALUES ($1, $2, $3, $4)`, [
    key,
    body.trim(),
    user.id,
    user.name,
  ]);
}

export async function resolveComment(user: StaffUser, commentId: string): Promise<void> {
  await query(
    `UPDATE website_comments SET resolved_at = timezone('utc', now()), resolved_by_name = $2
      WHERE id = $1 AND resolved_at IS NULL`,
    [commentId, user.name]
  );
}

/** Records where this colleague is, and returns everyone else seen in the last minute. */
export async function heartbeat(user: StaffUser, path: string | null, key: string | null): Promise<PresenceEntry[]> {
  await query(
    `INSERT INTO website_presence (staff_id, staff_name, path, key, seen_at)
     VALUES ($1, $2, $3, $4, timezone('utc', now()))
     ON CONFLICT (staff_id) DO UPDATE SET staff_name = EXCLUDED.staff_name, path = EXCLUDED.path,
       key = EXCLUDED.key, seen_at = EXCLUDED.seen_at`,
    [user.id, user.name, path, key]
  );
  const rows = await query<{ staff_id: string; staff_name: string; path: string | null; key: string | null }>(
    `SELECT staff_id, staff_name, path, key FROM website_presence
      WHERE staff_id <> $1 AND seen_at > now() - interval '60 seconds'
      ORDER BY staff_name`,
    [user.id]
  );
  return rows.map((row) => ({
    staffId: row.staff_id,
    name: row.staff_name,
    initials: initialsOf(row.staff_name),
    path: row.path,
    key: row.key,
  }));
}

export async function leaveEditor(user: StaffUser): Promise<void> {
  await query(`DELETE FROM website_presence WHERE staff_id = $1`, [user.id]);
}

/** Texts across the editable site that contain `term`, in any language. */
export async function searchSlots(term: string, limit = 24): Promise<SearchHit[]> {
  const needle = term.trim().toLocaleLowerCase('de');
  if (needle.length < 2) return [];
  const [live, drafts] = await Promise.all([liveMap(null), query<Row>(`SELECT key, locale, value FROM website_drafts`)]);
  const draftBy = new Map(drafts.map((row) => [id(row.key, row.locale), row.value]));
  const hits: SearchHit[] = [];

  for (const slot of catalog().values()) {
    for (const { code } of cmsLocales()) {
      const text = draftBy.get(id(slot.key, code)) ?? liveValue(live, slot, code);
      if (!text.toLocaleLowerCase('de').includes(needle)) continue;
      hits.push({ key: slot.key, scope: slot.scope, label: slot.label, section: slot.section, path: slot.path, locale: code, text });
      break;
    }
    if (hits.length >= limit) break;
  }
  return hits;
}

/** The current text of these slots in these languages, for an AI change request. */
export async function currentTexts(keys: string[], locales: string[]): Promise<Row[]> {
  const [live, drafts] = await Promise.all([
    liveMap(keys),
    query<Row>(`SELECT key, locale, value FROM website_drafts WHERE key = ANY($1)`, [keys]),
  ]);
  const draftBy = new Map(drafts.map((row) => [id(row.key, row.locale), row.value]));
  return keys.flatMap((key) => {
    const slot = slotFor(key);
    if (!slot) return [];
    return locales.map((locale) => ({
      key,
      locale,
      value: draftBy.get(id(key, locale)) ?? liveValue(live, slot, locale),
    }));
  });
}

/** Candidate slots for a plain-language request: those on the page, and those that mention its words. */
export async function candidateKeys(pageKeys: string[], instruction: string, limit = 120): Promise<string[]> {
  const words = [...new Set(instruction.toLocaleLowerCase('de').match(/[\p{L}\p{N}€.,:–-]{3,}/gu) ?? [])].filter(
    (word) => !/^(the|and|und|der|die|das|for|mit|von|auf|ein|eine|page|seite|text)$/.test(word)
  );
  const keys = new Set(pageKeys.filter((key) => slotFor(key)));
  if (words.length) {
    const live = await liveMap(null);
    for (const slot of catalog().values()) {
      if (keys.size >= limit) break;
      const texts = cmsLocales().map(({ code }) => liveValue(live, slot, code).toLocaleLowerCase('de'));
      if (words.some((word) => texts.some((text) => text.includes(word)))) keys.add(slot.key);
    }
  }
  return [...keys].slice(0, limit);
}
