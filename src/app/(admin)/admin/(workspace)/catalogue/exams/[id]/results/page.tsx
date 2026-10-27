import { notFound } from 'next/navigation';

import { saveResultsAction } from '../../actions';
import { Icon } from '@/components/admin/icons';
import { RecordLink } from '@/components/admin/record-link';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { Button, Card, Cell, RecordHeader, Select, Table, TableRow } from '@/components/admin/ui';
import { EXAM_OUTCOME_LABELS, EXAM_OUTCOMES, EXAM_PARTS_LABELS, overallOutcome, partsSat } from '@/lib/admin/exam-parts';
import { getSitting, sittingCandidates } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { num, pick, wsLocale } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * telc's results for a sitting (0038): one row per candidate whose booking stands, one choice per
 * part they sat — passed, not passed, did not come. What is left empty stays as it was. SchoolMan
 * kept no result at all; here the sitting's page shows each one, and the confirmation of
 * participation needs it. In the workspace's table since 2026-10-27, with how many are in.
 */
export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireModule('bookings', 'edit')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sitting = await getSitting(id);
  if (!sitting) notFound();
  const [candidates, { t, lang }] = await Promise.all([sittingCandidates(id), getI18n()]);
  const standing = candidates.filter((c) => c.status !== 'cancelled');
  const entered = standing.filter((c) => c.result && overallOutcome(c.parts, c.result)).length;
  const day = new Date(sitting.startsAt).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' });
  const partLabel = { written: t('Schriftlich', 'Written'), oral: t('Mündlich', 'Oral') };
  const back = `/admin/catalogue/exams/${id}`;

  return (
    <>
      <RecordHeader
        backHref={back}
        backLabel={sitting.examName}
        title={t('Ergebnisse eintragen', 'Enter results')}
        subtitle={
          <MetaLine>
            <MetaItem icon={Icon.award}>
              <RecordLink href={back}>{sitting.examName}</RecordLink>
            </MetaItem>
            <MetaItem icon={Icon.calendar}>{day}</MetaItem>
          </MetaLine>
        }
        bar={
          <StatBar>
            <Stat label={t('Teilnehmende', 'Candidates')}>{num(lang, standing.length)}</Stat>
            <Stat label={t('Eingetragen', 'Entered')}>
              <span className={entered < standing.length ? 'text-[#9a5b00]' : 'text-[#17693a]'}>{num(lang, entered)}</span>
              <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, standing.length)}</span>
            </Stat>
          </StatBar>
        }
      />
      <Card bleed>
        {standing.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Niemand gebucht.', 'Nobody booked.')}</p>
        ) : (
          <form action={saveResultsAction}>
            <input type="hidden" name="sittingId" value={id} />
            <Table head={[t('Teilnehmende', 'Candidate'), { label: partLabel.written, className: 'w-[13rem]' }, { label: partLabel.oral, className: 'w-[13rem]' }]}>
              {standing.map((c) => (
                <TableRow key={c.bookingId}>
                  <Cell className="py-2.5">
                    <input type="hidden" name="bookingIds" value={c.bookingId} />
                    <span className="block font-semibold text-[var(--casa-ink)]">{c.personName}</span>
                    <span className="block text-xs text-[var(--casa-muted)] tabular-nums">
                      {c.number}
                      {c.parts !== 'full' ? ` · ${pick(lang, EXAM_PARTS_LABELS[c.parts])}` : ''}
                    </span>
                  </Cell>
                  {(['written', 'oral'] as const).map((part) => (
                    <Cell key={part} className="py-2.5">
                      {partsSat(c.parts).includes(part) ? (
                        <Select name={`${part}-${c.bookingId}`} defaultValue={c.result?.[part] ?? ''} aria-label={`${c.personName}: ${partLabel[part]}`} className="min-w-[11rem]">
                          <option value="">—</option>
                          {EXAM_OUTCOMES.map((o) => (
                            <option key={o} value={o}>
                              {pick(lang, EXAM_OUTCOME_LABELS[o])}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                    </Cell>
                  ))}
                </TableRow>
              ))}
            </Table>
            <div className="flex justify-end border-t border-ws-line-soft px-5 py-3">
              <Button type="submit">{t('Ergebnisse speichern', 'Save results')}</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
