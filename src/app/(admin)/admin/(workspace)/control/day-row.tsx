import Link from 'next/link';
import type { ReactNode } from 'react';

import { FormDialog } from '@/components/admin/dialogs';
import { Popover } from '@/components/admin/popover';
import type { ControlDay, Named } from '@/lib/admin/control-room';
import type { RotaColleague, StaffAbsence } from '@/lib/admin/rota';
import { cn } from '@/lib/utils';

import { TaskForm } from '../day-board/task-form';
import { AbsenceForm } from '../rota/absence-form';
import { BlockHead, Key, keyClass, Plus } from './keys';

/**
 * One day of the control room — a row of FileMaker's home calendar, worked
 * out. The head: the date and weekday (red at the weekend, today on cream),
 * the birthdays, and on the right what is wrong with the day, in words.
 * Then, on a day the office is open: who starts and who moves in; the day's
 * keys (its work, making something new, its rooms, its teaching plan), each
 * showing whether there is something behind it; who is at the desk;
 * who of the office and of the teachers is away, with FileMaker's codes.
 * A weekend is one line, unless someone moves in or starts.
 */

export type Can = {
  tasks: boolean;
  rota: boolean;
  rotaEdit: boolean;
  offers: boolean;
  teaching: boolean;
  catalogue: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');
const ddmm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

/** FileMaker's absence codes, kept because the team reads them at a glance. */
const OFFICE_CODE: Record<StaffAbsence['reason'], string> = { leave: 'TU', sick: 'kr', time_off: 'AÜ', training: 'Fb', unpaid: 'uU', other: '–' };
const TEACHER_CODE: Record<string, string> = { Urlaub: 'TU', Krank: 'kr', Fortbildung: 'Fb', Freistellung: 'Fr', Elternzeit: 'EZ', Sonstiges: '–' };

function Code({ code }: { code: string }) {
  return (
    <span
      className={cn(
        'grid h-4 min-w-6 place-items-center rounded-[2px] px-1 text-[0.62rem] font-bold italic',
        code === 'TU' ? 'bg-[var(--fm-blue)] text-white' : code === 'kr' ? 'bg-[#e9b92f] text-[#3d2c00]' : 'bg-[var(--fm-grey)] text-[#59616b]'
      )}
    >
      {code}
    </span>
  );
}

/** A list of names behind a key or a count, in the small panel. */
function Names({ names }: { names: readonly Named[] }) {
  return (
    <ul className="space-y-0.5">
      {names.map((n, i) => (
        <li key={`${n.href}-${i}`}>
          <Link href={n.href} className="flex items-baseline justify-between gap-3 rounded-md px-2.5 py-1.5 hover:bg-ws-sunk">
            <span className="truncate font-semibold text-[var(--casa-ink)]">{n.title}</span>
            {n.detail ? <span className="shrink-0 text-xs text-[var(--casa-muted)]">{n.detail}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PopKey({ label, names, children, state = 'has', align = 'left' }: { label: string; names: readonly Named[]; children: ReactNode; state?: 'has' | 'warn'; align?: 'left' | 'right' }) {
  return (
    <Popover label={label} trigger={<span className={keyClass(state)}>{children}</span>} width={300} align={align}>
      <Names names={names} />
    </Popover>
  );
}

export function DayRow({
  day,
  today,
  overdue,
  can,
  staff,
  rotaStaff,
  showReason,
}: {
  day: ControlDay;
  today: string;
  /** Tasks left open from earlier days: today's Tasks key carries them. */
  overdue: number;
  can: Can;
  staff: readonly { id: string; name: string }[];
  rotaStaff: readonly RotaColleague[];
  /** An absence's reason is personal data: the code only for whoever plans the rota. */
  showReason: boolean;
}) {
  const date = new Date(`${day.date}T00:00:00`);
  const isToday = day.date === today;
  const weekend = !day.open;
  const dayHref = isToday ? '/admin/day' : `/admin/day?date=${day.date}`;
  const f = day.facts;
  const ev = day.events;
  const planMonth = day.teaching?.month;
  const planHref = `/admin/kursplanung${planMonth ? `?month=${planMonth}` : ''}`;
  const monday = (() => {
    const d = new Date(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();
  const tasks = f.tasks + (isToday ? overdue : 0);

  // What is wrong with the day, in words — FileMaker lit a key orange and left the reading to the eye.
  const signals: { text: string; tone: 'clash' | 'warn' }[] = [
    ...day.roomClashes.map((c) => ({ text: `${c.room || 'A room'} booked twice`, tone: 'clash' as const })),
    ...(f.conflicts ? [{ text: `${f.conflicts} plan ${f.conflicts === 1 ? 'conflict' : 'conflicts'}`, tone: 'clash' as const }] : []),
    ...(day.office?.clashes ?? []).map((s) => ({ text: `${s.staffName} away but on shift`, tone: 'clash' as const })),
    ...(f.unplanned ? [{ text: `${f.unplanned} ${f.unplanned === 1 ? 'lesson needs' : 'lessons need'} a teacher`, tone: 'warn' as const }] : []),
    ...(day.office?.gaps ?? []).map((g) => ({ text: `Nobody at the desk ${g.from}–${g.to}`, tone: 'warn' as const })),
    ...(isToday && overdue ? [{ text: `${overdue} ${overdue === 1 ? 'task' : 'tasks'} from earlier`, tone: 'warn' as const }] : []),
  ];

  const arrivals = (
    <>
      <Arrival label="First day" names={ev.arrival} big />
      <Arrival label="Moving in" names={ev.move_in} />
      {ev.move_out.length ? <Arrival label="Moving out" names={ev.move_out} /> : null}
    </>
  );

  return (
    <article className="border-t-[3px] border-[var(--fm-navy)]" aria-label={date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}>
      <header className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1', isToday ? 'bg-[var(--fm-cream)]' : 'bg-[var(--fm-grey-light)]')}>
        <Link href={dayHref} className="flex items-baseline gap-3 rounded-[3px] px-1 hover:bg-white">
          <span className={cn('text-[1.05rem] font-extrabold tabular-nums', weekend && 'text-[var(--fm-red)]', isToday && 'underline decoration-2 underline-offset-4')}>
            {pad(date.getDate())}.{pad(date.getMonth() + 1)}.{String(date.getFullYear()).slice(2)}
          </span>
          <span className={cn('w-24 text-[0.95rem] font-bold', weekend ? 'text-[var(--fm-red)]' : 'text-[var(--casa-ink)]', isToday && 'underline decoration-2 underline-offset-4')}>
            {date.toLocaleDateString('en-GB', { weekday: 'long' })}
          </span>
        </Link>
        {ev.birthday.length ? (
          <Popover label="Birthdays" width={280} trigger={<span className="inline-flex items-center gap-1 rounded-[3px] bg-[var(--fm-sky)] px-1.5 py-0.5 text-[0.74rem] font-bold text-[var(--fm-navy)]">Birthday | {ev.birthday.length}</span>}>
            <Names names={ev.birthday} />
          </Popover>
        ) : null}
        {weekend && (ev.arrival.length || ev.move_in.length || ev.move_out.length) ? (
          <span className="flex gap-1.5 text-[0.74rem]">
            {ev.move_in.length ? <Inline label="Moving in" names={ev.move_in} /> : null}
            {ev.move_out.length ? <Inline label="Moving out" names={ev.move_out} /> : null}
            {ev.arrival.length ? <Inline label="First day" names={ev.arrival} /> : null}
          </span>
        ) : null}
        {signals.length ? (
          <ul className="ml-auto flex flex-wrap justify-end gap-1">
            {signals.map((s) => (
              <li
                key={s.text}
                className={cn(
                  'rounded-[3px] px-1.5 py-0.5 text-[0.72rem] font-bold',
                  s.tone === 'clash' ? 'bg-[var(--fm-orange)] text-[var(--fm-red)]' : 'bg-[#fff1c2] text-[#8a5a00]'
                )}
              >
                {s.text}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {weekend ? null : (
        <div
          className={cn(
            // Every column may shrink (minmax 0): a key or a name truncates, the row never spills out of the card.
            'grid gap-px bg-[var(--fm-grey-line)] md:grid-cols-[6.5rem_minmax(0,1fr)]',
            can.teaching
              ? 'xl:grid-cols-[6.5rem_minmax(0,1.75fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]'
              : 'xl:grid-cols-[6.5rem_minmax(0,1.45fr)_minmax(0,1.15fr)_minmax(0,1fr)]'
          )}
        >
          <div className="flex flex-col justify-center gap-1 bg-white p-1.5">{arrivals}</div>

          {/* The day's keys, in FileMaker's columns: the day's work · something new · its rooms · its teaching.
              The areas themselves (students, courses, exams, bookings…) are the launch bar's, once for the week. */}
          <div className={cn('grid grid-flow-col grid-rows-4 gap-1 bg-white p-1.5', can.teaching ? 'grid-cols-4' : 'grid-cols-3')}>
            <Key href={`${dayHref}#tasks`} state={tasks ? (isToday && overdue ? 'warn' : 'has') : 'plain'} count={tasks || undefined}>
              Tasks
            </Key>
            <Key state="later">Messages</Key>
            {can.rota ? <Key href={`/admin/rota?week=${monday}`}>Rota</Key> : <span />}
            <Key href={dayHref}>Day</Key>

            {can.tasks ? (
              <FormDialog trigger={<><Plus /> Task</>} title="Add to the day" triggerClassName={cn(keyClass('plain'), 'text-[#4b5563]')}>
                <TaskForm date={day.date} staff={staff} from="week" />
              </FormDialog>
            ) : (
              <span />
            )}
            {can.rotaEdit ? (
              <FormDialog trigger={<><Plus /> Absence</>} title="An absence" triggerClassName={cn(keyClass('plain'), 'text-[#4b5563]')}>
                <AbsenceForm staff={rotaStaff} week={monday} firstDay={day.date} from="week" />
              </FormDialog>
            ) : (
              <span />
            )}
            {can.offers ? (
              <Link href="/admin/offers/new" className={cn(keyClass('plain'), 'text-[#4b5563]')}>
                <Plus /> Offer
              </Link>
            ) : (
              <span />
            )}
            <span className={keyClass('later')} aria-disabled="true">
              + Message
            </span>

            {can.catalogue ? (
              <Key href="/admin/catalogue" state={day.classrooms.some((c) => c.room) ? 'has' : 'plain'}>
                Rooms
              </Key>
            ) : (
              <span />
            )}
            {day.classrooms.length ? (
              <Popover
                label="In class that day"
                width={320}
                align={can.teaching ? 'left' : 'right'}
                trigger={<span className={keyClass('has')}>Classes | {day.classrooms.length}</span>}
              >
                <ul className="space-y-0.5 text-sm">
                  {day.classrooms.map((c, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 rounded-md px-2.5 py-1.5">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-[var(--casa-ink)]">{c.course}</span>
                        <span className="block text-xs text-[var(--casa-muted)] tabular-nums">{c.time}</span>
                      </span>
                      <span className={cn('shrink-0 text-xs font-semibold', c.room ? 'text-[var(--casa-ink)]' : 'text-[#8a5a00]')}>{c.room ?? 'No room'}</span>
                    </li>
                  ))}
                </ul>
              </Popover>
            ) : (
              <Key>Classes</Key>
            )}
            {ev.exam.length ? (
              <PopKey label="Exams" names={ev.exam}>
                Exam | {ev.exam.length}
              </PopKey>
            ) : (
              <Key>Exam</Key>
            )}
            {can.catalogue ? (
              <Key href="/admin/catalogue" state={day.roomClashes.length ? 'clash' : 'plain'} count={day.roomClashes.length || undefined}>
                Clash
              </Key>
            ) : (
              <span />
            )}

            {can.teaching ? (
              <>
                <Key href={planHref} state={f.conflicts || f.unplanned ? 'has' : 'plain'}>
                  Teachers
                </Key>
                <Key href={`/admin/kursplanung/kurse${planMonth ? `?month=${planMonth}` : ''}`}>Timetable</Key>
                <Key href={planHref} state={f.conflicts ? 'clash' : 'plain'} count={f.conflicts || undefined}>
                  Conflicts
                </Key>
                <Key href={planHref} state={f.unplanned ? 'warn' : 'plain'} count={f.unplanned || undefined}>
                  Vacant
                </Key>
              </>
            ) : null}
          </div>

          <div className="bg-white">
            <BlockHead>Reception</BlockHead>
            {!day.office || (day.office.shifts.length === 0 && day.office.gaps.length === 0) ? (
              <p className="px-2.5 pb-2 text-[0.76rem] text-[#a3a9b1]">{can.rota ? 'No rota' : ''}</p>
            ) : (
              <ul className="pb-1.5 text-[0.78rem]">
                {day.office.shifts
                  .filter((s) => !day.office!.clashes.includes(s))
                  .map((s) => (
                    <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 px-2.5 py-px">
                      <span className="min-w-0 truncate text-[var(--casa-ink)]">
                        {s.staffName}
                        {s.note ? <span className="ml-1.5 text-[0.7rem] text-[#7a828c]">{s.note}</span> : null}
                      </span>
                      <span className="font-semibold text-[#2b3546] tabular-nums">
                        {s.startsAt}–{s.endsAt}
                      </span>
                    </li>
                  ))}
                {day.office.gaps.map((g) => (
                  <li key={g.from} className="px-2.5 py-px font-semibold text-[#8a5a00] tabular-nums">
                    Open {g.from}–{g.to}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white">
            <BlockHead count={day.office?.away.length}>Away · office</BlockHead>
            <ol className="pb-1.5 text-[0.78rem]">
              {(day.office?.away ?? []).map((a, i) => (
                <li
                  key={a.id}
                  className={cn('grid grid-cols-[0.9rem_minmax(0,1fr)_auto_auto] items-center gap-1.5 px-2.5 py-px', showReason && a.reason === 'sick' && 'bg-[var(--fm-sick)]')}
                >
                  <span className="text-[0.7rem] text-[#9aa0a8] italic">{i + 1}</span>
                  <span className="truncate text-[var(--casa-ink)]">{a.staffName}</span>
                  <span className="text-[0.7rem] text-[#59616b] tabular-nums">{a.toDate > day.date ? `–${ddmm(a.toDate)}` : ''}</span>
                  <Code code={showReason ? OFFICE_CODE[a.reason] : '–'} />
                </li>
              ))}
            </ol>
          </div>

          {can.teaching ? (
            <div className="bg-white">
              <BlockHead count={day.teachersAway.length}>Away · teaching</BlockHead>
              <ol className="pb-1.5 text-[0.78rem]">
                {day.teachersAway.map((t, i) => (
                  <li key={`${t.name}-${t.from}`} className={cn('grid grid-cols-[0.9rem_minmax(0,1fr)_auto_auto] items-center gap-1.5 px-2.5 py-px', t.reason === 'Krank' && 'bg-[var(--fm-sick)]')}>
                    <span className="text-[0.7rem] text-[#9aa0a8] italic">{i + 1}</span>
                    <span className="truncate text-[var(--casa-ink)]">{t.name}</span>
                    <span className="text-[0.7rem] text-[#59616b] tabular-nums">{t.to > day.date ? `–${ddmm(t.to)}` : ''}</span>
                    <Code code={TEACHER_CODE[t.reason] ?? '–'} />
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}

/** FileMaker's FirstDayStudent / FirstDayAcco box: the label, and the count large; the names in a panel. */
function Arrival({ label, names, big = false }: { label: string; names: readonly Named[]; big?: boolean }) {
  const body = (
    <span className="flex items-baseline justify-between gap-2 px-1.5 py-0.5">
      <span className="text-[0.72rem] font-semibold text-[var(--fm-blue)]">{label}</span>
      <span className={cn('font-extrabold tabular-nums', big ? 'text-[1.35rem] leading-none' : 'text-[0.95rem]', names.length ? 'text-[var(--casa-ink)]' : 'text-[#b4b9bf]')}>
        {names.length}
      </span>
    </span>
  );
  if (!names.length) return body;
  return (
    <Popover label={label} width={300} trigger={body}>
      <Names names={names} />
    </Popover>
  );
}

function Inline({ label, names }: { label: string; names: readonly Named[] }) {
  return (
    <Popover label={label} width={300} trigger={<span className="rounded-[3px] bg-white px-1.5 py-0.5 font-bold text-[var(--fm-blue)]">{label} | {names.length}</span>}>
      <Names names={names} />
    </Popover>
  );
}
