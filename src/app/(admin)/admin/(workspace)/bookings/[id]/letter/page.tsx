import { notFound } from 'next/navigation';

import { issueBookingLetterAction, saveLetterStandardAction } from '../../actions';
import { LetterComposer } from '@/components/admin/letters/letter-composer';
import { sentDay } from '@/components/admin/letters/letter-kind';
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
import { bookingKindStates, suggestBookingLetters } from '@/lib/admin/letters/suggest';
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
  const [ctx, letters] = await Promise.all([bookingLetterContext(id), lettersForBooking(id)]);
  if (!ctx) notFound();
  const today = todayInputValue();
  const history = letters.map((l) => ({ kind: l.kind, date: toDateInputValue(l.sentAt) }));
  // An exam booking writes an exam's letters (0037). Without a kind asked for, the letter due now opens.
  const own = lettersFor(ctx);
  const states = bookingKindStates(own, ctx, today, history);
  // The most urgent, not the first in the list.
  const dueOrder = suggestBookingLetters(ctx, today, history);
  const due = dueOrder[0];
  const kind: BookingLetterKind = BOOKING_LETTER_KINDS.find((k) => BOOKING_LETTER_KEYS[k] === raw && own.includes(k)) ?? due ?? own[0];
  const { t, lang } = await getI18n();
  const standards = await standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]);
  const sent = letters.filter((l) => l.kind === kind);
  const blocked = bookingLetterBlock(kind, ctx, { today, version: sent.length + 1, sent: history });
  const name = [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' ');
  const href = (k: BookingLetterKind) => `/admin/bookings/${id}/letter?kind=${BOOKING_LETTER_KEYS[k]}`;

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
          ...group.kinds.map((k) => {
            const state = states.get(k)!;
            return {
              kind: k,
              label: pick(lang, LETTER_KIND_LABELS[k]),
              href: href(k),
              active: k === kind,
              sentOn: state.lastSent ? sentDay(state.lastSent, lang) : null,
              count: state.count,
              blocked: state.blocked ? pick(lang, state.blocked) : null,
              suggested: state.suggested,
              rank: dueOrder.indexOf(k),
            };
          }),
          // This booking with the learner's others, in one confirmation.
          ...(i === 0
            ? [
                {
                  kind: 'learner_confirmation' as const,
                  label: pick(lang, LETTER_KIND_LABELS.learner_confirmation),
                  href: `/admin/people/${ctx.person.id}/letter?bookings=${id}`,
                  active: false,
                  sentOn: null,
                  count: 0,
                  blocked: null,
                  suggested: false,
                },
              ]
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
      title={pick(lang, LETTER_KIND_LABELS[kind])}
      subtitle={`${name} · ${ctx.number}`}
      error={error}
    />
  );
}
