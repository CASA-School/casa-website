import { notFound } from 'next/navigation';

import { saveLetterStandardAction } from '../../../../bookings/actions';
import { issueWaitlistLetterAction } from '../../../actions';
import { LetterComposer } from '@/components/admin/letters/letter-composer';
import { canAccess } from '@/lib/admin/access';
import { query } from '@/lib/admin/db';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { waitlistLetterContext } from '@/lib/admin/letters/booking-context';
import { LETTER_KIND_LABELS, LETTER_STANDARD_DEFAULTS } from '@/lib/admin/letters/booking-letters';
import { lettersForEntries, standardTexts } from '@/lib/admin/letters/repo';
import type { WaitlistLetterKind } from '@/lib/admin/letters/types';
import { todayInputValue, toDateInputValue } from '@/lib/dates';

const KINDS: Record<string, WaitlistLetterKind> = {
  confirmation: 'waitlist_confirmation',
  place_free: 'waitlist_place_free',
  no_place: 'waitlist_no_place',
};

/**
 * A waiting-list entry's letters (docs/LETTERS.md, 0032): on the list, a place is free, no place
 * this time. Sending the second holds the place for the learner; the third takes them off the list.
 */
export default async function WaitlistLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ kind?: string; error?: string }>;
}) {
  const [{ entryId }, { kind: raw, error }, user] = await Promise.all([params, searchParams, requireModule('bookings')]);
  if (!/^[0-9a-f-]{36}$/i.test(entryId)) notFound();
  const ctx = await waitlistLetterContext(entryId);
  if (!ctx) notFound();
  // An offered place's letter is "a place is free"; otherwise the confirmation.
  const kind: WaitlistLetterKind = KINDS[raw ?? ''] ?? (ctx.status === 'offered' ? 'waitlist_place_free' : 'waitlist_confirmation');
  const { t, lang } = await getI18n();
  const [standards, letters, where] = await Promise.all([
    standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]),
    lettersForEntries([entryId]),
    query<{ course_instance_id: string | null; level_code: string | null; exam_session_id: string | null }>(
      `SELECT course_instance_id, level_code, exam_session_id FROM waitlist_entries WHERE id = $1`,
      [entryId]
    ),
  ]);
  const sent = letters.filter((l) => l.kind === kind);
  const name = [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' ');
  const open = ctx.status === 'waiting' || ctx.status === 'offered';
  // Back to the queue it is in: a course start's level, or an exam sitting (0036).
  const back = where[0]?.exam_session_id
    ? `/admin/catalogue/exams/${where[0].exam_session_id}`
    : where[0]?.course_instance_id
      ? `/admin/catalogue/${where[0].course_instance_id}?level=${encodeURIComponent(where[0].level_code ?? '')}`
      : '/admin/catalogue/waitlist';

  return (
    <LetterComposer
      source={{ type: 'waitlist', kind, ctx }}
      standards={standards}
      today={todayInputValue()}
      version={sent.length + 1}
      me={user.id}
      defaultLanguage={ctx.language}
      canIssue={canAccess(user, 'bookings', 'edit') && (open || kind === 'waitlist_confirmation')}
      canSetStandard={canAccess(user, 'bookings', 'full')}
      issueAction={issueWaitlistLetterAction}
      saveStandardAction={saveLetterStandardAction}
      hidden={{ entryId, kind }}
      kinds={Object.entries(KINDS).map(([key, k]) => ({
        label: pick(lang, LETTER_KIND_LABELS[k]),
        href: `/admin/catalogue/waitlist/${entryId}/letter?kind=${key}`,
        active: k === kind,
      }))}
      sent={sent.map((l) => ({
        id: l.id,
        label: l.version > 1 ? t(`Fassung ${l.version}`, `Version ${l.version}`) : pick(lang, LETTER_KIND_LABELS[kind]),
        detail: [toDateInputValue(l.sentAt).split('-').reverse().join('.'), l.sentByName].filter(Boolean).join(' · '),
      }))}
      back={{ href: back, label: t('Zur Warteliste', 'Back to the waiting list') }}
      title={`${pick(lang, LETTER_KIND_LABELS[kind])} · ${name}`}
      error={error}
    />
  );
}
