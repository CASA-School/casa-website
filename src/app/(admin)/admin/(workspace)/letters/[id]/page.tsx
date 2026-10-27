import { notFound } from 'next/navigation';

import { SentLetter } from '@/components/admin/letters/sent-letter';
import { RecordLink } from '@/components/admin/record-link';
import { canAccess } from '@/lib/admin/access';
import { queryFirst } from '@/lib/admin/db';
import { requireModule } from '@/lib/admin/guard';
import { wsLocale } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { letterModule } from '@/lib/admin/letters/module';
import { getSentLetter } from '@/lib/admin/letters/repo';
import { recordHrefFor } from '@/lib/admin/record-href';

/**
 * One letter, as it went out (docs/LETTERS.md). Seen with the right of what it is about: an offer's
 * with `offers`, a booking's and the waiting list's with `bookings`. The way back is that record.
 */
export default async function LetterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const found = await getSentLetter(id);
  if (!found) notFound();
  const user = await requireModule(letterModule(found.kind));
  const { t, lang } = await getI18n();

  let back = { href: found.personId ? `/admin/people/${found.personId}?tab=letters` : '/admin', label: t('Zur Person', 'Back to the person') };
  if (!found.personId && found.accommodationId) back = { href: `/admin/accommodation/${found.accommodationId}?tab=letters`, label: t('Zur Unterkunft', 'Back to the place') };
  if (found.bookingId) back = { href: `/admin/bookings/${found.bookingId}`, label: t('Zur Buchung', 'Back to the booking') };
  if (found.offerId) back = { href: `/admin/offers/${found.offerId}/letter?version=${found.version}`, label: t('Zum Angebot', 'Back to the offer') };
  if (found.registrationId) back = { href: `/admin/registrations/course/${found.registrationId}`, label: t('Zur Anmeldung', 'Back to the registration') };
  if (found.waitlistEntryId) {
    const entry = await queryFirst<{ course_instance_id: string | null; level_code: string | null; exam_session_id: string | null }>(
      `SELECT course_instance_id, level_code, exam_session_id FROM waitlist_entries WHERE id = $1`,
      [found.waitlistEntryId]
    );
    // Back to the queue it is in: a course start's level, or an exam sitting (0036).
    if (entry?.exam_session_id) back = { href: `/admin/catalogue/exams/${entry.exam_session_id}`, label: t('Zur Warteliste', 'Back to the waiting list') };
    else if (entry?.course_instance_id) {
      back = { href: `/admin/catalogue/${entry.course_instance_id}?level=${encodeURIComponent(entry.level_code ?? '')}`, label: t('Zur Warteliste', 'Back to the waiting list') };
    }
  }
  const when = found.sentAt.toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <SentLetter
      letter={found.letter}
      email={found.email}
      recipientName={found.recipientName}
      sentLine={
        t(`Gesendet am ${when}${found.sentByName ? ` von ${found.sentByName}` : ''}`, `Sent on ${when}${found.sentByName ? ` by ${found.sentByName}` : ''}`) +
        (found.sentVia === 'email' ? t(' · per E-Mail', ' · by email') : found.sentVia === 'print' ? t(' · gedruckt', ' · printed') : '')
      }
      back={back}
      justSent={sent === '1'}
      mailHref={canAccess(user, letterModule(found.kind), 'edit') ? `/admin/letters/mail?ids=${found.id}` : null}
      about={
        // The learner it went to, when the way back leads elsewhere (their booking, an offer).
        found.personId && back.href !== `/admin/people/${found.personId}?tab=letters` && canAccess(user, 'people') ? (
          <>
            {t('An ', 'To ')}
            <RecordLink href={recordHrefFor(user, 'person', found.personId)} tone="strong">
              {found.recipientName}
            </RecordLink>
          </>
        ) : null
      }
    />
  );
}
