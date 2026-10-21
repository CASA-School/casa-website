import { notFound } from 'next/navigation';

import { PrintSheet } from '../print-sheet';
import { QrPicture } from '@/components/admin/qr-code';
import { PageHeader } from '@/components/admin/ui';
import { entryTestLink, entryTestOrigin } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { ENTRY_TESTS, isEntryTestId } from '@/lib/entry-test/tests';
import { qrPath } from '@/lib/qr';

/**
 * A course's QR code on A4, for the board or the classroom door (2026-10-20, replacing Google's posters):
 * it opens the phone page with that course's test chosen. The same for every start, so it can be printed
 * once; it carries the public site's address of the day (docs/ENTRY_TEST.md §QR codes). On paper (Rahman,
 * 2026-10-21): CASA's logo, the test and the code — no address in letters, no browser header or footer.
 * The logo is a background picture, as the code is: Chrome starts a new page before an <img> in a named page.
 */
export default async function EntryTestQrPage({ searchParams }: { searchParams: Promise<{ kurs?: string }> }) {
  const [{ kurs }] = await Promise.all([searchParams, requireModule('day')]);
  if (!isEntryTestId(kurs)) notFound();
  const { t } = await getI18n();
  const link = entryTestLink(await entryTestOrigin(), kurs);
  const test = ENTRY_TESTS[kurs];
  return (
    <>
      <PageHeader backHref="/admin/day/tests" backLabel={t('Einstufungstests', 'Placement tests')} title={t(`QR-Code ${test.title}`, `QR code ${test.title}`)} />
      <PrintSheet name={`QR-Code ${test.title}`} poster>
        <div className="py-6 text-center text-[#111827]">
          <div
            role="img"
            aria-label="CASA Internationale Sprachschule"
            className="mx-auto aspect-[1155/325] w-[84mm] max-w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/brand/casa-logo.png)' }}
          />
          <h2 className="mt-12 text-[2.1rem] leading-tight font-extrabold">{test.title}</h2>
          <p className="mt-2 text-[1.15rem] text-[#4b5563]">Kurs {test.course}</p>
          <QrPicture qr={qrPath(link)} label={link} className="mx-auto mt-12 aspect-square w-[130mm] max-w-full" />
        </div>
      </PrintSheet>
    </>
  );
}
