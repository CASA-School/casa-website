import { notFound } from 'next/navigation';

import { issueBookingLetterAction, saveLetterStandardAction } from '../../actions';
import { LetterComposer } from '@/components/admin/letters/letter-composer';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { bookingLetterContext } from '@/lib/admin/letters/booking-context';
import { LETTER_KIND_LABELS, LETTER_STANDARD_DEFAULTS } from '@/lib/admin/letters/booking-letters';
import { lettersForBooking, standardTexts } from '@/lib/admin/letters/repo';
import type { BookingLetterKind } from '@/lib/admin/letters/types';
import { todayInputValue, toDateInputValue } from '@/lib/dates';

/**
 * A booking's letters (docs/LETTERS.md, 0032): the confirmation (`?kind=confirmation`, the default)
 * and the receipt of payments (`?kind=receipt`), written on the letter, then kept as sent.
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
  const kind: BookingLetterKind = raw === 'receipt' ? 'payment_receipt' : 'booking_confirmation';
  const ctx = await bookingLetterContext(id);
  if (!ctx) notFound();
  const { t, lang } = await getI18n();
  const [standards, letters] = await Promise.all([standardTexts(kind, LETTER_STANDARD_DEFAULTS[kind]), lettersForBooking(id)]);
  const sent = letters.filter((l) => l.kind === kind);
  const name = [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' ');

  return (
    <LetterComposer
      source={{ type: 'booking', kind, ctx }}
      standards={standards}
      today={todayInputValue()}
      version={sent.length + 1}
      me={user.id}
      defaultLanguage={ctx.language}
      canIssue={canAccess(user, 'bookings', 'edit') && (kind !== 'payment_receipt' || ctx.payments.length > 0)}
      canSetStandard={canAccess(user, 'bookings', 'full')}
      issueAction={issueBookingLetterAction}
      saveStandardAction={saveLetterStandardAction}
      hidden={{ bookingId: id, kind }}
      kinds={[
        { label: pick(lang, LETTER_KIND_LABELS.booking_confirmation), href: `/admin/bookings/${id}/letter`, active: kind === 'booking_confirmation' },
        ...(ctx.payments.length
          ? [{ label: pick(lang, LETTER_KIND_LABELS.payment_receipt), href: `/admin/bookings/${id}/letter?kind=receipt`, active: kind === 'payment_receipt' }]
          : []),
      ]}
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
