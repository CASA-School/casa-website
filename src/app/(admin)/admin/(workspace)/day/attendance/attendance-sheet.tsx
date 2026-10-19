'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { isSchoolClosed } from '@/config/school-closures';
import { useWsLang } from '@/components/admin/lang';
import { printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import type { AttendanceSheet } from '@/lib/admin/day-plan';
import { SHEET_DAYS } from '@/lib/admin/day-plan-labels';
import { wsLocale, type WsLang } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

const subscribeNothing = () => () => {};
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const plus = (iso: string, n: number) => new Date(noon(iso).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const fmt = (iso: string, lang: WsLang, options: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString(wsLocale(lang), { ...options, timeZone: 'UTC' });
const weekend = (iso: string) => noon(iso).getUTCDay() % 6 === 0;

function isoWeek(iso: string): number {
  const d = noon(iso);
  const thursday = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * 86_400_000);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4, 12));
  const firstThursday = new Date(jan4.getTime() + (3 - ((jan4.getUTCDay() + 6) % 7)) * 86_400_000);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

/**
 * A class's attendance sheet for four weeks (2026-10-19, Rahman: "not daily, it is for the course …
 * Querformat"), laid out as SchoolMan makes it (`MakeCoursePlan.DateBooking_Course`,
 * `DateBooking_FourWeekPresence.Dynamic`): A4 across; the course, its time, room, teachers and the four
 * weeks at the top; then a row per learner — number, name, from, until — and a column per day, each
 * headed with its date and weekday, the weekends in red. A learner's lesson day is an empty box to tick;
 * a day without a lesson for them is grey; a day the school is closed is hatched. The course's sheets
 * are four weeks each, chosen above the sheet; printed or saved as a PDF on its own.
 */
export function AttendanceSheetView({ sheet }: { sheet: AttendanceSheet }) {
  const { t, lang } = useWsLang();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const index = sheet.blocks.indexOf(sheet.from);
  const name = `${t('Anwesenheit', 'Attendance')} ${sheet.label}${sheet.number ? ` ${sheet.number}` : ''} ${sheet.from}`;
  const href = (from: string) => `/admin/day/attendance?course=${sheet.courseId}&group=${sheet.groupIndex}&from=${from}`;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {sheet.blocks.length > 1 ? (
          <nav aria-label={t('Welche vier Wochen', 'Which four weeks')} className="inline-flex flex-wrap rounded-full bg-white p-1 ring-1 ring-ws-line">
            {sheet.blocks.map((b, i) => {
              const on = b === sheet.from;
              return (
                <Link
                  key={b}
                  href={href(b)}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 flex-col justify-center rounded-full px-4 text-left leading-tight transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
                    on ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-ink)] hover:bg-ws-sunk'
                  )}
                >
                  <span className="text-[0.8rem] font-bold">{t(`Woche ${i * 4 + 1}–${i * 4 + 4}`, `Weeks ${i * 4 + 1}–${i * 4 + 4}`)}</span>
                  <span className={cn('text-[0.68rem] font-medium tabular-nums', on ? 'text-white/70' : 'text-[var(--casa-muted)]')}>
                    {fmt(b, lang, { day: 'numeric', month: 'numeric' })} – {fmt(plus(b, SHEET_DAYS - 1), lang, { day: 'numeric', month: 'numeric' })}
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <span />
        )}
        <Button type="button" onClick={() => printLetter(name)}>
          {t('Drucken / PDF', 'Print / PDF')}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-ws-line bg-[#eef1f5] p-4 sm:p-6">
        <div className="mx-auto w-fit bg-white px-[9mm] py-[8mm] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_24px_48px_-30px_rgba(15,23,42,0.45)]">
          <Sheet sheet={sheet} index={index} lang={lang} />
        </div>
      </div>
      {mounted
        ? createPortal(
            <div data-letter-print className="ws-attendance-print hidden bg-white">
              <Sheet sheet={sheet} index={index} lang={lang} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function Sheet({ sheet, index, lang }: { sheet: AttendanceSheet; index: number; lang: WsLang }) {
  const t = (de: string, en: string) => (lang === 'en' ? en : de);
  const days = Array.from({ length: SHEET_DAYS }, (_, i) => plus(sheet.from, i));
  const weeks = [0, 1, 2, 3].map((w) => days.slice(w * 7, w * 7 + 7));
  const lessons = new Set(sheet.lessons);
  const last = days.at(-1)!;
  // A few blank rows under the class, for whoever joins in these weeks.
  const rows = [...sheet.learners, ...Array.from({ length: Math.max(3, 12 - sheet.learners.length) }, () => null)];
  const short = (iso: string) => fmt(iso, lang, { day: '2-digit', month: '2-digit' });
  const cell = (day: string, learner: { from: string; to: string } | null) => {
    if (isSchoolClosed(day) && !weekend(day)) return 'closed';
    if (!lessons.has(day)) return weekend(day) ? 'weekend' : 'none';
    if (learner && (day < learner.from || day > learner.to)) return 'none';
    return 'lesson';
  };
  return (
    <div className="w-[279mm] text-[#111827]">
      {/* The head: who teaches what, where, when, and which four weeks of how many. */}
      <div className="flex items-end justify-between gap-6 border-b-[1.5pt] border-[#111827] pb-[2.5mm]">
        <div className="flex items-baseline gap-[4mm]">
          <span className="font-[family-name:var(--font-display)] text-[17pt] leading-none font-semibold tracking-[0.06em]">CASA</span>
          <span className="text-[11pt] font-bold">{t('Anwesenheitsliste', 'Attendance sheet')}</span>
        </div>
        <div className="min-w-0 text-right">
          <span className={cn('leading-none font-extrabold', sheet.label.length > 12 ? 'text-[12pt]' : 'text-[17pt]')}>{sheet.label}</span>
          <span className="ml-[2mm] text-[10pt] font-semibold text-[#4b5563]">{sheet.typeName}</span>
        </div>
      </div>
      <dl className="mt-[3mm] grid grid-cols-[auto_auto_auto_1fr_auto] gap-x-[7mm] text-[8.5pt]">
        <Fact label={t('Kurs', 'Course')}>{sheet.number ? `#${sheet.number}` : '—'}</Fact>
        <Fact label={t('Zeit', 'Time')}>{sheet.hours ?? '—'}</Fact>
        <Fact label={t('Raum', 'Room')}>{sheet.roomName ?? '—'}</Fact>
        <Fact label={t('Lehrkraft', 'Teacher')}>{sheet.teachers.length ? sheet.teachers.join(', ') : '—'}</Fact>
        <Fact label={t('Zeitraum', 'Period')}>
          {fmt(sheet.from, lang, { day: '2-digit', month: '2-digit' })} – {fmt(last, lang, { day: '2-digit', month: '2-digit', year: 'numeric' })}
          {sheet.blocks.length > 1 ? <span className="font-medium text-[#4b5563]"> · {t(`Woche ${index * 4 + 1}–${index * 4 + 4} von ${sheet.blocks.length * 4}`, `weeks ${index * 4 + 1}–${index * 4 + 4} of ${sheet.blocks.length * 4}`)}</span> : null}
        </Fact>
      </dl>

      <table className="mt-[4mm] w-full table-fixed border-collapse text-[8pt]">
        <colgroup>
          <col className="w-[6mm]" />
          <col className="w-[46mm]" />
          <col className="w-[11mm]" />
          <col className="w-[11mm]" />
          {days.map((d) => (
            <col key={d} className={weekend(d) ? 'w-[5mm]' : 'w-[8mm]'} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} className="border border-[#6b7280] bg-[#f3f4f6] px-[1mm] text-left align-bottom font-semibold">#</th>
            <th rowSpan={2} className="border border-[#6b7280] bg-[#f3f4f6] px-[1.5mm] py-[1mm] text-left align-bottom font-semibold">{t('Name', 'Name')}</th>
            <th rowSpan={2} className="border border-[#6b7280] bg-[#f3f4f6] px-[1mm] text-left align-bottom font-semibold">{t('Von', 'From')}</th>
            <th rowSpan={2} className="border border-[#6b7280] bg-[#f3f4f6] px-[1mm] text-left align-bottom font-semibold">{t('Bis', 'Until')}</th>
            {weeks.map((w) => (
              <th key={w[0]} colSpan={7} className="border border-[#6b7280] bg-[#e5e7eb] px-[1mm] py-[0.8mm] text-center text-[7.5pt] font-bold">
                {t(`KW ${isoWeek(w[0])}`, `Week ${isoWeek(w[0])}`)} <span className="font-medium text-[#4b5563]">· {fmt(w[0], lang, { day: 'numeric', month: 'numeric' })}–{fmt(w[6], lang, { day: 'numeric', month: 'numeric' })}</span>
              </th>
            ))}
          </tr>
          <tr>
            {days.map((d) => (
              <th key={d} className={cn('border border-[#6b7280] px-0 py-[0.6mm] text-center leading-[1.15]', weekend(d) ? 'bg-[#f3f4f6] text-[#c81e1e]' : 'bg-[#f9fafb]')}>
                <span className={cn('block font-bold tabular-nums', weekend(d) ? 'text-[6.5pt]' : 'text-[8pt]')}>{fmt(d, lang, { day: '2-digit' })}</span>
                {weekend(d) ? null : <span className="block text-[6.5pt] font-semibold">{fmt(d, lang, { weekday: 'short' }).slice(0, 2)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((learner, i) => (
            <tr key={i} className="h-[6.2mm]">
              <td className="border border-[#9ca3af] px-[1mm] text-[#6b7280] tabular-nums">{i + 1}</td>
              <td className="truncate border border-[#9ca3af] px-[1.5mm] font-semibold">{learner?.name ?? ''}</td>
              <td className="border border-[#9ca3af] px-[1mm] text-[7.5pt] tabular-nums">{learner && learner.from > sheet.from ? short(learner.from) : ''}</td>
              <td className="border border-[#9ca3af] px-[1mm] text-[7.5pt] tabular-nums">{learner && learner.to < last ? short(learner.to) : ''}</td>
              {days.map((d) => {
                const kind = cell(d, learner);
                return (
                  <td
                    key={d}
                    className={cn(
                      'border border-[#9ca3af]',
                      kind === 'none' && 'bg-[#d9dde3]',
                      kind === 'weekend' && 'bg-[#eceef2]',
                      kind === 'closed' && 'bg-[repeating-linear-gradient(135deg,#f6dede_0_2px,#ffffff_2px_5px)]'
                    )}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-[5mm] flex items-end justify-between gap-8 text-[7.5pt] text-[#4b5563]">
        <p className="flex flex-wrap items-center gap-x-[4mm] gap-y-[1mm]">
          <Swatch className="border border-[#9ca3af] bg-white" /> {t('Unterricht', 'Lesson')}
          <Swatch className="border border-[#9ca3af] bg-[#d9dde3]" /> {t('kein Unterricht', 'no lesson')}
          <Swatch className="border border-[#9ca3af] bg-[repeating-linear-gradient(135deg,#f6dede_0_2px,#ffffff_2px_5px)]" /> {t('Schule geschlossen', 'School closed')}
        </p>
        <p className="w-[70mm] border-t border-[#111827] pt-[1mm] text-center">{t('Unterschrift Lehrkraft', 'Teacher’s signature')}</p>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[7pt] font-semibold text-[#6b7280]">{label}</dt>
      <dd className="mt-[0.4mm] truncate font-bold">{children}</dd>
    </div>
  );
}

function Swatch({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('inline-block h-[3mm] w-[4.5mm] align-middle', className)} />;
}
