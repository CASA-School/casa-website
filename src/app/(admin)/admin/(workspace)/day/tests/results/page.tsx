import { notFound } from 'next/navigation';

import { PrintSheet } from '../print-sheet';
import { PageHeader } from '@/components/admin/ui';
import { archivePastSittings, exportSittings, resultsByClass, type ClassLearner, type EntryTestAttempt } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { cn } from '@/lib/utils';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION = { morning: 'Vormittag', afternoon: 'Nachmittag' } as const;
const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const handedIn = (a: EntryTestAttempt) => a.status === 'submitted' || a.status === 'expired';
/** New at CASA (their first course starts today): a highlighter's yellow, on screen and on paper. */
const NEW = 'bg-[#fff1a8]';

type Row = { attempt: EntryTestAttempt | null; learner: ClassLearner | null };

/**
 * A day-one test's results on A4 (2026-10-20, Rahman: „downloadable as PDF"), for the teachers who place
 * the learners. Since 2026-10-26 (Rahman: „the results should be per course so we know which course the
 * students are", the new ones colour-coded): one page per class — its level and group number, teacher
 * and room — with its learners by points, the two parts, what was left blank, who has not written, and
 * the learners new at CASA marked in yellow. Attempts that fit no class's learner get a page of their own.
 * Printed or saved as a PDF like the class list; the Excel has every answer.
 */
export default async function EntryTestResultsPage({ searchParams }: { searchParams: Promise<{ date?: string; sitting?: string }> }) {
  const [{ date, sitting }] = await Promise.all([searchParams, requireModule('day')]);
  if (!date || !DAY.test(date) || (sitting !== undefined && !UUID.test(sitting))) notFound();
  await archivePastSittings();
  const sittings = (await exportSittings(date, sitting)).filter((s) => s.attempts.length);
  if (!sittings.length) notFound();
  const { classes, unplaced } = await resultsByClass(date, sittings);
  const { t } = await getI18n();
  const name = `Ergebnisse Einstufungstest ${date}${sittings.length === 1 ? ` ${SESSION[sittings[0].session]} ${sittings[0].title.replace(/^Einstufungstest /, '').replace(/ Tag 1$/, '')}` : ''}`;
  const pages = [
    ...classes
      .filter((c) => c.rows.length || c.missing.length)
      .map((c) => ({
        key: `${c.session}-${c.test}-${c.cls.dayId}`,
        title: c.title,
        heading: `${c.cls.label}${c.cls.number ? ` · #${c.cls.number}` : ''}`,
        session: c.session,
        teacher: c.cls.teacherName,
        room: c.cls.roomName,
        rows: [...c.rows, ...c.missing.map((learner) => ({ attempt: null, learner }))] as Row[],
      })),
    ...unplaced.map((u) => ({
      key: `${u.session}-${u.test}-unplaced`,
      title: u.title,
      heading: 'Ohne Kurszuordnung',
      session: u.session,
      teacher: null,
      room: null,
      rows: u.attempts.map((attempt) => ({ attempt, learner: null })) as Row[],
    })),
  ];

  return (
    <>
      <PageHeader backHref={`/admin/day?date=${date}`} backLabel={t('Tagesplan', 'Day plan')} title={t('Ergebnisse Einstufungstest', 'Placement test results')} />
      <PrintSheet name={name}>
        {pages.map((page, i) => {
          const order = (r: Row) => (!r.attempt ? 2 : handedIn(r.attempt) ? 0 : 1);
          const rows = [...page.rows].sort(
            (a, b) =>
              order(a) - order(b) ||
              (b.attempt?.score ?? 0) - (a.attempt?.score ?? 0) ||
              (a.learner?.name ?? a.attempt?.name ?? '').localeCompare(b.learner?.name ?? b.attempt?.name ?? '', 'de')
          );
          const done = rows.flatMap((r) => (r.attempt && handedIn(r.attempt) ? [r.attempt] : []));
          const max = done[0]?.max ?? 80;
          const average = done.length ? Math.round(done.reduce((sum, a) => sum + (a.score ?? 0), 0) / done.length) : null;
          const anyNew = rows.some((r) => r.learner?.isNew);
          return (
            <section key={page.key} className={cn('text-[#111827]', i > 0 && 'mt-12 break-before-page print:mt-0')}>
              <div className="flex items-end justify-between border-b-2 border-[#111827] pb-2.5">
                <div className="flex items-baseline gap-3">
                  <span className="font-[family-name:var(--font-display)] text-[1.5rem] leading-none font-semibold tracking-[0.06em]">CASA</span>
                  <span className="text-[0.95rem] font-bold">Ergebnisse · {page.title}</span>
                </div>
                <span className="text-[1.15rem] leading-none font-extrabold">{page.heading}</span>
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-x-6 text-[0.8rem]">
                <Fact label="Tag">{longDay(date)}</Fact>
                <Fact label="Lehrkraft">{[page.teacher, page.room ? `Raum ${page.room}` : null].filter(Boolean).join(' · ') || SESSION[page.session]}</Fact>
                <Fact label="Abgegeben">{`${done.length} von ${rows.length}`}</Fact>
                <Fact label="Durchschnitt">{average === null ? '—' : `${average} / ${max} Punkte`}</Fact>
              </dl>
              {anyNew ? (
                <p className="mt-3 flex items-center gap-2 text-[0.72rem] text-[#4b5563]">
                  <span className={cn('inline-block h-3 w-5 rounded-sm ring-1 ring-[#e6d36a]', NEW)} />
                  Neu bei CASA – der erste Kurs beginnt heute
                </p>
              ) : null}
              <table className="mt-3 w-full border-collapse text-[0.8rem]">
                <thead>
                  <tr className="border-b border-[#9ca3af] text-left text-[0.72rem] text-[#4b5563]">
                    <th className="py-1.5 pr-2 pl-1.5 font-semibold">Nr.</th>
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
                  {rows.map(({ attempt: a, learner }, n) => {
                    const ok = a ? handedIn(a) : false;
                    const note = a
                      ? [
                          a.status === 'running' ? 'schreibt noch' : a.status === 'paused' ? 'pausiert' : null,
                          a.source === 'paper' ? 'Papier' : null,
                          a.status === 'expired' ? 'Zeit abgelaufen' : null,
                          a.interruptions ? `${a.interruptions}× Seite verlassen` : null,
                          learner && a.name.trim() && !sameName(a.name, learner.name) ? `eingegeben: ${a.name}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : 'nicht geschrieben';
                    return (
                      <tr key={a?.id ?? learner?.personId} className={cn('border-b border-[#e5e7eb] align-top', learner?.isNew && NEW)}>
                        <td className="py-1.5 pr-2 pl-1.5 text-[#6b7280]">{n + 1}</td>
                        <td className="py-1.5 pr-2 font-semibold">{learner?.name ?? a?.name}</td>
                        <td className="py-1.5 pr-2">{a?.version ?? ''}</td>
                        <td className="py-1.5 pr-2 text-right font-bold">{ok && a ? `${a.score} / ${a.max}` : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok && a?.max ? Math.round(((a.score ?? 0) / a.max) * 100) : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok && a ? `${a.grammar} / ${a.grammarMax}` : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok && a ? `${a.reading} / ${a.readingMax}` : '—'}</td>
                        <td className="py-1.5 pr-2 text-right">{ok && a ? a.blank : '—'}</td>
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

/** Whether what the learner typed is their name as booked, in any order and spelling of accents. */
function sameName(typed: string, booked: string) {
  const words = (s: string) =>
    s.replace(/ı/g, 'i').replace(/İ/g, 'I').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter(Boolean).sort().join(' ');
  return words(typed) === words(booked);
}

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-semibold text-[#6b7280]">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
