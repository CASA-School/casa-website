import { canAccess, type WorkspaceModule } from '@/lib/admin/access';
import { addDay, controlWeek, sundayOf } from '@/lib/admin/control-room';
import { queryFirst } from '@/lib/admin/db';
import { requireModule } from '@/lib/admin/guard';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { rotaSpan } from '@/lib/admin/rota';
import { listAssignableStaff } from '@/lib/admin/staff';
import { todayInputValue } from '@/lib/dates';

import { DayRow } from './control/day-row';
import { Launch } from './control/launch';

/**
 * Today — the control room. FileMaker's `SingleDayCalendar_Overview`, the
 * screen the team has opened every morning for years, rebuilt rather than
 * copied (Rahman, 2026-10-13: "this filemaker style control-room is a bit
 * important to have … not everything like filemaker but better logic and
 * intelligence").
 *
 * Kept from FileMaker, because hands and eyes know it: the week from Sunday to
 * Saturday as rows, a thick navy line between days, the date red at the
 * weekend and today on cream, the red-brown bar with « ‹ › », the rows of
 * pale yellow and grey cells that open every area, the first-day box, the
 * keys in their columns, reception, and the absences with TU and kr.
 *
 * Better than FileMaker: every key says whether there is something behind it;
 * what is wrong with a day is said in words at the end of its head — a room
 * booked twice, a plan conflict, lessons nobody teaches, office hours nobody
 * covers, someone on shift who is away, tasks left from earlier; the
 * weekend is one line unless someone arrives; each area and key is there
 * only for whoever may open it; a building block still to come stands in its
 * place, quiet. A date opens the day in detail (`/admin/day`).
 *
 * `?week=YYYY-MM-DD` (any day of the week); this week without it.
 */
export default async function ControlRoomPage({ searchParams }: { searchParams: Promise<{ week?: string; error?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireModule('overview')]);
  const today = todayInputValue();
  const anyDay = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? '') ? params.week! : today;
  const holds = (module: WorkspaceModule) => canAccess(user, module);
  const can = {
    tasks: canAccess(user, 'overview', 'edit'),
    rota: holds('rota'),
    rotaEdit: canAccess(user, 'rota', 'edit'),
    offers: canAccess(user, 'offers', 'edit'),
    teaching: holds('kursplanung'),
    catalogue: holds('catalogue'),
  };

  const sunday = sundayOf(anyDay);
  const [week, staff, rotaStaff, overdue] = await Promise.all([
    controlWeek(anyDay, { teaching: can.teaching, rota: can.rota }),
    can.tasks ? listAssignableStaff() : Promise.resolve([]),
    can.rotaEdit ? rotaSpan(sunday, sunday).then((r) => r.staff) : Promise.resolve([]),
    queryFirst<{ n: string }>(`SELECT count(*) AS n FROM day_tasks WHERE on_date < current_date AND done_at IS NULL`).then((r) => Number(r?.n ?? 0)),
  ]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name ?? '').split(/\s+/)[0];
  const thisWeek = sunday === sundayOf(today);
  const href = (d: string) => (sundayOf(d) === sundayOf(today) ? '/admin' : `/admin?week=${d}`);
  const [, am, ad] = week.sunday.split('-').map(Number);
  const [by, bm, bd] = week.saturday.split('-').map(Number);
  const month = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
  const span = am === bm ? `${ad}–${bd} ${month(bm)} ${by}` : `${ad} ${month(am)} – ${bd} ${month(bm)} ${by}`;

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-0.5 text-sm font-medium text-[var(--casa-muted)]">
          {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      {params.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : null}

      <div className="shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <Launch
          title={`Week ${isoWeek(addDay(week.sunday, 1))} · ${span}`}
          week={week}
          thisWeek={thisWeek}
          holds={holds}
          nav={{
            back4: href(addDay(sunday, -28)),
            back: href(addDay(sunday, -7)),
            next: href(addDay(sunday, 7)),
            next4: href(addDay(sunday, 28)),
          }}
        />
        <div className="overflow-visible rounded-b-md border border-t-0 border-[var(--fm-navy)]/35 bg-white">
          {week.days.map((day) => (
            <DayRow
              key={day.date}
              day={day}
              today={today}
              overdue={overdue}
              can={can}
              staff={staff}
              rotaStaff={rotaStaff}
              showReason={can.rotaEdit}
            />
          ))}
          <div className="h-[3px] rounded-b-md bg-[var(--fm-navy)]" />
        </div>
      </div>
    </div>
  );
}
