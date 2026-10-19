import { notFound, redirect } from 'next/navigation';

import { AttendanceSheetView } from './attendance-sheet';
import { PageHeader } from '@/components/admin/ui';
import { attendanceSheet, lessonClass } from '@/lib/admin/day-plan';
import { berlinDay } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A class's attendance sheet for four weeks (2026-10-19, Rahman: "not daily, it is for the course … in
 * Querformat"), as SchoolMan makes it. Opened from a class in the Tagesplan — then on that day's four
 * weeks — or from the course's page.
 */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ course?: string; group?: string; from?: string; lesson?: string }> }) {
  const [params] = await Promise.all([searchParams, requireModule('day')]);
  if (params.lesson && UUID.test(params.lesson)) {
    const lesson = await lessonClass(params.lesson);
    if (!lesson) notFound();
    redirect(`/admin/day/attendance?course=${lesson.courseId}&group=${lesson.groupIndex}&from=${lesson.date}`);
  }
  if (!params.course || !UUID.test(params.course)) notFound();
  const group = Math.max(1, Math.min(9, Number(params.group) || 1));
  const sheet = await attendanceSheet(params.course, group, params.from && DAY.test(params.from) ? params.from : null, berlinDay(new Date()));
  if (!sheet) notFound();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader
        backHref={`/admin/catalogue/courses/${sheet.courseId}${group > 1 ? `/${group}` : ''}`}
        backLabel={t(`Kurs ${sheet.label}`, `Course ${sheet.label}`)}
        title={t(`Anwesenheitsliste ${sheet.label}`, `Attendance sheet ${sheet.label}`)}
      />
      <AttendanceSheetView sheet={sheet} />
    </>
  );
}
