'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useWsLang } from '@/components/admin/lang';
import { printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';
import type { AttendanceSheet } from '@/lib/admin/day-plan';
import { wsLocale, type WsLang } from '@/lib/admin/i18n';

const subscribeNothing = () => () => {};
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const fmt = (iso: string, lang: WsLang, options: Intl.DateTimeFormatOptions) => noon(iso).toLocaleDateString(wsLocale(lang), { ...options, timeZone: 'UTC' });

/**
 * A lesson day's attendance sheet (2026-10-19), laid out as SchoolMan prints it
 * (`SingleDateCourse_PresencePrint`, read from its DDR): A4 upright; Kurs, Lehrkraft and Tag at the top;
 * a row per learner with Anwesenheit, Verspätung and Kommentar; then Inhalt, Hausaufgaben and Kommentar
 * for the teacher. On screen as it will print; printed or saved as a PDF on its own, as a letter is.
 */
export function AttendanceSheetView({ sheet }: { sheet: AttendanceSheet }) {
  const { t, lang } = useWsLang();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const name = `${t('Anwesenheit', 'Attendance')} ${sheet.label}${sheet.number ? ` ${sheet.number}` : ''} ${sheet.date}`;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => printLetter(name)}>
          {t('Drucken / PDF', 'Print / PDF')}
        </Button>
      </div>
      <div className="mx-auto max-w-[820px] rounded-2xl border border-ws-line bg-white px-10 py-9 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <Sheet sheet={sheet} lang={lang} />
      </div>
      {mounted
        ? createPortal(
            <div data-letter-print className="hidden bg-white px-[14mm] py-[12mm] print:block">
              <Sheet sheet={sheet} lang={lang} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function Sheet({ sheet, lang }: { sheet: AttendanceSheet; lang: WsLang }) {
  const t = (de: string, en: string) => (lang === 'en' ? en : de);
  // A few blank rows under the class, for whoever joins on the day.
  const rows = Math.max(sheet.learners.length + 3, 14);
  return (
    <div className="text-[#111827]">
      <div className="flex items-end justify-between border-b-2 border-[#111827] pb-2.5">
        <p className="font-[family-name:var(--font-display)] text-[1.5rem] leading-none font-semibold tracking-[0.06em]">CASA</p>
        <p className="text-[0.95rem] font-extrabold">{t('Anwesenheitsliste', 'Attendance sheet')}</p>
      </div>

      <div className="mt-4 grid grid-cols-[1.1fr_1fr_1fr] gap-x-6 text-[0.84rem]">
        <Head label={t('Kurs', 'Course')}>
          <span className="font-extrabold">{sheet.label}</span> · {fmt(sheet.date, lang, { weekday: 'short' })} {sheet.startsAt && sheet.endsAt ? `${sheet.startsAt}–${sheet.endsAt}` : ''}
          <span className="block text-[0.78rem] font-medium text-[#4b5563]">
            {sheet.typeName}
            {sheet.number ? ` · #${sheet.number}` : ''}
          </span>
        </Head>
        <Head label={t('Lehrkraft', 'Teacher')}>
          {sheet.teacherName ?? '—'}
          {sheet.replacedTeacherName ? <span className="block text-[0.78rem] font-medium text-[#4b5563]">{t(`Vertretung für ${sheet.replacedTeacherName}`, `Covering for ${sheet.replacedTeacherName}`)}</span> : null}
        </Head>
        <Head label={t('Tag', 'Day')}>
          {fmt(sheet.date, lang, { day: '2-digit', month: '2-digit', year: 'numeric' })}
          <span className="block text-[0.78rem] font-medium text-[#4b5563]">{sheet.roomName ? t(`Raum ${sheet.roomName}`, `Room ${sheet.roomName}`) : ''}</span>
        </Head>
      </div>

      <table className="mt-5 w-full border-collapse text-[0.84rem]">
        <thead>
          <tr className="bg-[#f3f4f6]">
            <th className="w-8 border border-[#9ca3af] px-1.5 py-1.5 text-left font-semibold">#</th>
            <th className="border border-[#9ca3af] px-2 py-1.5 text-left font-semibold">{t('Name', 'Name')}</th>
            <th className="w-[6.5rem] border border-[#9ca3af] px-2 py-1.5 text-left font-semibold">{t('Anwesenheit', 'Present')}</th>
            <th className="w-[6rem] border border-[#9ca3af] px-2 py-1.5 text-left font-semibold">{t('Verspätung', 'Late')}</th>
            <th className="w-[12rem] border border-[#9ca3af] px-2 py-1.5 text-left font-semibold">{t('Kommentar', 'Comment')}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} className="h-[1.85rem]">
              <td className="border border-[#9ca3af] px-1.5 text-[#6b7280] tabular-nums">{i + 1}</td>
              <td className="border border-[#9ca3af] px-2 font-semibold">{sheet.learners[i]?.name ?? ''}</td>
              <td className="border border-[#9ca3af]" />
              <td className="border border-[#9ca3af]" />
              <td className="border border-[#9ca3af]" />
            </tr>
          ))}
        </tbody>
      </table>

      <Box label={t('Inhalt', 'Content')} tall />
      <Box label={t('Hausaufgaben', 'Homework')} />
      <Box label={t('Kommentar', 'Comment')} />
    </div>
  );
}

function Head({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.72rem] font-semibold text-[#6b7280]">{label}</p>
      <p className="mt-0.5 font-semibold">{children}</p>
    </div>
  );
}

function Box({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div className="mt-4 break-inside-avoid">
      <p className="text-[0.78rem] font-bold">{label}</p>
      <div className={`mt-1 rounded-md border border-[#9ca3af] ${tall ? 'h-[6.5rem]' : 'h-[3.6rem]'}`} />
    </div>
  );
}
