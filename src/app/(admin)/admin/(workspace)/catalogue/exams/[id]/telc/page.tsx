import { notFound } from 'next/navigation';

import { CopyButton } from './copy-button';
import { Card, RecordHeader } from '@/components/admin/ui';
import { EXAM_PARTS_LABELS } from '@/lib/admin/exam-parts';
import { getSitting, telcList } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { pick, wsLocale } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * A sitting's candidates as telc registers them (0036): SchoolMan's export (`ExportListStudent_
 * Booking_Exam`) — name, gender, date and place of birth, country of birth, mother tongue, email and
 * the parts — for the bookings that stand, so a cancelled candidate is not reported. A gap is shown
 * as a gap, to be filled on the person's page before the list goes to telc. Personal data: `bookings`.
 */
export default async function TelcListPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireModule('bookings')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sitting = await getSitting(id);
  if (!sitting) notFound();
  const [rows, { t, lang }] = await Promise.all([telcList(id), getI18n()]);

  const gender = (salutation: string | null) => (salutation === 'ms' ? t('weiblich', 'female') : salutation === 'mr' ? t('männlich', 'male') : salutation === 'mx' ? t('divers', 'diverse') : '');
  const head = [t('Nachname', 'Surname'), t('Vorname', 'First name'), t('Geschlecht', 'Gender'), t('Geburtsdatum', 'Date of birth'), t('Geburtsort', 'Place of birth'), t('Geburtsland', 'Country of birth'), t('Muttersprache', 'Mother tongue'), t('E-Mail', 'Email'), t('Teile', 'Parts')];
  const table = rows.map((r) => [r.lastName, r.firstName, gender(r.salutation), r.birthDate ?? '', r.birthPlace ?? '', r.birthCountry ?? '', r.motherTongue ?? '', r.email ?? '', pick(lang, EXAM_PARTS_LABELS[r.parts])]);
  const day = new Date(sitting.startsAt).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <RecordHeader
        backHref={`/admin/catalogue/exams/${id}`}
        backLabel={sitting.examName}
        title={t('Liste für telc', 'List for telc')}
        subtitle={<span className="text-[0.98rem] font-semibold text-[#2b3546]">{`${sitting.examName} · ${day}`}</span>}
        actions={rows.length ? <CopyButton rows={[head, ...table]} /> : null}
      />
      <Card bleed>
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch niemand gebucht.', 'Nobody booked yet.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.84rem]">
              <thead>
                <tr className="border-b border-ws-line">
                  {head.map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-medium whitespace-nowrap text-[var(--casa-muted)] first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ws-line-soft">
                {table.map((cells, i) => (
                  <tr key={rows[i].bookingId}>
                    {cells.map((cell, j) => (
                      <td key={head[j]} className="px-4 py-2.5 whitespace-nowrap text-[var(--casa-ink)] first:pl-5 last:pr-5">
                        {/* A gap telc needs filled is marked, not hidden. */}
                        {cell || (j < 8 ? <span className="text-[#9a5b00]">{t('fehlt', 'missing')}</span> : null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
