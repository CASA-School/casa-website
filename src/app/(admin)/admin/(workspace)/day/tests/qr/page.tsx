import { notFound } from 'next/navigation';

import { PrintSheet } from '../print-sheet';
import { QrPicture, shortLink } from '@/components/admin/qr-code';
import { PageHeader } from '@/components/admin/ui';
import { entryTestLink } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { publicSiteAddress } from '@/lib/cms/origins';
import { ENTRY_TESTS, isEntryTestId } from '@/lib/entry-test/tests';
import { qrPath } from '@/lib/qr';

/**
 * A course's QR code on A4, for the board or the classroom door (2026-10-20, replacing Google's posters):
 * it opens the phone page with that course's test chosen. The same for every start, so it can be printed
 * once; it carries the public site's address of the day (docs/ENTRY_TEST.md §QR codes).
 */
export default async function EntryTestQrPage({ searchParams }: { searchParams: Promise<{ kurs?: string }> }) {
  const [{ kurs }] = await Promise.all([searchParams, requireModule('day')]);
  if (!isEntryTestId(kurs)) notFound();
  const { t } = await getI18n();
  const link = entryTestLink(await publicSiteAddress(), kurs);
  const test = ENTRY_TESTS[kurs];
  return (
    <>
      <PageHeader backHref="/admin/day/tests" backLabel={t('Einstufungstests', 'Placement tests')} title={t(`QR-Code ${test.title}`, `QR code ${test.title}`)} />
      <PrintSheet name={`QR-Code ${test.title}`}>
        <div className="py-6 text-center text-[#111827]">
          <p className="font-[family-name:var(--font-display)] text-[1.6rem] leading-none font-semibold tracking-[0.06em]">CASA</p>
          <h2 className="mt-8 text-[2.1rem] leading-tight font-extrabold">{test.title}</h2>
          <p className="mt-2 text-[1.15rem] text-[#4b5563]">Kurs {test.course}</p>
          <QrPicture qr={qrPath(link)} label={link} className="mx-auto mt-10 aspect-square w-[118mm] max-w-full" />
          <p className="mt-8 text-[1.5rem] font-bold tracking-[0.01em]">{shortLink(link)}</p>
        </div>
      </PrintSheet>
    </>
  );
}
