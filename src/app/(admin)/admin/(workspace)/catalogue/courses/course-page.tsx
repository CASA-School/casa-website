import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { applyPlanAction, generateDaysAction } from './actions';
import { DayForm, WeekPlanForm } from './day-forms';
import { findCourseLearnersAction } from '../actions';
import { CourseActions, CourseActionsProvider } from '../course-actions';
import { courseHref } from '../course-href';
import { viewOf, WeekBars } from '../course-list';
import { toEditable } from '../editable';
import { PersonForm } from '../../people/person-form';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { PersonPicker } from '@/components/admin/person-picker';
import { dayRange } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, Button, Card, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import type { StaffUser } from '@/lib/admin/auth';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import { courseDayChoices, courseInfo, hours, listCourseDays, weekPlans, type CourseDay, type WeekPlanRow } from '@/lib/admin/course-days';
import { courseListRow, nextJoinMonday } from '@/lib/admin/course-list';
import { roomChoice } from '@/lib/admin/course-starts';
import { courseForEdit, courseLearners } from '@/lib/admin/courses';
import { num, pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listCountries } from '@/lib/admin/people';
import { ABSENCE_LABELS, isAbsenceReason } from '@/lib/admin/kursplanung/types';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { listBookableRooms } from '@/lib/admin/rooms';
import { todayInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

/**
 * One course number's page (2026-10-17, migrations 0041, 0045, 0050; docs/ADMIN_WORKSPACE.md §Lesson
 * days). Rahman: „each course its own page, even of the same level" — a level's parallel groups are
 * courses of their own in SchoolMan (4775, 5054, 5055), each with its room, teachers, lesson days and
 * learners, so each has its own address (`courseHref`) and names the others of its level in its head.
 * The head says what the team reads on SchoolMan's course list — learners now against the places and
 * week by week, the main teachers, the room, the week it is in, who waits, open or closed — and holds
 * the list's „Aktionen". The lesson days open at this week, the weeks gone folded; the weekly plan
 * reads as sentences and is changed in its dialog; the learners are SchoolMan's per week and those
 * booked here by name.
 */
export async function CoursePage({
  id,
  group,
  user,
  tab,
  error,
  book,
}: {
  id: string;
  group: number;
  user: StaffUser;
  tab?: string;
  error?: string;
  book?: string;
}) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const course = await courseInfo(id);
  if (!course) notFound();
  const { t, lang } = await getI18n();
  const today = todayInputValue();

  const mayTeach = canAccess(user, 'kursplanung', 'edit');
  const mayPlan = canAccess(user, 'rooms', 'edit');
  const [days, plans, choices, row, edit, rooms] = await Promise.all([
    listCourseDays(id),
    weekPlans(course),
    mayTeach || mayPlan ? courseDayChoices(id) : Promise.resolve({ teachers: [], rooms: [], taken: new Map(), away: new Map() }),
    courseListRow(id, today),
    mayPlan ? courseForEdit(id) : Promise.resolve(null),
    mayPlan ? listBookableRooms() : Promise.resolve([]),
  ]);
  if (!row) notFound();
  // The groups as the list shows them (an empty begun group left out); a number that is not one of
  // them goes to the course's first. Index 0 is a course SchoolMan has not split: all its days.
  const groups = row.groupRows;
  const here = groups.find((g) => g.index === group) ?? (group === 1 && groups.length === 1 && groups[0].index <= 1 ? groups[0] : undefined);
  if (!here) redirect(courseHref(id, groups[0]?.index || 1));
  const groupIndex = here.index || 1;
  // The names of this number's learners (a group of a split course: its own, and those booked here).
  const learners = canAccess(user, 'bookings') ? await courseLearners(id, groups.length > 1 && here.index > 0 ? here.index : undefined) : [];
  const shown = here.index === 0 ? days : days.filter((d) => d.groupIndex === groupIndex);
  const plan = plans.find((p) => p.groupIndex === groupIndex);
  const held = shown.filter((d) => !d.cancelled);
  const lessons = held.reduce((n, d) => n + (d.lessons ?? 0), 0);
  // Days ahead still waiting for a teacher — none set, or the one set is away that day: what staff act on.
  const open = held.filter((d) => (!d.teacherId || d.teacherAway) && !d.merged && d.date >= today).length;
  // This number's learners; where its own are not known (bookings made here name no group), the course's.
  const own = here.now !== null;
  const learnersNow = here.now ?? row.now;
  const places = own ? here.places : row.places;
  const weeks = own && here.weeks.length ? here.weeks : row.weeks;
  const waiting = row.waiting + row.offered;
  const number = here.number ?? (groups.length > 1 ? `#${here.index}` : null);
  const siblings = groups.filter((g) => g.index !== here.index);

  const startHref = `/admin/catalogue/${course.courseInstanceId}`;
  const view = viewOf(row);
  const back = new URLSearchParams({ ...(view !== 'intensive' ? { view } : {}), ...(row.phase === 'past' ? { time: 'past' } : {}) });
  // „Buchen" (also from the course list, `?book=1`): who, then their wizard at this course — from the
  // next Monday when it already runs, as a joiner is booked.
  const canBook = canAccess(user, 'bookings', 'edit') && canAccess(user, 'people') && !course.cancelled && course.endDate >= today;
  const running = course.startDate <= today;
  const joinFrom = running ? nextJoinMonday(today) : null;
  const joinDay = joinFrom ? new Date(`${joinFrom}T12:00:00`).toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const bookQuery = new URLSearchParams({
    book: '1',
    cohort: course.courseInstanceId,
    ...(course.levelCode ? { level: course.levelCode } : {}),
    ...(joinFrom ? { from: joinFrom } : {}),
  }).toString();
  const countries = canBook && canAccess(user, 'people', 'edit') ? await listCountries() : null;
  const title = `${course.typeName} ${course.label}${number ? ` · ${number}` : ''}`;
  const where = row.notHeld
    ? null
    : row.phase === 'running' && row.week
      ? t(`Woche ${row.week} von ${row.weeks.length}`, `Week ${row.week} of ${row.weeks.length}`)
      : row.phase === 'past'
        ? t('Beendet', 'Ended')
        : null;

  const tabs: RecordTab[] = [
    { id: 'days', label: t('Kurstage', 'Lesson days'), icon: Icon.calendar, count: shown.length },
    { id: 'plan', label: t('Wochenplan', 'Weekly plan'), icon: Icon.clock },
    ...(canAccess(user, 'bookings') ? [{ id: 'learners', label: t('Teilnehmende', 'Learners'), icon: Icon.people, count: learnersNow }] : []),
  ];

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref={`/admin/catalogue${back.size ? `?${back}` : ''}`}
        backLabel={t('Kurse', 'Courses')}
        title={title}
        status={
          course.cancelled ? (
            <Badge tone="danger">{t('Abgesagt', 'Cancelled')}</Badge>
          ) : row.notHeld ? (
            <Badge tone="warning">{t('Nicht zustande gekommen', 'Did not take place')}</Badge>
          ) : null
        }
        subtitle={
          <>
            <MetaLine>
              <MetaItem icon={Icon.calendar}>
                <Link href={startHref} className="hover:text-[var(--casa-ink)] hover:underline">
                  {dayRange(course.startDate, course.endDate, lang)}
                </Link>
                {where ? <b className="font-semibold text-[var(--casa-ink)]"> · {where}</b> : null}
              </MetaItem>
              {course.session || course.time ? (
                <MetaItem icon={Icon.clock}>
                  {[course.session ? pick(lang, SESSION_LABELS[course.session]) : null, dayList(course.days, lang), course.time?.replace('-', '–')].filter(Boolean).join(' · ')}
                </MetaItem>
              ) : null}
            </MetaLine>
            {siblings.length ? (
              <span className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[0.8rem] text-[var(--casa-muted)]">
                <span>{t(`Weitere Kurse ${course.label}`, `Other ${course.label} courses`)}</span>
                {siblings.map((s) => (
                  <Link
                    key={s.index}
                    href={courseHref(id, s.index)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ws-line bg-white px-2 py-0.5 font-semibold text-[var(--casa-ink)] tabular-nums hover:border-ws-line-firm"
                  >
                    {s.number ?? `#${s.index}`}
                    {s.now !== null ? (
                      <span className="font-normal text-[var(--casa-muted)]">
                        {num(lang, s.now)}/{num(lang, s.places)}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <CourseActionsProvider
              courses={[toEditable(row, edit ?? undefined, t, lang)]}
              rooms={rooms.filter((r) => r.kind === 'classroom').map((r) => ({ id: r.id, name: roomChoice(r) }))}
              canPlan={mayPlan}
              canBook={false}
            >
              <CourseActions courseId={id} here kursplanung={course.intensive && canAccess(user, 'kursplanung')} />
            </CourseActionsProvider>
            {canBook ? (
              <FormDialog
                trigger={t('Buchen', 'Book')}
                title={t('Wen buchen?', 'Who to book?')}
                description={`${course.typeName} ${course.label}${joinFrom ? t(` · Einstieg ab ${joinDay}`, ` · joining from ${joinDay}`) : ''}`}
                icon={Icon.bookings}
                tint="red"
                triggerVariant="primary"
                defaultOpen={book === '1'}
              >
                <PersonPicker
                  search={findCourseLearnersAction.bind(null, id)}
                  bookQuery={bookQuery}
                  alreadyLabel={t('Schon im Kurs', 'Already in it')}
                  newPerson={
                    countries ? (
                      <PersonForm
                        countries={countries}
                        hidden={{ then: 'book', cohort: course.courseInstanceId, ...(course.levelCode ? { level: course.levelCode } : {}), ...(joinFrom ? { from: joinFrom } : {}) }}
                        submitLabel={t('Weiter zur Buchung', 'On to the booking')}
                      />
                    ) : null
                  }
                />
              </FormDialog>
            ) : null}
          </>
        }
        bar={
          <StatBar>
            <Stat label={t('Teilnehmende', 'Learners')}>
              <span className="flex items-center gap-3">
                <span>
                  <span className={learnersNow > places ? 'text-[#9a5b00]' : undefined}>{num(lang, learnersNow)}</span>
                  <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, places)}</span>
                </span>
                <WeekBars weeks={weeks} week={row.week} places={places} today={today} t={t} />
              </span>
            </Stat>
            <Stat label={t('Lehrkräfte', 'Teachers')}>{here.teachers.length ? here.teachers.join(' · ') : <Dash />}</Stat>
            <Stat label={t('Raum', 'Room')}>{here.room ?? <Dash />}</Stat>
            <Stat label={t('Kurstage', 'Lesson days')}>
              {num(lang, held.length)}
              <span className="text-[0.78rem] font-semibold text-[var(--casa-muted)]"> · {t(`${num(lang, lessons)} UE`, `${num(lang, lessons)} lessons`)}</span>
            </Stat>
            {waiting ? (
              <Stat label={t('Warteliste', 'Waiting list')}>
                <Link href={`${startHref}?level=${encodeURIComponent(course.levelCode ?? id)}`} className="text-[#075985] hover:underline">
                  {t(`${num(lang, waiting)} warten`, `${num(lang, waiting)} waiting`)}
                </Link>
              </Stat>
            ) : null}
            <Stat label={t('Buchung', 'Booking')}>
              {course.bookable ? <span className="text-[#17693a]">{t('Offen', 'Open')}</span> : <span className="text-[var(--casa-muted)]">{t('Geschlossen', 'Closed')}</span>}
            </Stat>
            {open ? (
              <Stat label={t('Ohne Lehrkraft', 'No teacher')}>
                <span className="text-[#9a5b00]">{num(lang, open)}</span>
              </Stat>
            ) : null}
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${title}: Bereiche`, `${title}: sections`)} />}
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <RecordTabPanel id="days">
        <Card
          title={t('Kurstage', 'Lesson days')}
          icon={Icon.calendar}
          tint="sun"
          bleed
          actions={
            mayPlan && plan?.rows.length ? (
              <form action={generateDaysAction}>
                <input type="hidden" name="courseId" value={id} />
                <input type="hidden" name="groupIndex" value={groupIndex} />
                <Button type="submit" size="sm" variant={shown.length ? 'ghost' : 'primary'}>
                  {shown.length ? t('Fehlende Tage erzeugen', 'Add missing days') : t('Kurstage erzeugen', 'Make the lesson days')}
                </Button>
              </form>
            ) : undefined
          }
        >
          {shown.length ? (
            <DayTable days={shown} courseId={id} startDate={course.startDate} choices={choices} mayTeach={mayTeach} mayPlan={mayPlan} today={today} t={t} lang={lang} />
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">
              {plan?.rows.length ? t('Noch keine Kurstage.', 'No lesson days yet.') : t('Noch kein Wochenplan.', 'No weekly plan yet.')}
            </p>
          )}
        </Card>
      </RecordTabPanel>

      <RecordTabPanel id="plan">
        <Card
          title={t('Wochenplan', 'Weekly plan')}
          icon={Icon.clock}
          tint="blue"
          bleed
          actions={
            <span className="flex items-center gap-1">
              {plan?.rows.length && shown.length && mayTeach ? (
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
              {plan?.rows.length && shown.length && mayPlan ? (
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
              {plan && mayPlan ? (
                <FormDialog
                  trigger={plan.rows.length ? t('Bearbeiten', 'Edit') : t('Wochenplan anlegen', 'Set up the plan')}
                  title={t('Wochenplan', 'Weekly plan')}
                  description={title}
                  icon={Icon.clock}
                  tint="blue"
                  width="xl"
                  size="sm"
                  triggerVariant={plan.rows.length ? 'secondary' : 'primary'}
                >
                  <WeekPlanForm courseId={id} plan={plan} teachers={choices.teachers} rooms={choices.rooms} mayTeach={mayTeach} />
                </FormDialog>
              ) : null}
            </span>
          }
        >
          {plan?.rows.length ? (
            <PlanSummary rows={plan.rows} t={t} lang={lang} />
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch kein Wochenplan.', 'No weekly plan yet.')}</p>
          )}
        </Card>
      </RecordTabPanel>

      {canAccess(user, 'bookings') ? (
        <RecordTabPanel id="learners">
          <div className="space-y-4">
            <Card title={t('Teilnehmende je Woche', 'Learners per week')} icon={Icon.people} tint="blue" bleed>
              {weeks.length ? (
                <LearnerWeeks weeks={weeks} week={row.week} places={places} today={today} t={t} lang={lang} />
              ) : (
                <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch keine Teilnehmenden.', 'No learners yet.')}</p>
              )}
            </Card>
            <Card
              title={
                <>
                  {t('Buchungen', 'Bookings')}
                  {learners.length ? <span className="ml-2 text-[0.8rem] font-semibold text-[var(--casa-muted)] tabular-nums">{num(lang, learners.length)}</span> : null}
                </>
              }
              icon={Icon.bookings}
              tint="red"
              bleed
            >
              {learners.length ? (
                <ul className="divide-y divide-ws-line-soft">
                  {/* Those in the course now or still to come first; whose period has ended, after them and quiet. */}
                  {[...learners].sort((a, b) => Number(a.endDate < today) - Number(b.endDate < today)).map((l) => (
                    <li key={`${l.bookingId}${l.startDate}`}>
                      <Link
                        href={`/admin/bookings/${l.bookingId}`}
                        className={cn('flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.86rem] hover:bg-[var(--ws-row-hover)]', l.endDate < today && 'opacity-60')}
                      >
                        <span className="font-semibold text-[var(--casa-ink)]">{l.name}</span>
                        <span className="text-[var(--casa-muted)] tabular-nums">{[l.levelCode, dayRange(l.startDate, l.endDate, lang)].filter(Boolean).join(' · ')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch keine Buchung.', 'No booking yet.')}</p>
              )}
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}
    </RecordTabs>
  );
}

const Dash = () => <span className="font-semibold text-[var(--casa-text-subtle)]">—</span>;

/** An absence's reason as stored (`Krank`), in the reader's language. */
const absenceWord = (reason: string, lang: WsLang) => (isAbsenceReason(reason) ? pick(lang, ABSENCE_LABELS[reason]) : null);

const WEEKDAY_SHORT = { de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
const weekdayName = (n: number, lang: WsLang) => WEEKDAY_SHORT[lang][n - 1];
const SCHEDULE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A start's days as „Mo–Fr" or „Di + Do". */
function dayList(days: readonly string[], lang: WsLang): string | null {
  const n = days.map((d) => SCHEDULE_DAYS.indexOf(d) + 1).filter((d) => d > 0).sort((a, b) => a - b);
  return n.length ? weekdayRun(n, lang) : null;
}

/** Weekdays (1 Monday … 7 Sunday) as a run „Mo–Mi" when they follow each other, else „Mo + Mi". */
function weekdayRun(n: number[], lang: WsLang): string {
  const consecutive = n.every((d, i) => i === 0 || d === n[i - 1] + 1);
  return consecutive && n.length > 2 ? `${weekdayName(n[0], lang)}–${weekdayName(n[n.length - 1], lang)}` : n.map((d) => weekdayName(d, lang)).join(' + ');
}

/** The Monday of the week a day falls in. */
function mondayOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * The weekly plan read as sentences: the days that follow each other with the same hours, teacher and
 * room together — „Mo–Mi · 08:45–12:15 · Mikis Weber · Heidelberg".
 */
function PlanSummary({ rows, t, lang }: { rows: WeekPlanRow[]; t: T; lang: WsLang }) {
  const sorted = [...rows].sort((a, b) => a.weekday - b.weekday);
  const runs: WeekPlanRow[][] = [];
  for (const r of sorted) {
    const last = runs[runs.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && prev.weekday + 1 === r.weekday && prev.startsAt === r.startsAt && prev.endsAt === r.endsAt && prev.lessons === r.lessons && prev.teacherId === r.teacherId && prev.roomId === r.roomId) last.push(r);
    else runs.push([r]);
  }
  const perWeek = sorted.reduce((n, r) => n + r.lessons, 0);
  return (
    <>
      <ul className="divide-y divide-ws-line-soft text-[0.88rem]">
        {runs.map((run) => {
          const r = run[0];
          return (
            <li key={r.weekday} className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[5.5rem_9rem_1fr_12rem]">
              <span className="font-bold text-[var(--casa-ink)]">{weekdayRun(run.map((x) => x.weekday), lang)}</span>
              <span className="text-[var(--casa-muted)] tabular-nums">
                {r.startsAt}–{r.endsAt}
                <span className="text-[0.78rem]"> · {t(`${num(lang, r.lessons)} UE`, `${num(lang, r.lessons)} lessons`)}</span>
              </span>
              <span className="max-sm:col-start-2">{r.teacherName ?? <span className="font-semibold text-[#9a5b00]">{t('Lehrkraft noch offen', 'Teacher not yet set')}</span>}</span>
              <span className="text-[#2b3546] max-sm:col-start-2">{r.roomName ?? <span className="text-[var(--casa-muted)]">{t('Raum noch offen', 'Room not yet set')}</span>}</span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-ws-line-soft px-5 py-2.5 text-[0.78rem] text-[var(--casa-muted)] tabular-nums">{t(`${num(lang, perWeek)} UE pro Woche`, `${num(lang, perWeek)} lessons a week`)}</p>
    </>
  );
}

/** The learners week by week against the places: this week in ink, the weeks gone grey-blue, those ahead pale. */
function LearnerWeeks({ weeks, week, places, today, t, lang }: { weeks: { monday: string; n: number }[]; week: number | null; places: number; today: string; t: T; lang: WsLang }) {
  const H = 96;
  const room = H - 18;
  const top = Math.max(places, ...weeks.map((w) => w.n), 1);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max px-5 pt-5 pb-4">
        <div className="relative flex items-end gap-1.5" style={{ height: H }} role="img" aria-label={t('Teilnehmende je Woche', 'Learners per week')}>
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#b8c4d4]" style={{ bottom: Math.round((room * places) / top) }} />
          {weeks.map((w, i) => {
            const current = week === i + 1;
            const gone = !current && w.monday < today;
            return (
              <span key={w.monday} className="relative flex h-full w-9 flex-col items-center justify-end">
                <span className={cn('mb-1 text-[0.72rem] tabular-nums', current ? 'font-bold text-[var(--casa-ink)]' : 'font-semibold text-[var(--casa-muted)]', w.n > places && 'text-[#9a5b00]')}>{w.n}</span>
                <span
                  className={cn('w-6 rounded-t-[3px]', current ? 'bg-[var(--casa-ink-deep)]' : gone ? 'bg-[#9fb3cc]' : 'bg-[#d5deea]')}
                  style={{ height: Math.max(2, Math.round((room * w.n) / top)) }}
                />
              </span>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5 border-t border-ws-line pt-1.5">
          {weeks.map((w, i) => (
            <span key={w.monday} className={cn('w-9 text-center text-[0.68rem] tabular-nums', week === i + 1 ? 'font-bold text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]')}>
              {t(`KW ${isoWeek(w.monday)}`, `W${isoWeek(w.monday)}`)}
            </span>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-[0.74rem] text-[var(--casa-muted)]">
          <span aria-hidden="true" className="inline-block w-5 border-t border-dashed border-[#8a9ab0]" />
          {t(`${num(lang, places)} Plätze`, `${num(lang, places)} places`)}
        </p>
      </div>
    </div>
  );
}

const COLS = (
  <colgroup>
    <col className="w-[9.5rem]" />
    <col className="w-[7.5rem]" />
    <col className="w-[3.5rem]" />
    <col />
    <col className="w-[12rem]" />
    <col className="w-[6.5rem]" />
  </colgroup>
);

/**
 * The days week by week: date, hours, lessons, teacher, room, and what changed on the day. It opens at
 * this week; the weeks gone sit folded above it.
 */
function DayTable({
  days,
  courseId,
  startDate,
  choices,
  mayTeach,
  mayPlan,
  today,
  t,
  lang,
}: {
  days: CourseDay[];
  courseId: string;
  startDate: string;
  choices: Awaited<ReturnType<typeof courseDayChoices>>;
  mayTeach: boolean;
  mayPlan: boolean;
  today: string;
  t: T;
  lang: WsLang;
}) {
  const weeks = new Map<string, CourseDay[]>();
  for (const d of days) {
    const monday = mondayOf(d.date);
    weeks.set(monday, [...(weeks.get(monday) ?? []), d]);
  }
  const thisMonday = mondayOf(today);
  const all = [...weeks.entries()];
  const ahead = all.filter(([monday]) => monday >= thisMonday);
  // Folded only while there is a week to open at: a course that has ended shows all of it.
  const gone = ahead.length ? all.filter(([monday]) => monday < thisMonday) : [];
  const shown = ahead.length ? ahead : all;
  const first = mondayOf(startDate);
  const courseWeek = (monday: string) => Math.round((Date.parse(monday) - Date.parse(first)) / (7 * 86_400_000)) + 1;
  const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: '2-digit', month: '2-digit' });
  const table = 'w-full min-w-[46rem] table-fixed text-left text-[0.86rem]';

  const rows = (list: [string, CourseDay[]][]) =>
    list.flatMap(([monday, list]) => [
      <tr key={`kw-${monday}`} className="bg-ws-sunk/60">
        <td colSpan={6} className="px-5 py-1.5 text-[0.74rem] font-bold text-[var(--casa-muted)]">
          {t(`KW ${isoWeek(monday)}`, `Week ${isoWeek(monday)}`)}
          <span className="font-semibold"> · {t(`Woche ${courseWeek(monday)}`, `course week ${courseWeek(monday)}`)}</span>
          {monday === thisMonday ? <span className="ml-2 rounded-full bg-[var(--casa-ink-deep)] px-1.5 py-px text-[0.66rem] font-semibold text-white">{t('Diese Woche', 'This week')}</span> : null}
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
                <span className={d.teacherAway ? 'text-[var(--casa-muted)]' : undefined}>{d.teacherName}</span>
                {d.teacherAway ? (
                  <Badge tone="danger">
                    {t('abwesend', 'absent')}
                    {absenceWord(d.teacherAway, lang) ? ` · ${absenceWord(d.teacherAway, lang)}` : ''}
                  </Badge>
                ) : null}
                {d.substitute ? <Badge tone="warning">{d.replacedTeacherName ? t(`für ${d.replacedTeacherName}`, `for ${d.replacedTeacherName}`) : t('Vertretung', 'Cover')}</Badge> : null}
                {d.tentative ? <Badge tone="quiet">?</Badge> : null}
                {d.merged ? <Badge tone="quiet">{t('zusammengelegt', 'merged')}</Badge> : null}
              </span>
            ) : d.merged ? (
              <span className="text-[var(--casa-muted)]">{t('Mit einer anderen Gruppe zusammengelegt', 'Merged with another group')}</span>
            ) : d.date < today ? (
              <span className="text-[var(--casa-text-subtle)]">—</span>
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
    ]);

  return (
    <div className="overflow-x-auto">
      <table className={table}>
        {COLS}
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
      </table>
      {gone.length ? (
        <details className="group/past min-w-[46rem] border-b border-ws-line-soft">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-2 text-[0.8rem] font-semibold text-[var(--casa-muted)] select-none hover:bg-[var(--ws-row-hover)] hover:text-[var(--casa-ink)] [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="inline-flex transition-transform group-open/past:rotate-90 [&_svg]:size-3.5">
              {Icon.chevronRight}
            </span>
            {t(`Vergangene Wochen (${gone.length})`, `Past weeks (${gone.length})`)}
          </summary>
          <table className={table}>
            {COLS}
            <tbody>{rows(gone)}</tbody>
          </table>
        </details>
      ) : null}
      <table className={table}>
        {COLS}
        <tbody>{rows(shown)}</tbody>
      </table>
    </div>
  );
}
