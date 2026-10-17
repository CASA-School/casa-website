import { notFound } from 'next/navigation';

import { issueBookingLetterAction, saveLetterStandardAction } from '../../actions';
import { LetterComposer } from '@/components/admin/letters/letter-composer';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { bookingLetterContext } from '@/lib/admin/letters/booking-context';
import {
  BOOKING_LETTER_GROUPS,
  BOOKING_LETTER_KEYS,
  bookingLetterBlock,
  EXAM_LETTER_GROUPS,
  lettersFor,
  LETTER_KIND_LABELS,
  LETTER_STANDARD_DEFAULTS,
  missingFromRecord,
} from '@/lib/admin/letters/booking-letters';
import { lettersForBooking, standardTexts } from '@/lib/admin/letters/repo';
import { BOOKING_LETTER_KINDS, type BookingLetterKind } from '@/lib/admin/letters/types';
import { todayInputValue, toDateInputValue } from '@/lib/dates';

/**
 * A booking's letters (docs/LETTERS.md, 0032, 0034): the confirmation, the receipt, a reminder, the
 * payments overview, the letter for the embassy, the show-up letters, missing details, the
 * course-start letter, the enrolment confirmation and the cancellation — `?kind=` by its short name,
 * the confirmation by default. Each is written on the letter and kept as sent; a letter its rules do
 * not allow yet shows why, and can still be read and printed.
 */
export default async function BookingLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; error?: string }>;
}) {
  const [{ id }, { kind: raw, error }, user] = await Promise.all([params, searchParams, requireModule('bookings')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await bookingLetterContext(id);
  if (!ctx) notFound();
  // An exam booking writes an exam's letters (0037); its confirmation is the exam's.
  const own = lettersFor(ctx);
  const kind: BookingLetterKind = BOOKING_LETTER_KINDS.find((k) => BOOKING_LETTER_KEYS[k] === raw && own.includes(k)) ?? own[0];
  const { t, lang } = await getI18n();
  const [standards, letters] = await Promise.all([standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]), lettersForBooking(id)]);
  const today = todayInputValue();
  const history = letters.map((l) => ({ kind: l.kind, date: toDateInputValue(l.sentAt) }));
  const sent = letters.filter((l) => l.kind === kind);
  const blocked = bookingLetterBlock(kind, ctx, { today, version: sent.length + 1, sent: history });
  const name = [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' ');
  const href = (k: BookingLetterKind) => `/admin/bookings/${id}/letter${k === own[0] ? '' : `?kind=${BOOKING_LETTER_KEYS[k]}`}`;

  return (
    <LetterComposer
      source={{ type: 'booking', kind, ctx }}
      standards={standards}
      today={today}
      version={sent.length + 1}
      me={user.id}
      defaultLanguage={ctx.language}
      canIssue={canAccess(user, 'bookings', 'edit')}
      canSetStandard={canAccess(user, 'bookings', 'full')}
      issueAction={issueBookingLetterAction}
      saveStandardAction={saveLetterStandardAction}
      hidden={{ bookingId: id, kind }}
      kindGroups={(ctx.exam ? EXAM_LETTER_GROUPS : BOOKING_LETTER_GROUPS).map((group, i) => ({
        label: pick(lang, group.label),
        items: [
          ...group.kinds.map((k) => ({
            label: pick(lang, LETTER_KIND_LABELS[k]),
            href: href(k),
            active: k === kind,
            sentCount: letters.filter((l) => l.kind === k).length,
          })),
          // This booking with the learner's others, in one confirmation.
          ...(i === 0
            ? [{ label: pick(lang, LETTER_KIND_LABELS.learner_confirmation), href: `/admin/people/${ctx.person.id}/letter?bookings=${id}`, active: false, sentCount: 0 }]
            : []),
        ],
      }))}
      history={history}
      blocked={blocked ? pick(lang, blocked) : null}
      // A confirmation of enrolment is handed over, not posted: no address unless chosen.
      initialAddress={kind === 'enrolment_certificate' ? 'none' : undefined}
      initialItems={kind === 'missing_items' ? missingFromRecord(ctx.person) : undefined}
      sent={sent.map((l) => ({
        id: l.id,
        label: l.version > 1 ? t(`Fassung ${l.version}`, `Version ${l.version}`) : pick(lang, LETTER_KIND_LABELS[kind]),
        detail: [toDateInputValue(l.sentAt).split('-').reverse().join('.'), l.sentByName].filter(Boolean).join(' · '),
      }))}
      back={{ href: `/admin/bookings/${id}`, label: t('Zur Buchung', 'Back to the booking') }}
      title={`${pick(lang, LETTER_KIND_LABELS[kind])} · ${name}`}
      error={error}
    />
  );
}
