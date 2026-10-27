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
import { MoreInPanel } from '@/components/admin/more-in-panel';
import { RecordLink } from '@/components/admin/record-link';
import { PersonPicker } from '@/components/admin/person-picker';
import { dayRange } from '@/components/admin/list';
import { MetaItem, MetaLine, Stat, StatBar, Timeline } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, Button, ButtonLink, Card, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { listNotes } from '@/lib/admin/notes';
import { recordHrefFor } from '@/lib/admin/record-href';
import type { StaffUser } from '@/lib/admin/auth';
import { SESSION_LABELS } from '@/lib/admin/catalogue';
import { courseDayChoices, courseInfo, hours, listCourseDays, weekPlans, type CourseDay, type WeekPlanRow } from '@/lib/admin/course-days';
import { courseListRow, nextJoinMonday } from '@/lib/admin/course-list';
import { roomChoice } from '@/lib/admin/course-starts';
import { courseForEdit, courseLearners, type CourseLearner } from '@/lib/admin/courses';
import { num, pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listCountries } from '@/lib/admin/people';
import { ABSENCE_LABELS, isAbsenceReason } from '@/lib/admin/kursplanung/types';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { listBookableRooms } from '@/lib/admin/rooms';
import { SCHOOL_CLOSURES } from '@/config/school-closures';
import { todayInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { SessionMark } from '@/components/admin/session-mark';
import { sessionAt } from '@/lib/admin/day-plan-labels';

/**
 * One course number's page (2026-10-17, migrations 0041, 0045, 0050; docs/ADMIN_WORKSPACE.md §Lesson
 * days). Rahman: „each course its own page, even of the same level" — a level's parallel groups are
 * courses of their own in SchoolMan (4775, 5054, 5055), each with its room, teachers, lesson days and
 * learners, so each has its own address (`courseHref`) and names the others of its level in its head.
 * The head says what the team reads on SchoolMan's course list — learners now against the places and
 * week by week, the main teachers, the room, the week it is in, who waits, open or closed — and holds
 * the list's „Aktionen". The lesson days are a week grid (a day opens its dialog); the weekly plan
 * reads as sentences and is changed in its dialog; the learners are SchoolMan's per week and those
 * booked here by name, the ones whose period has ended at the side.
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
  // Its part of the day: stored, or read from its lesson time — an intensive half keeps none of its own.
  const session = course.session ?? sessionAt(course.time);
  const today = todayInputValue();

  const mayTeach = canAccess(user, 'kursplanung', 'edit');
  const mayPlan = canAccess(user, 'rooms', 'edit');
  const mayNote = canAccess(user, 'catalogue', 'edit');
  const [days, plans, choices, row, edit, rooms, notes, activity] = await Promise.all([
    listCourseDays(id),
    weekPlans(course),
    mayTeach || mayPlan ? courseDayChoices(id) : Promise.resolve({ teachers: [], rooms: [], taken: new Map(), away: new Map() }),
    courseListRow(id, today),
    mayPlan ? courseForEdit(id) : Promise.resolve(null),
    mayPlan ? listBookableRooms() : Promise.resolve([]),
    // The class's notes: SchoolMan's (0094) and the team's own.
    listNotes('course', id),
    activityFor('course', id),
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
  // In the course now or still to come; whose period has ended (finished, or left early) goes to the side, the latest first.
  const inCourse = learners.filter((l) => l.endDate >= today);
  const leftCourse = learners.filter((l) => l.endDate < today).sort((a, b) => b.endDate.localeCompare(a.endDate));
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
    ...(notes.length || mayNote ? [{ id: 'notes', label: t('Notizen', 'Notes'), icon: Icon.note, count: notes.length }] : []),
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
              {session || course.time ? (
                <MetaItem icon={Icon.clock}>
                  {session ? <SessionMark session={session} lang={lang} className="mr-1.5" /> : null}
                  {[session ? pick(lang, SESSION_LABELS[session]) : null, dayList(course.days, lang), course.time?.replace('-', '–')].filter(Boolean).join(' · ')}
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
            {/* The class's attendance sheet, four weeks at a time, as SchoolMan prints it (the Tagesplan, 2026-10-19). */}
            {canAccess(user, 'day') ? (
              <ButtonLink href={`/admin/day/attendance?course=${id}&group=${group}`} variant="secondary">
                {t('Anwesenheitsliste', 'Attendance sheet')}
              </ButtonLink>
            ) : null}
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
            <Stat label={t('Lehrkräfte', 'Teachers')}>
              {here.teachers.length ? (
                here.teachers.map((name, i) => (
                  <span key={name}>
                    {i ? ' · ' : ''}
                    <RecordLink href={recordHrefFor(user, 'staff', here.teacherIds[i])}>{name}</RecordLink>
                  </span>
                ))
              ) : (
                <Dash />
              )}
            </Stat>
            <Stat label={t('Raum', 'Room')}>{here.room ? <RecordLink href={recordHrefFor(user, 'room', here.roomId)}>{here.room}</RecordLink> : <Dash />}</Stat>
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
            <DayGrid days={shown} courseId={id} startDate={course.startDate} weekdays={course.days} choices={choices} mayTeach={mayTeach} mayPlan={mayPlan} today={today} t={t} lang={lang} />
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
            <PlanSummary rows={plan.rows} t={t} lang={lang} user={user} />
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
                  {inCourse.length ? <span className="ml-2 text-[0.8rem] font-semibold text-[var(--casa-muted)] tabular-nums">{num(lang, inCourse.length)}</span> : null}
                </>
              }
              icon={Icon.bookings}
              tint="red"
              bleed
            >
              {inCourse.length ? (
                // Those in the course now or still to come, by name, in two columns on a wide screen.
                <ul className="py-1.5 lg:columns-2 lg:gap-0">
                  {inCourse.map((l) => (
                    <li key={`${l.bookingId}${l.startDate}`} className="break-inside-avoid">
                      <LearnerLine learner={l} course={course} lang={lang} t={t} />
                    </li>
                  ))}
                </ul>
              ) : !leftCourse.length ? (
                <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch keine Buchung.', 'No booking yet.')}</p>
              ) : null}
              {leftCourse.length ? (
                // Whose period has ended — finished, or left early: at the side, by the month they left.
                <div className={cn('px-4 pb-4', inCourse.length ? 'pt-1' : 'pt-4')}>
                  <MoreInPanel
                    title={t('Ausgeschieden und beendet', 'Left and finished')}
                    label={t('Ausgeschieden und beendet', 'Left and finished')}
                    icon={Icon.people}
                    tint="red"
                    rows={leftCourse.map((l) => ({
                      key: `${l.bookingId}${l.startDate}`,
                      node: <LearnerLine learner={l} lang={lang} t={t} />,
                      search: [l.name, l.levelCode].filter(Boolean).join(' '),
                      at: `${l.endDate}T12:00:00Z`,
                    }))}
                  />
                </div>
              ) : null}
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}

      {notes.length || mayNote ? (
        <RecordTabPanel id="notes">
          <div className="max-w-3xl">
            <Timeline canWrite={mayNote} entity="course" id={id} notes={notes} activity={activity} />
          </div>
        </RecordTabPanel>
      ) : null}
    </RecordTabs>
  );
}

const Dash = () => <span className="font-semibold text-[var(--casa-text-subtle)]">—</span>;

/**
 * A learner on one line: the name to their booking, then only what differs from the course — another
 * step, a later first day or an earlier last one (in the side panel, `course` left out, the whole period).
 */
function LearnerLine({ learner: l, course, lang, t }: { learner: CourseLearner; course?: { levelCode: string | null; startDate: string; endDate: string }; lang: WsLang; t: T }) {
  const day = (iso: string) => dayRange(iso, iso, lang);
  const later = course && l.startDate > course.startDate;
  const earlier = course && l.endDate < course.endDate;
  const period = !course || (later && earlier) ? dayRange(l.startDate, l.endDate, lang) : later ? t(`ab ${day(l.startDate)}`, `from ${day(l.startDate)}`) : earlier ? t(`bis ${day(l.endDate)}`, `until ${day(l.endDate)}`) : null;
  const level = l.levelCode && l.levelCode !== course?.levelCode ? l.levelCode : null;
  return (
    <Link href={`/admin/bookings/${l.bookingId}`} className="flex items-center gap-3 px-5 py-1.5 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
      <span className="min-w-0 flex-1 truncate font-semibold text-[var(--casa-ink)]">{l.name}</span>
      {level || period ? <span className="shrink-0 text-[0.78rem] text-[var(--casa-muted)] tabular-nums">{[level, period].filter(Boolean).join(' · ')}</span> : null}
    </Link>
  );
}

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
function PlanSummary({ rows, t, lang, user }: { rows: WeekPlanRow[]; t: T; lang: WsLang; user: StaffUser }) {
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
              <span className="max-sm:col-start-2">{r.teacherName ? <RecordLink href={recordHrefFor(user, 'staff', r.teacherId)}>{r.teacherName}</RecordLink> : <span className="font-semibold text-[#9a5b00]">{t('Lehrkraft noch offen', 'Teacher not yet set')}</span>}</span>
              <span className="text-[#2b3546] max-sm:col-start-2">{r.roomName ? <RecordLink href={recordHrefFor(user, 'room', r.roomId)}>{r.roomName}</RecordLink> : <span className="text-[var(--casa-muted)]">{t('Raum noch offen', 'Room not yet set')}</span>}</span>
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

/** The day after `n` days. */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 1 Monday … 7 Sunday. */
const isoDay = (day: string) => ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

const closureOn = (day: string) => SCHOOL_CLOSURES.find((c) => day >= c.from && day <= c.to) ?? null;

/** A long grid — an evening term of seventeen weeks — folds the weeks gone; an eight-week course reads whole. */
const FOLD_FROM = 10;

/** The day dialog's button, stretched over its day: the cell is what is clicked, as `RowDialog` stretches over a row. */
const STRETCH =
  '[&>button]:absolute [&>button]:inset-0 [&>button]:z-[1] [&>button]:h-auto [&>button]:w-full [&>button]:cursor-pointer [&>button]:rounded-none [&>button]:bg-transparent [&>button]:px-0 [&>button:hover]:bg-[#1f3e6c]/[0.05]';

/** A school closure, hatched. */
const CLOSED = 'bg-[repeating-linear-gradient(135deg,#f5f7fa_0_6px,#edf1f5_6px_12px)]';

const PILL = 'shrink-0 rounded-full px-1.5 text-[0.66rem] leading-4 font-semibold ring-1 ring-inset';

/**
 * The lesson days as a week grid (2026-10-20, Rahman: make the long lists calm): a row per teaching week,
 * „KW 44 · Woche 1" and its dates, a column per weekday the course is taught on. A day says its teacher
 * (the board's short name; „für X" when covering) and its room, marked at its edge when covered (amber)
 * or called off (red); a closure is hatched; today is outlined. Clicking a day ahead opens its dialog, as
 * „Ändern" did; the whole of a day is on its hover and in its dialog's head.
 */
function DayGrid({
  days,
  courseId,
  startDate,
  weekdays,
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
  /** The start's days („Mon", „Wed"). */
  weekdays: readonly string[];
  choices: Awaited<ReturnType<typeof courseDayChoices>>;
  mayTeach: boolean;
  mayPlan: boolean;
  today: string;
  t: T;
  lang: WsLang;
}) {
  const byDate = new Map<string, CourseDay[]>();
  for (const d of days) byDate.set(d.date, [...(byDate.get(d.date) ?? []), d]);
  const dates = [...byDate.keys()].sort();
  const firstDay = dates[0];
  const lastDay = dates[dates.length - 1];
  // A column per weekday the course is taught on: Mo–Fr for an intensive course, Mo + Mi for an evening one,
  // and a day's own when it falls on another (a day made up on a Thursday).
  const planned = new Set(weekdays.map((d) => SCHEDULE_DAYS.indexOf(d) + 1).filter((n) => n > 0));
  const columns = [...new Set([...planned, ...dates.map(isoDay)])].sort((a, b) => a - b);
  const weeks: string[] = [];
  for (let monday = mondayOf(firstDay); monday <= lastDay; monday = addDays(monday, 7)) weeks.push(monday);
  const thisMonday = mondayOf(today);
  const fold = weeks.length > FOLD_FROM && weeks.some((m) => m >= thisMonday) && weeks.some((m) => m < thisMonday);
  const gone = fold ? weeks.filter((m) => m < thisMonday) : [];
  const shown = fold ? weeks.filter((m) => m >= thisMonday) : weeks;
  const first = mondayOf(startDate);
  const courseWeek = (monday: string) => Math.round((Date.parse(monday) - Date.parse(first)) / (7 * 86_400_000)) + 1;
  const date = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: '2-digit', month: '2-digit' });
  const label = (iso: string) => `${weekdayName(isoDay(iso), lang)} ${date(iso)}`;
  const table = cn('w-full table-fixed border-collapse text-left', columns.length > 2 ? 'min-w-[42rem]' : 'min-w-[24rem]');
  const cols = (
    <colgroup>
      <col className="w-[9.5rem]" />
      {columns.map((n) => (
        <col key={n} />
      ))}
    </colgroup>
  );

  /** The day of the month, filled when it is today. */
  const dayNumber = (iso: string) => (
    <span
      className={cn(
        'mt-px inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full text-[0.7rem] tabular-nums',
        iso === today ? 'bg-[var(--casa-ink-deep)] px-1 font-bold text-white' : 'font-semibold text-[var(--casa-muted)]'
      )}
    >
      {Number(iso.slice(8))}
    </span>
  );

  /** Everything the day's row used to say, as one line: for its hover and its dialog's head. */
  const facts = (d: CourseDay) => {
    const away = d.teacherAway ? [t('abwesend', 'absent'), absenceWord(d.teacherAway, lang)].filter(Boolean).join(' · ') : null;
    return [
      hours(d),
      d.lessons !== null ? t(`${num(lang, d.lessons)} UE`, `${num(lang, d.lessons)} lessons`) : null,
      d.cancelled ? [t('Fällt aus', 'Called off'), d.cancelReason].filter(Boolean).join(': ') : null,
      d.teacherName
        ? `${d.teacherName}${d.substitute ? (d.replacedTeacherName ? t(` für ${d.replacedTeacherName}`, ` for ${d.replacedTeacherName}`) : t(' (Vertretung)', ' (cover)')) : ''}${away ? ` (${away})` : ''}${d.tentative ? ' ?' : ''}`
        : null,
      d.mergedInto
        ? t(`Zusammengelegt: bei ${d.mergedInto} (${d.mergedRoom ?? '—'})`, `Merged: with ${d.mergedInto} (${d.mergedRoom ?? '—'})`)
        : d.joinedBy
          ? t(`Zusammengelegt mit ${d.joinedBy}`, `Merged with ${d.joinedBy}`)
          : d.merged
            ? t('Mit einer anderen Gruppe zusammengelegt', 'Merged with another group')
            : null,
      d.roomName ? `${d.roomName}${d.replacedRoomName ? t(` statt ${d.replacedRoomName}`, ` instead of ${d.replacedRoomName}`) : ''}` : null,
      d.note,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const day = (d: CourseDay) => {
    const past = d.date < today;
    const teacher = d.teacherShort ?? d.teacherName;
    const replaced = d.replacedTeacherShort ?? d.replacedTeacherName;
    const about = facts(d);
    return (
      <div
        key={d.id}
        title={`${label(d.date)} · ${about}`}
        className={cn(
          'relative flex gap-1.5 px-2 py-1.5',
          d.cancelled ? 'bg-[#fbf3f3] shadow-[inset_3px_0_0_#d14343]' : d.substitute ? 'shadow-[inset_3px_0_0_#d99a00]' : null,
          d.date === today && 'outline-2 -outline-offset-2 outline-[var(--casa-ink-deep)]'
        )}
      >
        {dayNumber(d.date)}
        <div className={cn('min-w-0 flex-1', past && 'opacity-60')}>
          <p className="truncate text-[0.8rem] leading-5">
            {d.cancelled ? (
              <span className="font-semibold text-[var(--casa-danger-text)]">{t('Fällt aus', 'Called off')}</span>
            ) : teacher ? (
              <>
                <span className={cn('font-semibold', d.teacherAway ? 'text-[var(--casa-muted)] line-through' : 'text-[var(--casa-ink)]')}>{teacher}</span>
                {d.tentative ? <span className="font-semibold text-[var(--casa-muted)]"> ?</span> : null}
                {d.substitute && replaced ? <span className="text-[var(--casa-muted)]"> {t(`für ${replaced}`, `for ${replaced}`)}</span> : null}
              </>
            ) : d.mergedInto ? (
              <span className="font-semibold text-[var(--casa-muted)]">{t(`bei ${d.mergedInto}`, `with ${d.mergedInto}`)}</span>
            ) : d.merged ? (
              <span className="text-[var(--casa-muted)]">{t('Zusammengelegt', 'Merged')}</span>
            ) : past ? (
              <span className="text-[var(--casa-text-subtle)]">—</span>
            ) : (
              <span className="font-semibold text-[#9a5b00]">{t('Noch offen', 'Not yet')}</span>
            )}
          </p>
          <p className="flex items-center gap-1 text-[0.74rem] leading-[18px] text-[var(--casa-muted)]">
            <span className="min-w-0 flex-1 truncate">
              {d.cancelled ? (
                d.cancelReason
              ) : (
                <>
                  {d.roomName ?? d.mergedRoom ?? <span className="text-[var(--casa-text-subtle)]">—</span>}
                  {d.replacedRoomName ? <span> {t(`statt ${d.replacedRoomName}`, `instead of ${d.replacedRoomName}`)}</span> : null}
                </>
              )}
            </span>
            {d.ownHours && hours(d) ? <span className="shrink-0 font-semibold text-[var(--casa-ink)] tabular-nums">{hours(d)}</span> : null}
            {d.teacherAway && !d.cancelled ? <span className={cn(PILL, 'bg-[#fdecec] text-[#9b1c1c] ring-[#f3c4c4]')}>{absenceWord(d.teacherAway, lang) ?? t('abwesend', 'absent')}</span> : null}
            {d.joinedBy && !d.cancelled ? (
              <span className={cn(PILL, 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]')}>+ {d.joinedBy}</span>
            ) : d.merged && teacher && !d.cancelled && !d.mergedInto ? (
              <span className={cn(PILL, 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]')}>{t('zusammengelegt', 'merged')}</span>
            ) : null}
            {d.note ? (
              <span aria-hidden="true" className="shrink-0 [&_svg]:size-3">
                {Icon.note}
              </span>
            ) : null}
          </p>
        </div>
        {(mayTeach || mayPlan) && !past ? (
          <span className={STRETCH}>
            <FormDialog trigger={<span className="sr-only">{t(`${label(d.date)} ändern`, `Change ${label(d.date)}`)}</span>} title={label(d.date)} description={about} size="sm" triggerVariant="ghost">
              <DayForm courseId={courseId} day={d} choices={choices} mayTeach={mayTeach} mayPlan={mayPlan} />
            </FormDialog>
          </span>
        ) : null}
      </div>
    );
  };

  const row = (monday: string) => {
    const cells = columns.map((n) => addDays(monday, n - 1));
    const closures = cells.map((c) => (byDate.has(c) ? null : closureOn(c)));
    const closedWeek = closures.every(Boolean) ? closures[0] : null;
    const current = monday === thisMonday;
    return (
      <tr key={monday} className={cn('border-b border-ws-line-soft last:border-b-0', current && 'bg-[#f6f9fd]')}>
        <th scope="row" className={cn('px-4 py-1.5 align-top font-normal', current && 'shadow-[inset_3px_0_0_var(--casa-ink-deep)]')}>
          <span className="block truncate text-[0.8rem] leading-5 font-bold text-[var(--casa-ink)] tabular-nums">
            {t(`KW ${isoWeek(monday)}`, `W${isoWeek(monday)}`)}
            {closedWeek ? null : <span className="text-[0.72rem] font-semibold text-[var(--casa-muted)]"> · {t(`Woche ${courseWeek(monday)}`, `week ${courseWeek(monday)}`)}</span>}
          </span>
          <span className="block text-[0.72rem] leading-[18px] text-[var(--casa-muted)] tabular-nums">{dayRange(cells[0], cells[cells.length - 1], lang)}</span>
        </th>
        {closedWeek ? (
          <td colSpan={columns.length} className={cn(CLOSED, 'border-l border-ws-line-soft px-3 text-[0.8rem] font-semibold text-[var(--casa-muted)]')}>
            {t('Geschlossen', 'Closed')} · {closedWeek.label[lang]}
          </td>
        ) : (
          cells.map((c, i) => {
            const list = byDate.get(c) ?? [];
            const closure = closures[i];
            return (
              <td key={c} className={cn('border-l border-ws-line-soft p-0 align-top', !list.length && closure && CLOSED)}>
                {list.length ? (
                  list.map(day)
                ) : c >= firstDay && c <= lastDay && (closure || planned.has(isoDay(c))) ? (
                  <div className="flex gap-1.5 px-2 py-1.5" title={closure ? `${label(c)} · ${t('Geschlossen', 'Closed')} · ${closure.label[lang]}` : label(c)}>
                    {dayNumber(c)}
                    {closure ? (
                      <div className="min-w-0 flex-1 text-[var(--casa-muted)]">
                        <p className="truncate text-[0.8rem] leading-5 font-semibold">{t('Geschlossen', 'Closed')}</p>
                        <p className="truncate text-[0.74rem] leading-[18px]">{closure.label[lang]}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </td>
            );
          })
        )}
      </tr>
    );
  };

  const head = (
    <thead>
      <tr className="border-b border-ws-line text-xs text-[var(--casa-muted)]">
        <th className="px-4 py-2 font-semibold">{t('Woche', 'Week')}</th>
        {columns.map((n) => (
          <th key={n} className="border-l border-ws-line-soft px-2 py-2 font-semibold">
            {weekdayName(n, lang)}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="overflow-x-auto">
      {gone.length ? (
        <>
          <table className={table}>
            {cols}
            {head}
          </table>
          <details className="group/past border-b border-ws-line">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-2 text-[0.8rem] font-semibold text-[var(--casa-muted)] select-none hover:bg-[var(--ws-row-hover)] hover:text-[var(--casa-ink)] [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="inline-flex transition-transform group-open/past:rotate-90 [&_svg]:size-3.5">
                {Icon.chevronRight}
              </span>
              {t(`Vergangene Wochen (${gone.length})`, `Past weeks (${gone.length})`)}
            </summary>
            <table className={cn(table, 'border-t border-ws-line-soft')}>
              {cols}
              <tbody>{gone.map(row)}</tbody>
            </table>
          </details>
          <table className={table}>
            {cols}
            <tbody>{shown.map(row)}</tbody>
          </table>
        </>
      ) : (
        <table className={table}>
          {cols}
          {head}
          <tbody>{shown.map(row)}</tbody>
        </table>
      )}
    </div>
  );
}
