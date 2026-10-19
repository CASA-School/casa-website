import { DayHeader, pickDay, weekOf } from '../day-header';
import { CoursesTable } from './courses-table';
import { dayLessons, openTasksByDay } from '@/lib/admin/day-plan';
import { canAccess } from '@/lib/admin/access';
import { berlinDay } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * The day's courses on a page of their own (2026-10-19): SchoolMan's RoomPlan and TeacherPlan — which
 * class, when, in which room, with whom, how many — as a table read by part of the day.
 */
export default async function DayCoursesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('day'), getI18n()]);
  const today = berlinDay(new Date());
  const day = pickDay(params.date, today);
  const week = weekOf(day);
  const [lessons, openByDay] = await Promise.all([dayLessons(day), openTasksByDay(week[0], week[6])]);
  return (
    <>
      <DayHeader view="courses" day={day} today={today} openByDay={openByDay} lessons={lessons.length} flats={canAccess(user, 'accommodation')} t={t} lang={lang} />
      <CoursesTable day={day} lessons={lessons} />
    </>
  );
}
