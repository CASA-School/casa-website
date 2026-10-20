import { notFound } from 'next/navigation';

import { PrintSheet } from '../print-sheet';
import { PageHeader } from '@/components/admin/ui';
import { archivePastSittings, exportSittings, type EntryTestAttempt } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { cn } from '@/lib/utils';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION = { morning: 'Vormittag', afternoon: 'Nachmittag' } as const;
const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const handedIn = (a: EntryTestAttempt) => a.status === 'submitted' || a.status === 'expired';

/**
 * A day-one test's results on A4 (2026-10-20, Rahman: „downloadable as PDF"), for the teachers who place
 * the learners: one page per test and session, the learners by points, the two parts, what was left
 * blank and how often the page was left. Printed or saved as a PDF like the class list; the Excel has
 * every answer.
 */
export default async function EntryTestResultsPage({ searchParams }: { searchParams: Promise<{ date?: string; sitting?: string }> }) {
  const [{ date, sitting }] = await Promise.all([searchParams, requireModule('day')]);
  if (!date || !DAY.test(date) || (sitting !== undefined && !UUID.test(sitting))) notFound();
  await archivePastSittings();
  const sittings = (await exportSittings(date, sitting)).filter((s) => s.attempts.length);
  if (!sittings.length) notFound();
  const { t } = await getI18n();
  const name = `Ergebnisse Einstufungstest ${date}${sittings.length === 1 ? ` ${SESSION[sittings[0].session]} ${sittings[0].title.replace(/^Einstufungstest /, '').replace(/ Tag 1$/, '')}` : ''}`;
  return (
    <>
      <PageHeader backHref={`/admin/day?date=${date}`} backLabel={t('Tagesplan', 'Day plan')} title={t('Ergebnisse Einstufungstest', 'Placement test results')} />
      <PrintSheet name={name}>
        {sittings.map((s, i) => {
          const done = s.attempts.filter(handedIn).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name, 'de'));
          const open = s.attempts.filter((a) => !handedIn(a)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
          const max = done[0]?.max ?? 80;
          const average = done.length ? Math.round(done.reduce((sum, a) => sum + (a.score ?? 0), 0) / done.length) : null;
          return (
            <section key={`${s.session}-${s.test}`} className={cn('text-[#111827]', i > 0 && 'mt-12 break-before-page print:mt-0')}>
              <div className="flex items-end justify-between border-b-2 border-[#111827] pb-2.5">
                <div className="flex items-baseline gap-3">
                  <span className="font-[family-name:var(--font-display)] text-[1.5rem] leading-none font-semibold tracking-[0.06em]">CASA</span>
                  <span className="text-[0.95rem] font-bold">Ergebnisse</span>
                </div>
                <span className="text-[1.15rem] leading-none font-extrabold">{s.title}</span>
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-x-6 text-[0.8rem]">
                <Fact label="Tag">{longDay(s.day)}</Fact>
                <Fact label="Gruppe">{SESSION[s.session]}</Fact>
                <Fact label="Abgegeben">{`${done.length} von ${s.attempts.length}`}</Fact>
                <Fact label="Durchschnitt">{average === null ? '—' : `${average} / ${max} Punkte`}</Fact>
              </dl>
              <table className="mt-5 w-full border-collapse text-[0.8rem]">
                <thead>
                  <tr className="border-b border-[#9ca3af] text-left text-[0.72rem] text-[#4b5563]">
                    <th className="py-1.5 pr-2 font-semibold">Nr.</th>
                    <th className="py-1.5 pr-2 font-semibold">Name</th>
                    <th className="py-1.5 pr-2 font-semibold">Version</th>
                    <th className="py-1.5 pr-2 text-right font-semibold">Punkte</th>
                    <th className="py-1.5 pr-2 text-right font-semibold">%</th>
                    <th className="py-1.5 pr-2 text-right font-semibold">Aufgaben</th>
                    <th className="py-1.5 pr-2 text-right font-semibold">Lesen</th>
                    <th className="py-1.5 pr-2 text-right font-semibold">Leer</th>
                    <th className="py-1.5 pl-3 font-semibold">Hinweis</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[...done, ...open].map((a, n) => {
                    const ok = handedIn(a);
                    const note = [
                      a.status === 'running' ? 'schreibt noch' : a.status === 'paused' ? 'pausiert' : null,
                      a.source === 'paper' ? 'Papier' : null,
                      a.status === 'expired' ? 'Zeit abgelaufen' : null,
                      a.interruptions ? `${a.interruptions}× Seite verlassen` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <tr key={a.id} className="border-b border-[#e5e7eb] align-top">
                        <td className="py-1.5 pr-2 text-[#6b7280]">{n + 1}</td>
                        <td className="py-1.5 pr-2 font-semibold">{a.name}</td>
                        <td className="py-1.5 pr-2">{a.version}</td>
                        <td className="py-1.5 pr-2 text-right font-bold">{ok ? `${a.score} / ${a.max}` : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok && a.max ? Math.round(((a.score ?? 0) / a.max) * 100) : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok ? `${a.grammar} / ${a.grammarMax}` : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok ? `${a.reading} / ${a.readingMax}` : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok ? a.blank : '—'}</td>
                        <td className="py-1.5 pl-3 text-[0.74rem] text-[#4b5563]">{note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </PrintSheet>
    </>
  );
}

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-semibold text-[#6b7280]">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
