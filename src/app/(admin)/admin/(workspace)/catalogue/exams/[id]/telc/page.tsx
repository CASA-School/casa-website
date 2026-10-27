import { notFound } from 'next/navigation';

import { CopyButton } from './copy-button';
import { Icon } from '@/components/admin/icons';
import { RecordLink } from '@/components/admin/record-link';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { Card, Cell, RecordHeader, Table, TableRow } from '@/components/admin/ui';
import { EXAM_PARTS_LABELS } from '@/lib/admin/exam-parts';
import { getSitting, telcList } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { num, pick, wsLocale } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * A sitting's candidates as telc registers them (0036): SchoolMan's export (`ExportListStudent_
 * Booking_Exam`) — name, gender, date and place of birth, country of birth, mother tongue, email and
 * the parts — for the bookings that stand, so a cancelled candidate is not reported. A gap is shown
 * as a gap, and the name leads to the person's details where it is filled, before the list goes to
 * telc. Personal data: `bookings`. In the workspace's table since 2026-10-27, with how many are complete.
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
  // A row is complete when every field telc prints from is there.
  const complete = table.filter((cells) => cells.slice(0, 8).every(Boolean)).length;
  const day = new Date(sitting.startsAt).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' });
  const deadline = sitting.registrationDeadline
    ? new Date(sitting.registrationDeadline).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const back = `/admin/catalogue/exams/${id}`;

  return (
    <>
      <RecordHeader
        backHref={back}
        backLabel={sitting.examName}
        title={t('Liste für telc', 'List for telc')}
        subtitle={
          <MetaLine>
            <MetaItem icon={Icon.award}>
              <RecordLink href={back}>{sitting.examName}</RecordLink>
            </MetaItem>
            <MetaItem icon={Icon.calendar}>{day}</MetaItem>
            {deadline ? <MetaItem icon={Icon.clock}>{t(`Anmeldeschluss ${deadline}`, `Entries close ${deadline}`)}</MetaItem> : null}
          </MetaLine>
        }
        actions={rows.length ? <CopyButton rows={[head, ...table]} /> : null}
        bar={
          rows.length ? (
            <StatBar>
              <Stat label={t('Teilnehmende', 'Candidates')}>{num(lang, rows.length)}</Stat>
              <Stat label={t('Vollständig', 'Complete')}>
                <span className={complete < rows.length ? 'text-[#9a5b00]' : 'text-[#17693a]'}>{num(lang, complete)}</span>
                <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, rows.length)}</span>
              </Stat>
              <Stat label={t('Bei telc gemeldet', 'Reported to telc')}>
                {num(lang, sitting.filed)}
                <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, sitting.booked)}</span>
              </Stat>
            </StatBar>
          ) : undefined
        }
      />
      <Card bleed>
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch niemand gebucht.', 'Nobody booked yet.')}</p>
        ) : (
          <Table head={head.map((label) => ({ label }))}>
            {table.map((cells, i) => {
              const gap = cells.slice(0, 8).some((cell) => !cell);
              return (
                <TableRow key={rows[i].bookingId}>
                  {cells.map((cell, j) => (
                    <Cell key={head[j]} className="py-2.5 text-[0.84rem] whitespace-nowrap">
                      {/* The name leads to where a gap is filled; a gap telc needs filled is marked, not hidden. */}
                      {j === 0 && gap ? (
                        <RecordLink href={`/admin/people/${rows[i].personId}?tab=details`}>{cell || t('fehlt', 'missing')}</RecordLink>
                      ) : (
                        cell || (j < 8 ? <span className="font-semibold text-[#9a5b00]">{t('fehlt', 'missing')}</span> : null)
                      )}
                    </Cell>
                  ))}
                </TableRow>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
