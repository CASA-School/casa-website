import { notFound } from 'next/navigation';

import { PrintSittingLetters } from './print-letters';
import { getSitting } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { getSentLetter } from '@/lib/admin/letters/repo';

/**
 * The letters just sent to a sitting's candidates (0038), together: to print or save as one PDF, a
 * letter a page, and one email to all of them, the addresses hidden from each other — SchoolMan's
 * circular put every address on the letter.
 */
export default async function SittingLettersPrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ids?: string }> }) {
  const [{ id }, { ids }] = await Promise.all([params, searchParams, requireModule('bookings')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sitting = await getSitting(id);
  if (!sitting) notFound();
  const { t } = await getI18n();
  const wanted = (ids ?? '').split(',').filter((v) => /^[0-9a-f-]{36}$/i.test(v)).slice(0, 200);
  const found = (await Promise.all(wanted.map((letterId) => getSentLetter(letterId)))).filter((l) => l !== null && l.bookingId !== null);
  return (
    <PrintSittingLetters
      letters={found.map((l) => ({ letter: l!.letter, email: l!.email }))}
      back={{ href: `/admin/catalogue/exams/${id}`, label: sitting.examName }}
      title={t(`${found.length} ${found.length === 1 ? 'Brief' : 'Briefe'} gespeichert`, `${found.length} ${found.length === 1 ? 'letter' : 'letters'} saved`)}
    />
  );
}
