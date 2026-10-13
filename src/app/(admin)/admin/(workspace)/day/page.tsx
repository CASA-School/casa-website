import Link from 'next/link';

import { DayBoard } from '../day-board/board';
import { Icon } from '@/components/admin/icons';
import { Owner, RecordName } from '@/components/admin/list';
import { Received } from '@/components/admin/queue-toolbar';
import { Card } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { addDay, sundayOf } from '@/lib/admin/control-room';
import { dayBoard, dayEvents, type DayEvent } from '@/lib/admin/day-board';
import { requireModule } from '@/lib/admin/guard';
import { teachingOn, type TeachingDay } from '@/lib/admin/kursplanung/day';
import { getAttentionItems, getOverviewCounts, getWaiting } from '@/lib/admin/overview';
import { officeDay, rotaSpan, type OfficeDay } from '@/lib/admin/rota';
import { ABSENCE_LABELS, officeHoursOn } from '@/lib/admin/rota-rules';
import { listAssignableStaff } from '@/lib/admin/staff';

/**
 * One day in detail, opened from the control room (`/admin`) by its date:
 * who is waiting for an answer (today only), the day's tasks to tick, who is
 * in the office, what is happening at CASA by name, and what is coming.
 * The week, its signals and its shortcuts are the control room's; this is the
 * day you act on. `?date=YYYY-MM-DD`; today without it.
 *
 * The work of a colleague who is away wears an amber ring, so someone else
 * picks it up. `force-dynamic` is inherited from the workspace layout.
 */
export default async function DayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireModule('overview')]);

  const now = new Date();
  const today = toIso(now);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date! : today;
  const canWrite = canAccess(user, 'overview', 'edit');
  const holds = (module: Parameters<typeof canAccess>[1]) => canAccess(user, module);
  const isToday = date === today;

  const sunday = sundayOf(date);
  const saturday = toIso(new Date(new Date(`${sunday}T00:00:00`).getTime() + 6 * 86_400_000));
  const weekday = officeHoursOn(date) !== null;
  // Teachers and the plan are Kursplanung's, which only management holds.
  const teaching = holds('kursplanung');
  const rota = holds('rota');
  const [counts, waiting, attention, events, board, teachingWeek, rotaWeek, staff] = await Promise.all([
    getOverviewCounts(),
    getWaiting(holds),
    getAttentionItems(),
    dayEvents(date),
    dayBoard(date),
    teaching && weekday ? teachingOn([date]) : Promise.resolve(null),
    rota ? rotaSpan(sunday, saturday < today ? today : saturday) : Promise.resolve(null),
    canWrite ? listAssignableStaff() : Promise.resolve([]),
  ]);
  // Gaps at the desk only once the week has shifts, so a week nobody planned is not an alarm.
  const rotaPlanned = !!rotaWeek?.shifts.some((s) => s.onDate >= sunday && s.onDate <= saturday);
  const office = rotaWeek ? officeDay(date, rotaWeek.shifts, rotaWeek.absences) : null;
  const awayOn = (day: string) => new Set(rotaWeek ? officeDay(day, [], rotaWeek.absences).away.map((a) => a.staffName) : []);
  const awayToday = awayOn(today);
  const teachingDay = teachingWeek?.get(date);
  const teachingNews = teachingDay && (teachingDay.away.length > 0 || teachingDay.open > 0 || teachingDay.conflicts > 0) ? teachingDay : null;
  const previous = addDay(date, -1);
  const next = addDay(date, 1);
  const dayHref = (d: string) => (d === today ? '/admin/day' : `/admin/day?date=${d}`);

  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name ?? '').split(/\s+/)[0];
  const selected = new Date(`${date}T00:00:00`);
  const longDate = selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // The queues' totals, one quiet line under the waiting list — only the queues this colleague opens.
  const queues = [
    { label: 'Enquiries', count: counts.enquiriesOpen, href: '/admin/enquiries', module: 'enquiries' as const },
    { label: 'Registrations', count: counts.courseRegistrationsOpen + counts.examRegistrationsOpen, href: '/admin/registrations', module: 'registrations' as const },
    { label: 'Placement', count: counts.placementAwaitingReview, href: '/admin/placement', module: 'placement' as const },
    { label: 'Applications', count: counts.applicationsOpen, href: '/admin/applications', module: 'applications' as const },
  ].filter((q) => q.count > 0 && holds(q.module));

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin${sundayOf(today) === sunday ? '' : `?week=${date}`}`} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--fm-blue)] hover:underline">
            ‹ The week
          </Link>
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">
            {isToday ? `${greeting}${firstName ? `, ${firstName}` : ''}` : longDate}
          </h1>
          <p className="mt-1 text-sm font-medium text-[var(--casa-muted)]">
            {isToday ? longDate : selected < now ? 'An earlier day' : 'A day ahead'}
          </p>
        </div>
        <nav aria-label="Another day" className="flex items-center gap-1">
          {!isToday ? (
            <Link href="/admin/day" className="mr-1 flex h-8 items-center rounded-lg border border-ws-line bg-white px-3 text-xs font-semibold text-[var(--casa-ink)] hover:border-ws-line-firm">
              Today
            </Link>
          ) : null}
          <Link href={dayHref(previous)} aria-label="The day before" className="flex size-8 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] hover:bg-white hover:text-[var(--casa-ink)]">
            ‹
          </Link>
          <Link href={dayHref(next)} aria-label="The day after" className="flex size-8 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] hover:bg-white hover:text-[var(--casa-ink)]">
            ›
          </Link>
        </nav>
      </header>

      {params.error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {params.error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-5">
          {isToday ? (
            <Card
              title="Waiting for an answer"
              icon={Icon.mail}
              tint="green"
              bleed
              actions={waiting.total ? <span className="text-xs font-semibold text-[var(--casa-text-subtle)] tabular-nums">{waiting.total}</span> : undefined}
              footer={
                queues.length ? (
                  <nav aria-label="Queues" className="flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs">
                    {queues.map((q) => (
                      <Link key={q.href} href={q.href} className="font-semibold text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)]">
                        {q.label} <span className="ml-0.5 text-[var(--casa-text-subtle)] tabular-nums">{q.count}</span>
                      </Link>
                    ))}
                  </nav>
                ) : undefined
              }
            >
              {waiting.items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[var(--casa-text-subtle)]">Nobody is waiting for an answer.</p>
              ) : (
                <ul className="divide-y divide-ws-line-soft">
                  {waiting.items.map((item) => (
                    <li key={item.key}>
                      <Link href={item.href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[#f7f9fc]">
                        <span className="min-w-0 flex-1">
                          <RecordName name={item.name || 'No name'} about={item.about} />
                        </span>
                        <span className="flex w-6 shrink-0 justify-center">
                          <Owner name={item.owner} away={!!item.owner && awayToday.has(item.owner)} />
                        </span>
                        <span className="shrink-0 text-right text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)] sm:w-24">
                          <Received at={item.since} status="new" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <DayBoard date={date} today={board.today} overdue={board.overdue} staff={staff} canWrite={canWrite} away={awayOn(date)} />
        </div>

        <div className="space-y-5">
          {office ? (
            <InTheOffice
              day={office}
              open={weekday}
              planned={rotaPlanned}
              showReason={canAccess(user, 'rota', 'edit')}
              date={date}
              href={`/admin/rota${sundayOf(today) === sunday ? '' : `?week=${addDay(sunday, 1)}`}`}
            />
          ) : null}
          <Card title={isToday ? 'At CASA today' : 'At CASA that day'} icon={Icon.calendar} tint="blue" bleed>
            {events.length === 0 && !teachingNews ? (
              <p className="px-5 py-5 text-sm text-[var(--casa-text-subtle)]">Nothing on the calendar.</p>
            ) : (
              EVENT_GROUPS.map(({ kind, label }) => {
                const rows = events.filter((e) => e.kind === kind);
                if (rows.length === 0) return null;
                return (
                  <section key={kind} className="border-b border-ws-line-soft last:border-b-0">
                    <h3 className="border-b border-ws-line-soft bg-[#f8fafc] px-5 pt-3 pb-2 text-xs font-bold text-[var(--casa-muted)]">
                      {label}
                      <span className="ml-1.5 font-semibold text-[var(--casa-text-subtle)]">{rows.length}</span>
                    </h3>
                    <ul className="divide-y divide-ws-line-soft">
                      {rows.map((event, index) => (
                        <li key={`${kind}-${index}`}>
                          <Link href={event.href} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[#f7f9fc]">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[var(--casa-ink)]">{event.title}</span>
                              {event.detail ? (
                                <span className="block truncate text-xs text-[var(--casa-muted)]">{event.detail}</span>
                              ) : null}
                            </span>
                            {kind !== 'arrival' && event.count > 0 ? (
                              <span className="shrink-0 text-xs text-[var(--casa-text-subtle)]">
                                {event.count} {event.count === 1 ? 'learner' : 'learners'}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
            {teachingNews ? <Teaching day={teachingNews} /> : null}
          </Card>

          {isToday && attention.length > 0 ? (
            <Card title="Coming up" icon={Icon.clock} tint="sun" bleed>
              <ul className="divide-y divide-ws-line-soft">
                {attention.map((item, index) => (
                  <li key={`${item.kind}-${index}`}>
                    <Link href={item.href} className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[#f7f9fc]">
                      <DayTile on={item.on} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--casa-ink)]">{item.title}</span>
                        <span className="block truncate text-xs text-[var(--casa-muted)]">{item.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A day as a calendar leaf: the month over the date. */
function DayTile({ on }: { on: Date }) {
  return (
    <span aria-hidden="true" className="flex w-10 shrink-0 flex-col items-center overflow-hidden rounded-lg bg-white ring-1 ring-ws-line ring-inset">
      <span className="w-full bg-[#fdecee] py-0.5 text-center text-[0.6rem] leading-tight font-bold text-[#a3050f]">
        {on.toLocaleDateString('en-GB', { month: 'short' })}
      </span>
      <span className="py-1 text-[0.95rem] leading-none font-bold text-[var(--casa-ink)] tabular-nums">{on.getDate()}</span>
    </span>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const shortDay = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/**
 * Who is in the office on the chosen day — FileMaker's "Shift | Reception"
 * and its absences, worked out: first what is wrong (office hours nobody
 * covers at the desk, a shift planned for someone who is away), then who is
 * at the desk when, then who is away and until when. An absence's reason
 * only for whoever plans the rota; everyone else reads "Away".
 */
function InTheOffice({
  day,
  open,
  planned,
  showReason,
  date,
  href,
}: {
  day: OfficeDay;
  open: boolean;
  planned: boolean;
  showReason: boolean;
  date: string;
  href: string;
}) {
  const clashing = new Set(day.clashes.map((s) => s.staffUserId));
  const present = day.shifts.filter((s) => !clashing.has(s.staffUserId));
  return (
    <Card
      title="In the office"
      icon={Icon.team}
      tint="green"
      bleed
      actions={
        <Link href={href} className="text-xs font-semibold text-[var(--casa-accent-text)] hover:underline">
          Rota
        </Link>
      }
    >
      {!open ? (
        <p className="px-5 py-5 text-sm text-[var(--casa-text-subtle)]">The office is closed.</p>
      ) : !planned && day.away.length === 0 ? (
        <p className="px-5 py-5 text-sm text-[var(--casa-text-subtle)]">No rota for this week yet.</p>
      ) : (
        <ul className="divide-y divide-ws-line-soft text-sm">
          {planned
            ? day.gaps.map((g) => (
                <li key={g.from} className="px-5 py-2.5 font-semibold text-[#9a5b00] tabular-nums">
                  Nobody at the desk {g.from}–{g.to}
                </li>
              ))
            : null}
          {day.clashes.map((s) => (
            <li key={s.id} className="px-5 py-2.5 font-semibold text-[#b91c1c]">
              {s.staffName} has a shift but is away
            </li>
          ))}
          {present.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
              <Owner name={s.staffName} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[var(--casa-ink)]">{s.staffName}</span>
                {s.note ? <span className="block truncate text-xs text-[var(--casa-muted)]">{s.note}</span> : null}
              </span>
              <span className="shrink-0 text-xs font-semibold text-[#2b3546] tabular-nums">
                {s.startsAt}–{s.endsAt}
              </span>
            </li>
          ))}
          {day.away.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="opacity-60">
                <Owner name={a.staffName} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[var(--casa-muted)]">{a.staffName}</span>
              <span className="shrink-0 text-xs text-[var(--casa-text-subtle)]">
                {showReason ? ABSENCE_LABELS[a.reason] : 'Away'}
                {a.toDate > date ? ` until ${shortDay(a.toDate)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const EVENT_GROUPS: readonly { kind: DayEvent['kind']; label: string }[] = [
  { kind: 'arrival', label: 'First day' },
  { kind: 'move_in', label: 'Moving in' },
  { kind: 'move_out', label: 'Moving out' },
  { kind: 'course_start', label: 'Courses starting' },
  { kind: 'exam', label: 'Exams' },
  { kind: 'course_end', label: 'Courses ending' },
  { kind: 'birthday', label: 'Birthdays' },
];

/** The board stores an absence's reason in German, as the planners write it. */
const AWAY: Record<string, string> = {
  Urlaub: 'On leave',
  Krank: 'Sick',
  Fortbildung: 'Training',
  Freistellung: 'Released',
  Elternzeit: 'Parental leave',
  Sonstiges: 'Away',
};

/**
 * The day's teaching, for a colleague who holds Kursplanung: who is away and
 * why, and — only when there is one — what the plan still lacks, with the way
 * into the board. FileMaker lit "VacantTeacher" and "ConflictTeacher" orange
 * on such a day; here it is one line each, in amber and red.
 */
function Teaching({ day }: { day: TeachingDay }) {
  return (
    <section className="border-t border-ws-line-soft">
      <h3 className="flex items-center justify-between gap-2 border-b border-ws-line-soft bg-[#f8fafc] px-5 pt-3 pb-2 text-xs font-bold text-[var(--casa-muted)]">
        <span>Teaching</span>
        <Link href={`/admin/kursplanung?month=${day.month}`} className="font-semibold text-[var(--casa-accent-text)] hover:underline">
          Open the plan
        </Link>
      </h3>
      <ul className="divide-y divide-ws-line-soft text-sm">
        {day.open > 0 ? (
          <li className="px-5 py-2.5 font-semibold text-[#9a5b00]">
            {day.open} {day.open === 1 ? 'lesson has' : 'lessons have'} no teacher
          </li>
        ) : null}
        {day.conflicts > 0 ? (
          <li className="px-5 py-2.5 font-semibold text-[#b91c1c]">
            {day.conflicts} {day.conflicts === 1 ? 'conflict' : 'conflicts'} in the plan
          </li>
        ) : null}
        {day.away.map((teacher) => (
          <li key={teacher.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <span className="font-semibold text-[var(--casa-ink)]">{teacher.name}</span>
            <span className="text-xs text-[var(--casa-muted)]">{AWAY[teacher.reason] ?? teacher.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
