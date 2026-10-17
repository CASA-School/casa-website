import Link from 'next/link';
import { notFound } from 'next/navigation';

import { applyPlanAction, generateDaysAction } from '../actions';
import { DayForm, WeekPlanForm } from '../day-forms';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, Button, Card, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import { courseDayChoices, courseInfo, hours, listCourseDays, weekPlans, type CourseDay } from '@/lib/admin/course-days';
import { courseLearners } from '@/lib/admin/courses';
import { requireModule } from '@/lib/admin/guard';
import { num, pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { courseGroup } from '@/lib/admin/waitlist';
import { cn } from '@/lib/utils';

/**
 * One course (2026-10-17, migrations 0041, 0045; docs/ADMIN_WORKSPACE.md §Lesson days), as SchoolMan's
 * course page has it: its lesson days — each day's hours, lessons, teacher and room, who was replaced, a
 * day called off — its weekly plan they are made from, and the learners on it. A day is changed in its
 * dialog; the plan's teacher or room goes onto every day ahead in one step. The intensive courses' days
 * are the ones Kursplanung's board plans.
 */
export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; group?: string; error?: string }> }) {
  const [{ id }, { tab, group, error }, user] = await Promise.all([params, searchParams, requireModule('catalogue')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const course = await courseInfo(id);
  if (!course) notFound();
  const { t, lang } = await getI18n();

  const mayTeach = canAccess(user, 'kursplanung', 'edit');
  const mayPlan = canAccess(user, 'rooms', 'edit');
  const [days, plans, choices, learners, places] = await Promise.all([
    listCourseDays(id),
    weekPlans(course),
    mayTeach || mayPlan ? courseDayChoices(id) : Promise.resolve({ teachers: [], rooms: [], taken: new Map(), away: new Map() }),
    canAccess(user, 'bookings') ? courseLearners(id) : Promise.resolve([]),
    courseGroup(id),
  ]);
  const groupIndex = Math.min(Math.max(Number(group) || 1, 1), course.groups);
  const shown = days.filter((d) => d.groupIndex === groupIndex);
  const plan = plans.find((p) => p.groupIndex === groupIndex);
  const held = shown.filter((d) => !d.cancelled);
  const lessons = held.reduce((n, d) => n + (d.lessons ?? 0), 0);
  const teachers = [...new Set(held.map((d) => d.teacherName).filter(Boolean))];
  const open = held.filter((d) => !d.teacherId).length;
  const today = new Date().toISOString().slice(0, 10);
  const startHref = `/admin/catalogue/${course.courseInstanceId}`;

  const tabs: RecordTab[] = [
    { id: 'days', label: t('Kurstage', 'Lesson days'), icon: Icon.calendar, count: shown.length },
    { id: 'plan', label: t('Wochenplan', 'Weekly plan'), icon: Icon.clock },
    ...(canAccess(user, 'bookings') ? [{ id: 'learners', label: t('Teilnehmende', 'Learners'), icon: Icon.people, count: learners.length }] : []),
  ];
  const groupLinks =
    course.groups > 1 ? (
      <div className="mb-3 flex flex-wrap gap-1.5">
        {Array.from({ length: course.groups }, (_, i) => i + 1).map((g) => (
          <Link
            key={g}
            href={`/admin/catalogue/courses/${id}${g > 1 ? `?group=${g}` : ''}`}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-semibold',
              g === groupIndex ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white' : 'border-ws-line bg-white hover:border-ws-line-firm'
            )}
          >
            {t(`Gruppe ${g}`, `Group ${g}`)}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref={`${startHref}?level=${encodeURIComponent(course.levelCode ?? id)}`}
        backLabel={t('Kurstermin', 'Course start')}
        title={`${course.typeName} ${course.label}`}
        status={
          <>
            {course.cancelled ? <Badge tone="danger">{t('Abgesagt', 'Cancelled')}</Badge> : null}
            {!course.bookable && !course.cancelled ? <Badge tone="quiet">{t('Nicht buchbar', 'Not bookable')}</Badge> : null}
          </>
        }
        subtitle={
          <MetaLine>
            <MetaItem icon={Icon.calendar}>{dayRange(course.startDate, course.endDate, lang)}</MetaItem>
            {course.session || course.time ? (
              <MetaItem icon={Icon.clock}>{[course.session ? pick(lang, SESSION_LABELS[course.session]) : null, course.time].filter(Boolean).join(' · ')}</MetaItem>
            ) : null}
            {course.roomName ? <MetaItem icon={Icon.rooms}>{course.roomName}</MetaItem> : null}
          </MetaLine>
        }
        actions={
          course.intensive && canAccess(user, 'kursplanung') ? (
            <Link href="/admin/kursplanung" className="inline-flex h-9 items-center rounded-xl border border-ws-line bg-white px-3.5 text-[0.84rem] font-semibold text-[var(--casa-ink)] hover:border-ws-line-firm">
              {t('Kursplanung', 'Kursplanung')}
            </Link>
          ) : null
        }
        bar={
          <StatBar>
            {places ? (
              <Stat label={t('Gebucht', 'Booked')}>
                {num(lang, places.booked)}
                <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, places.places)}</span>
              </Stat>
            ) : null}
            <Stat label={t('Kurstage', 'Lesson days')}>
              {num(lang, held.length)}
              <span className="text-[0.78rem] font-semibold text-[var(--casa-muted)]"> · {t(`${num(lang, lessons)} UE`, `${num(lang, lessons)} lessons`)}</span>
            </Stat>
            <Stat label={t('Lehrkräfte', 'Teachers')}>{teachers.length ? num(lang, teachers.length) : <span className="font-semibold text-[var(--casa-muted)]">—</span>}</Stat>
            {open ? (
              <Stat label={t('Ohne Lehrkraft', 'No teacher')}>
                <span className="text-[#9a5b00]">{num(lang, open)}</span>
              </Stat>
            ) : null}
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${course.label}: Bereiche`, `${course.label}: sections`)} />}
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <RecordTabPanel id="days">
        {groupLinks}
        <Card
          title={t('Kurstage', 'Lesson days')}
          icon={Icon.calendar}
          tint="sun"
          bleed
          actions={
            mayPlan && plan?.rows.length ? (
              <form action={generateDaysAction}>
                <input type="hidden" name="courseId" value={id} />
                <Button type="submit" size="sm" variant={shown.length ? 'ghost' : 'primary'}>
                  {shown.length ? t('Fehlende Tage erzeugen', 'Add missing days') : t('Kurstage erzeugen', 'Make the lesson days')}
                </Button>
              </form>
            ) : undefined
          }
        >
          {shown.length ? (
            <DayTable days={shown} courseId={id} choices={choices} mayTeach={mayTeach} mayPlan={mayPlan} today={today} t={t} lang={lang} />
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">
              {plan?.rows.length ? t('Noch keine Kurstage.', 'No lesson days yet.') : t('Noch kein Wochenplan.', 'No weekly plan yet.')}
            </p>
          )}
        </Card>
      </RecordTabPanel>

      <RecordTabPanel id="plan">
        {groupLinks}
        <Card
          title={t('Wochenplan', 'Weekly plan')}
          icon={Icon.clock}
          tint="blue"
          actions={
            plan?.rows.length && shown.length ? (
              <span className="flex items-center gap-1">
                {mayTeach ? (
                  <form action={applyPlanAction}>
                    <input type="hidden" name="courseId" value={id} />
                    <input type="hidden" name="groupIndex" value={groupIndex} />
                    <input type="hidden" name="what" value="teacher" />
                    <ConfirmSubmit
                      title={t('Die Lehrkräfte des Plans auf alle kommenden Tage?', 'The plan’s teachers on every day ahead?')}
                      description={t('Was an einzelnen Tagen geändert wurde, wird überschrieben.', 'What was changed on single days is overwritten.')}
                      confirmLabel={t('Übernehmen', 'Apply')}
                      variant="ghost"
                    >
                      {t('Lehrkräfte übernehmen', 'Apply teachers')}
                    </ConfirmSubmit>
                  </form>
                ) : null}
                {mayPlan ? (
                  <form action={applyPlanAction}>
                    <input type="hidden" name="courseId" value={id} />
                    <input type="hidden" name="groupIndex" value={groupIndex} />
                    <input type="hidden" name="what" value="room" />
                    <ConfirmSubmit
                      title={t('Die Räume des Plans auf alle kommenden Tage?', 'The plan’s rooms on every day ahead?')}
                      description={t('Was an einzelnen Tagen geändert wurde, wird überschrieben.', 'What was changed on single days is overwritten.')}
                      confirmLabel={t('Übernehmen', 'Apply')}
                      variant="ghost"
                    >
                      {t('Räume übernehmen', 'Apply rooms')}
                    </ConfirmSubmit>
                  </form>
                ) : null}
              </span>
            ) : undefined
          }
        >
          {plan && mayPlan ? (
            <WeekPlanForm courseId={id} plan={plan} teachers={choices.teachers} rooms={choices.rooms} mayTeach={mayTeach} />
          ) : plan?.rows.length ? (
            <ul className="-my-1 divide-y divide-ws-line-soft text-sm">
              {plan.rows.map((r) => (
                <li key={r.weekday} className="flex justify-between gap-3 py-2">
                  <span className="font-semibold">{weekdayName(r.weekday, lang)}</span>
                  <span className="text-[var(--casa-muted)] tabular-nums">
                    {r.startsAt}–{r.endsAt} · {t(`${num(lang, r.lessons)} UE`, `${num(lang, r.lessons)} lessons`)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--casa-muted)]">{t('Noch kein Wochenplan.', 'No weekly plan yet.')}</p>
          )}
        </Card>
      </RecordTabPanel>

      {canAccess(user, 'bookings') ? (
        <RecordTabPanel id="learners">
          <Card title={t('Teilnehmende', 'Learners')} icon={Icon.people} tint="blue" bleed>
            {learners.length ? (
              <ul className="divide-y divide-ws-line-soft">
                {learners.map((l) => (
                  <li key={`${l.bookingId}${l.startDate}`}>
                    <Link href={`/admin/bookings/${l.bookingId}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
                      <span className="font-semibold text-[var(--casa-ink)]">{l.name}</span>
                      <span className="text-[var(--casa-muted)] tabular-nums">
                        {[l.levelCode, dayRange(l.startDate, l.endDate, lang)].filter(Boolean).join(' · ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('In diesem Kurs ist noch niemand gebucht.', 'Nobody is booked into this course yet.')}</p>
            )}
          </Card>
        </RecordTabPanel>
      ) : null}
    </RecordTabs>
  );
}

const WEEKDAY_SHORT = { de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
const weekdayName = (n: number, lang: WsLang) => WEEKDAY_SHORT[lang][n - 1];

/** The days week by week: date, hours, lessons, teacher, room, and what changed on the day. */
function DayTable({
  days,
  courseId,
  choices,
  mayTeach,
  mayPlan,
  today,
  t,
  lang,
}: {
  days: CourseDay[];
  courseId: string;
  choices: Awaited<ReturnType<typeof courseDayChoices>>;
  mayTeach: boolean;
  mayPlan: boolean;
  today: string;
  t: T;
  lang: WsLang;
}) {
  const weeks = new Map<number, CourseDay[]>();
  for (const d of days) {
    const kw = isoWeek(d.date);
    weeks.set(kw, [...(weeks.get(kw) ?? []), d]);
  }
  const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: '2-digit', month: '2-digit' });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] text-left text-[0.86rem]">
        <thead>
          <tr className="border-b border-ws-line text-xs text-[var(--casa-muted)]">
            <th className="px-5 py-2 font-semibold">{t('Tag', 'Day')}</th>
            <th className="px-2 py-2 font-semibold">{t('Zeit', 'Time')}</th>
            <th className="px-2 py-2 text-right font-semibold">{t('UE', 'Lessons')}</th>
            <th className="px-3 py-2 font-semibold">{t('Lehrkraft', 'Teacher')}</th>
            <th className="px-3 py-2 font-semibold">{t('Raum', 'Room')}</th>
            <th className="px-5 py-2" />
          </tr>
        </thead>
        <tbody>
          {[...weeks.entries()].flatMap(([kw, list]) => [
            <tr key={`kw-${kw}`} className="bg-ws-sunk/60">
              <td colSpan={6} className="px-5 py-1.5 text-[0.74rem] font-bold text-[var(--casa-muted)]">
                {t(`KW ${kw}`, `Week ${kw}`)}
              </td>
            </tr>,
            ...list.map((d) => (
              <tr key={d.id} className={cn('border-b border-ws-line-soft align-top', d.date < today && 'text-[var(--casa-muted)]', d.cancelled && 'bg-[#fbf3f3]')}>
                <td className="px-5 py-2 whitespace-nowrap tabular-nums">
                  <span className="mr-2 inline-block w-6 font-semibold">{weekdayName(((new Date(`${d.date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1, lang)}</span>
                  {date(d.date)}
                </td>
                <td className={cn('px-2 py-2 whitespace-nowrap tabular-nums', d.ownHours && 'font-semibold text-[var(--casa-ink)]')}>{hours(d) ?? '—'}</td>
                <td className="px-2 py-2 text-right tabular-nums">{d.lessons ?? '—'}</td>
                <td className="px-3 py-2">
                  {d.cancelled ? (
                    <span className="font-semibold text-[var(--casa-danger-text)]">
                      {t('Fällt aus', 'Called off')}
                      {d.cancelReason ? <span className="font-normal text-[var(--casa-muted)]"> · {d.cancelReason}</span> : null}
                    </span>
                  ) : d.teacherName ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      {d.teacherName}
                      {d.substitute ? <Badge tone="warning">{d.replacedTeacherName ? t(`für ${d.replacedTeacherName}`, `for ${d.replacedTeacherName}`) : t('Vertretung', 'Cover')}</Badge> : null}
                      {d.tentative ? <Badge tone="quiet">?</Badge> : null}
                    </span>
                  ) : (
                    <span className="font-semibold text-[#9a5b00]">{t('Noch offen', 'Not yet')}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {d.roomName ?? <span className="text-[var(--casa-text-subtle)]">—</span>}
                  {d.replacedRoomName ? <span className="block text-[0.76rem] text-[var(--casa-muted)]">{t(`statt ${d.replacedRoomName}`, `instead of ${d.replacedRoomName}`)}</span> : null}
                  {d.note ? <span className="block text-[0.76rem] text-[var(--casa-muted)]">{d.note}</span> : null}
                </td>
                <td className="px-5 py-1.5 text-right">
                  {(mayTeach || mayPlan) && d.date >= today ? (
                    <FormDialog trigger={t('Ändern', 'Change')} title={`${weekdayName(((new Date(`${d.date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1, lang)} ${date(d.date)}`} size="sm" triggerVariant="ghost">
                      <DayForm courseId={courseId} day={d} choices={choices} mayTeach={mayTeach} mayPlan={mayPlan} />
                    </FormDialog>
                  ) : null}
                </td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}
