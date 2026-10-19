import { notFound } from 'next/navigation';

import { AttendanceSheetView } from './attendance-sheet';
import { PageHeader } from '@/components/admin/ui';
import { attendanceSheet } from '@/lib/admin/day-plan';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

/** A lesson day's attendance sheet, opened from a class in the Tagesplan (2026-10-19). */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const [{ lesson }] = await Promise.all([searchParams, requireModule('day')]);
  if (!lesson || !/^[0-9a-f-]{36}$/i.test(lesson)) notFound();
  const sheet = await attendanceSheet(lesson);
  if (!sheet) notFound();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader backHref={`/admin/day/courses?date=${sheet.date}`} backLabel={t('Kurse des Tages', 'The day’s courses')} title={t(`Anwesenheitsliste ${sheet.label}`, `Attendance sheet ${sheet.label}`)} />
      <AttendanceSheetView sheet={sheet} />
    </>
  );
}
