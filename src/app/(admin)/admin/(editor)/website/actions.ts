'use server';

import { z } from 'zod';

import { logActivity } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import {
  addComment,
  cancelRelease,
  candidateKeys,
  confirmTranslation,
  createRelease,
  currentTexts,
  decideRelease,
  describeSlots,
  discardDraft,
  heartbeat,
  leaveEditor,
  listChanges,
  listComments,
  listReleases,
  resolveComment,
  saveDraft,
  searchSlots,
  slotVersions,
  undoRelease,
  WebsiteEditError,
} from '@/lib/admin/website';
import { AiError, checkVoice, proposeChanges, shorten, translate } from '@/lib/cms/ai.server';
import { berlinLocalToDate } from '@/lib/cms/berlin-time';
import { slotFor } from '@/lib/cms/catalog';
import { forgetLiveContent } from '@/lib/cms/content.server';
import type {
  ChangeItem,
  CommentEntry,
  PresenceEntry,
  Proposal,
  ReleaseSummary,
  SearchHit,
  SlotState,
  VersionEntry,
} from '@/lib/cms/editor-types';
import { cmsLocales, SOURCE_LOCALE } from '@/lib/cms/locales';

/**
 * The website editor's actions. Each one is a public endpoint, so each asks
 * the module guard first, at the level it needs (CLAUDE.md rule 7): `view` to
 * look, `edit` to draft, comment and ask for approval, `full` to publish,
 * schedule, approve, undo and withdraw.
 */

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: unknown): { ok: false; error: string } => {
  if (error instanceof WebsiteEditError || error instanceof AiError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) return { ok: false, error: 'That request was not complete.' };
  console.error('[website editor]', error);
  return { ok: false, error: 'Something went wrong. Try again.' };
};

const Key = z.string().min(3).max(200);
const Locale = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/);
const Keys = z.array(Key).max(400);
const Items = z.array(z.object({ key: Key, locale: Locale })).min(1).max(400);

export async function describeSlotsAction(keys: unknown): Promise<Result<{ slots: SlotState[] }>> {
  await requireModule('website');
  try {
    return { ok: true, slots: await describeSlots(Keys.parse(keys)) };
  } catch (error) {
    return fail(error);
  }
}

export async function saveDraftAction(input: unknown): Promise<Result<{ slot: SlotState | null }>> {
  const user = await requireModule('website', 'edit');
  try {
    const { key, locale, value } = z.object({ key: Key, locale: Locale, value: z.string().max(4000) }).parse(input);
    await saveDraft(user, key, locale, value);
    const [slot] = await describeSlots([key]);
    return { ok: true, slot: slot ?? null };
  } catch (error) {
    return fail(error);
  }
}

export async function saveDraftsAction(input: unknown): Promise<Result<{ count: number }>> {
  const user = await requireModule('website', 'edit');
  try {
    const items = z.array(z.object({ key: Key, locale: Locale, value: z.string().min(1).max(4000) })).min(1).max(200).parse(input);
    for (const item of items) await saveDraft(user, item.key, item.locale, item.value);
    return { ok: true, count: items.length };
  } catch (error) {
    return fail(error);
  }
}

export async function discardDraftAction(input: unknown): Promise<Result<{ slot: SlotState | null }>> {
  await requireModule('website', 'edit');
  try {
    const { key, locale } = z.object({ key: Key, locale: Locale.nullable() }).parse(input);
    await discardDraft(key, locale);
    const [slot] = await describeSlots([key]);
    return { ok: true, slot: slot ?? null };
  } catch (error) {
    return fail(error);
  }
}

export async function confirmTranslationAction(input: unknown): Promise<Result<{ slot: SlotState | null }>> {
  await requireModule('website', 'edit');
  try {
    const { key, locale } = z.object({ key: Key, locale: Locale }).parse(input);
    await confirmTranslation(key, locale);
    const [slot] = await describeSlots([key]);
    return { ok: true, slot: slot ?? null };
  } catch (error) {
    return fail(error);
  }
}

export async function listChangesAction(): Promise<Result<{ changes: ChangeItem[]; releases: ReleaseSummary[] }>> {
  await requireModule('website');
  try {
    const [changes, releases] = await Promise.all([listChanges(), listReleases()]);
    return { ok: true, changes, releases };
  } catch (error) {
    return fail(error);
  }
}

const Release = z.object({
  items: Items,
  note: z.string().max(500).nullable(),
  /** Bremen wall-clock time, `YYYY-MM-DDTHH:mm`; absent publishes now. */
  at: z.string().nullable(),
});

export async function publishChangesAction(input: unknown): Promise<Result<{ count: number; releaseId: string; scheduled: boolean }>> {
  const user = await requireModule('website', 'full');
  try {
    const { items, note, at } = Release.parse(input);
    const publishAt = at ? berlinLocalToDate(at) : null;
    if (at && (!publishAt || publishAt.getTime() < Date.now() + 60_000)) {
      throw new WebsiteEditError('Choose a time in the future.');
    }
    const release = await createRelease(user, items, publishAt ? 'schedule' : 'publish', publishAt, note?.trim() || null);
    forgetLiveContent();
    await logActivity({
      actor: user,
      entity: 'website_release',
      entityId: release.id,
      action: publishAt ? 'website_scheduled' : 'website_published',
      detail: { count: release.count, ...(publishAt ? { at: publishAt.toISOString() } : {}) },
    });
    return { ok: true, count: release.count, releaseId: release.id, scheduled: Boolean(publishAt) };
  } catch (error) {
    return fail(error);
  }
}

export async function requestReviewAction(input: unknown): Promise<Result<{ count: number }>> {
  const user = await requireModule('website', 'edit');
  try {
    const { items, note } = Release.parse(input);
    const release = await createRelease(user, items, 'request', null, note?.trim() || null);
    await logActivity({
      actor: user,
      entity: 'website_release',
      entityId: release.id,
      action: 'website_review_requested',
      detail: { count: release.count },
    });
    return { ok: true, count: release.count };
  } catch (error) {
    return fail(error);
  }
}

export async function decideReleaseAction(input: unknown): Promise<Result<object>> {
  const user = await requireModule('website', 'full');
  try {
    const { id, approve } = z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(input);
    await decideRelease(user, id, approve);
    forgetLiveContent();
    await logActivity({
      actor: user,
      entity: 'website_release',
      entityId: id,
      action: approve ? 'website_approved' : 'website_rejected',
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function undoReleaseAction(input: unknown): Promise<Result<object>> {
  const user = await requireModule('website', 'full');
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(input);
    await undoRelease(user, id);
    forgetLiveContent();
    await logActivity({ actor: user, entity: 'website_release', entityId: id, action: 'website_undone' });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function cancelReleaseAction(input: unknown): Promise<Result<object>> {
  const user = await requireModule('website', 'full');
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(input);
    await cancelRelease(user, id);
    forgetLiveContent();
    await logActivity({ actor: user, entity: 'website_release', entityId: id, action: 'website_cancelled' });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function slotDetailAction(key: unknown): Promise<Result<{ versions: VersionEntry[]; comments: CommentEntry[] }>> {
  await requireModule('website');
  try {
    const slot = Key.parse(key);
    const [versions, comments] = await Promise.all([slotVersions(slot), listComments(slot)]);
    return { ok: true, versions, comments };
  } catch (error) {
    return fail(error);
  }
}

export async function addCommentAction(input: unknown): Promise<Result<{ comments: CommentEntry[] }>> {
  const user = await requireModule('website', 'edit');
  try {
    const { key, body } = z.object({ key: Key, body: z.string().trim().min(1).max(2000) }).parse(input);
    await addComment(user, key, body);
    return { ok: true, comments: await listComments(key) };
  } catch (error) {
    return fail(error);
  }
}

export async function resolveCommentAction(input: unknown): Promise<Result<{ comments: CommentEntry[] }>> {
  const user = await requireModule('website', 'edit');
  try {
    const { key, id } = z.object({ key: Key, id: z.string().uuid() }).parse(input);
    await resolveComment(user, id);
    return { ok: true, comments: await listComments(key) };
  } catch (error) {
    return fail(error);
  }
}

export async function heartbeatAction(input: unknown): Promise<Result<{ others: PresenceEntry[] }>> {
  const user = await requireModule('website');
  try {
    const { path, key } = z.object({ path: z.string().max(300).nullable(), key: Key.nullable() }).parse(input);
    return { ok: true, others: await heartbeat(user, path, key) };
  } catch (error) {
    return fail(error);
  }
}

export async function leaveEditorAction(): Promise<Result<object>> {
  const user = await requireModule('website');
  try {
    await leaveEditor(user);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function searchAction(term: unknown): Promise<Result<{ hits: SearchHit[] }>> {
  await requireModule('website');
  try {
    return { ok: true, hits: await searchSlots(z.string().max(120).parse(term)) };
  } catch (error) {
    return fail(error);
  }
}

const slotContext = (key: string) => {
  const slot = slotFor(key);
  if (!slot) throw new WebsiteEditError('This text is not editable.');
  return { label: slot.label, section: slot.section, scope: slot.scope, kind: slot.kind, max: slot.max };
};

export async function aiAssistAction(
  input: unknown
): Promise<Result<{ options: string[]; notes: string[] }>> {
  await requireModule('website', 'edit');
  try {
    const { mode, key, locale, text, source } = z
      .object({
        mode: z.enum(['shorten', 'voice', 'translate']),
        key: Key,
        locale: Locale,
        text: z.string().max(4000),
        source: z.string().max(4000).nullable(),
      })
      .parse(input);
    const slot = slotContext(key);

    if (mode === 'shorten') return { ok: true, options: await shorten({ text, locale, slot }), notes: [] };
    if (mode === 'voice') {
      const { notes, suggestion } = await checkVoice({ text, locale, slot });
      return { ok: true, options: suggestion ? [suggestion] : [], notes };
    }
    if (!source) throw new WebsiteEditError('There is no German text to translate from.');
    const translated = await translate({ source, sourceLocale: SOURCE_LOCALE, target: locale, current: text || null, slot });
    return { ok: true, options: [translated], notes: [] };
  } catch (error) {
    return fail(error);
  }
}

export async function aiChangeRequestAction(input: unknown): Promise<Result<{ proposals: Proposal[] }>> {
  await requireModule('website', 'edit');
  try {
    const { instruction, pageKeys } = z
      .object({ instruction: z.string().trim().min(4).max(1000), pageKeys: Keys })
      .parse(input);
    const locales = cmsLocales().map((locale) => locale.code);
    const keys = await candidateKeys(pageKeys, instruction);
    const texts = await currentTexts(keys, locales);
    const candidates = texts.map((text) => ({ ...text, ...slotContext(text.key) }));
    const changes = await proposeChanges({ instruction, candidates });
    const byId = new Map(texts.map((text) => [`${text.key}|${text.locale}`, text.value]));

    return {
      ok: true,
      proposals: changes.map((change) => {
        const slot = slotContext(change.key);
        return {
          key: change.key,
          locale: change.locale,
          value: change.value,
          previous: byId.get(`${change.key}|${change.locale}`) ?? '',
          label: `${slot.section} · ${slot.label}`,
          scope: slot.scope,
          reason: change.reason,
        };
      }),
    };
  } catch (error) {
    return fail(error);
  }
}
