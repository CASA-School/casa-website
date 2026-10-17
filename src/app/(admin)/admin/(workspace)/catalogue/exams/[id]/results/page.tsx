import { notFound } from 'next/navigation';

import { saveResultsAction } from '../../actions';
import { Button, Card, RecordHeader, Select } from '@/components/admin/ui';
import { EXAM_OUTCOME_LABELS, EXAM_OUTCOMES, EXAM_PARTS_LABELS, partsSat } from '@/lib/admin/exam-parts';
import { getSitting, sittingCandidates } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { pick, wsLocale } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * telc's results for a sitting (0038): one row per candidate whose booking stands, one choice per
 * part they sat — passed, not passed, did not come. What is left empty stays as it was. SchoolMan
 * kept no result at all; here the sitting's page shows each one, and the confirmation of
 * participation needs it.
 */
export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireModule('bookings', 'edit')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sitting = await getSitting(id);
  if (!sitting) notFound();
  const [candidates, { t, lang }] = await Promise.all([sittingCandidates(id), getI18n()]);
  const standing = candidates.filter((c) => c.status !== 'cancelled');
  const day = new Date(sitting.startsAt).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const partLabel = { written: t('Schriftlich', 'Written'), oral: t('Mündlich', 'Oral') };

  return (
    <>
      <RecordHeader
        backHref={`/admin/catalogue/exams/${id}`}
        backLabel={sitting.examName}
        title={t('Ergebnisse eintragen', 'Enter results')}
        subtitle={<span className="text-[0.98rem] font-semibold text-[#2b3546]">{`${sitting.examName} · ${day}`}</span>}
      />
      <Card bleed>
        {standing.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Niemand gebucht.', 'Nobody booked.')}</p>
        ) : (
          <form action={saveResultsAction}>
            <input type="hidden" name="sittingId" value={id} />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.86rem]">
                <thead>
                  <tr className="border-b border-ws-line">
                    <th className="px-5 py-2.5 text-xs font-medium text-[var(--casa-muted)]">{t('Teilnehmende', 'Candidate')}</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-[var(--casa-muted)]">{partLabel.written}</th>
                    <th className="px-4 py-2.5 pr-5 text-xs font-medium text-[var(--casa-muted)]">{partLabel.oral}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ws-line-soft">
                  {standing.map((c) => (
                    <tr key={c.bookingId}>
                      <td className="px-5 py-2.5">
                        <input type="hidden" name="bookingIds" value={c.bookingId} />
                        <span className="block font-semibold text-[var(--casa-ink)]">{c.personName}</span>
                        <span className="block text-xs text-[var(--casa-muted)] tabular-nums">
                          {c.number}
                          {c.parts !== 'full' ? ` · ${pick(lang, EXAM_PARTS_LABELS[c.parts])}` : ''}
                        </span>
                      </td>
                      {(['written', 'oral'] as const).map((part) => (
                        <td key={part} className="px-4 py-2.5 last:pr-5">
                          {partsSat(c.parts).includes(part) ? (
                            <Select name={`${part}-${c.bookingId}`} defaultValue={c.result?.[part] ?? ''} aria-label={`${c.personName}: ${partLabel[part]}`} className="min-w-[11rem]">
                              <option value="">—</option>
                              {EXAM_OUTCOMES.map((o) => (
                                <option key={o} value={o}>
                                  {pick(lang, EXAM_OUTCOME_LABELS[o])}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <span className="text-[var(--casa-text-subtle)]">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-ws-line-soft px-5 py-3">
              <Button type="submit">{t('Ergebnisse speichern', 'Save results')}</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
