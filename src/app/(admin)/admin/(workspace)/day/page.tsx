import Link from 'next/link';
import type { ReactNode } from 'react';

import { presenceAction, setTaskStatusAction } from './actions';
import { AppointmentsPanel } from './appointments-panel';
import { DayHeader, dayLabel, pickDay, viewHref, weekOf } from './day-header';
import { EntryTestCard } from './entry-test-panel';
import { EditTaskForm, ReportAbsenceForm } from './forms';
import { Faces, PanelSection, Quiet, Tile, tileClass } from './panel-parts';
import { TaskComposer } from './task-composer';
import { ChoiceMenu } from '@/components/admin/choice-menu';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/list';
import { SidePanel } from '@/components/admin/side-panel';
import { Button, ButtonLink, Card } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import {
  awayOn,
  awaySoon,
  birthdaysSoon,
  dayLessons,
  dayTasks,
  deskColleagues,
  missingCover,
  openTasksByDay,
  registerColleagues,
  taskColleagues,
  type DayLesson,
  type DayTask,
  type DeskColleague,
} from '@/lib/admin/day-plan';
import { DESK_LABELS, SESSION_LABELS, SESSIONS, TASK_STATUS_DOTS, TASK_STATUS_LABELS, TASK_STATUSES } from '@/lib/admin/day-plan-labels';
import { berlinDay } from '@/lib/admin/days';
import { archivePastSittings, entryTestOrigin, entryTestViews } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { ABSENCE_LABELS, type AbsenceReason } from '@/lib/admin/kursplanung/types';
import { cn } from '@/lib/utils';

/**
 * The Tagesplan's overview (Rahman, 2026-10-19): FileMaker's calendar — Cmd+1, the screen the team
 * opens first — without everything laid out at once ("this will make people afraid"). The day's tasks
 * are the page, as they were the first thing a colleague at the desk named; above them, five quiet
 * tiles — who is in, who is away, the lessons, the appointments, birthdays — each opening a side
 * panel with the rest. Done tasks fold away. The lessons have their own pages, Kurse and Raumplan
 * (docs/ADMIN_WORKSPACE.md §Tagesplan).
 */
export default async function DayPage({ searchParams }: { searchParams: Promise<{ date?: string; error?: string; termine?: string }> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('day'), getI18n()]);
  const today = berlinDay(new Date());
  const day = pickDay(params.date, today);
  const week = weekOf(day);
  const canEdit = canAccess(user, 'day', 'edit');
  const canDelete = canAccess(user, 'day', 'full');

  const [tasks, openByDay, lessons, desk, away, soon, cover, birthdays, colleagues, register, entryTests] = await Promise.all([
    dayTasks(day, today),
    openTasksByDay(week[0], week[6]),
    dayLessons(day),
    deskColleagues(day, user),
    awayOn(day),
    awaySoon(day),
    missingCover(day),
    birthdaysSoon(day),
    canEdit ? taskColleagues() : Promise.resolve([]),
    canEdit ? registerColleagues() : Promise.resolve([]),
    archivePastSittings().then(async () => entryTestViews(day, await entryTestOrigin())),
  ]);
  const isToday = day === today;
  const dayName = isToday ? t('heute', 'today') : dayLabel(day, lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const longDay = dayLabel(day, lang, { weekday: 'long', day: 'numeric', month: 'long' });

  const present = desk.filter((c) => !c.away && (c.presence || c.shift));
  const reception = desk.filter((c) => c.desk === 'front' && !c.away && c.shift);
  const receptionHours = reception.length ? `${reception.map((c) => c.shift!.from).sort()[0]}–${reception.map((c) => c.shift!.to).sort().at(-1)}` : null;
  const ill = away.filter((a) => a.reason === 'Krank').length;
  const rooms = new Set(lessons.filter((l) => l.roomId && !l.cancelled).map((l) => l.roomId)).size;
  const covers = lessons.filter((l) => l.substitute).length;
  const uncovered = lessons.filter((l) => l.teacherAway && !l.cancelled).length;
  const openCount = tasks.filter((x) => x.status !== 'done').length;

  return (
    <>
      <DayHeader
        view="overview"
        day={day}
        today={today}
        openByDay={openByDay}
        lessons={lessons.length}
        flats={canAccess(user, 'accommodation')}
        tests={entryTests.length > 0}
        t={t}
        lang={lang}
      />

      {params.error ? (
        <p role="alert" className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : null}

      {/* Five tiles: the figure that matters and a line under it; the rest one click away, at the side. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SidePanel
          triggerClassName={tileClass}
          trigger={
            <Tile icon={Icon.team} tint="ink" label={t('Im Haus', 'In the building')} value={desk.length ? t(`${present.length} da`, `${present.length} in`) : '—'} detail={receptionHours ? t(`Rezeption ${receptionHours}`, `Reception ${receptionHours}`) : undefined}>
              <Faces names={present.map((c) => c.name)} />
            </Tile>
          }
          title={t('Im Haus', 'In the building')}
          subtitle={longDay}
          icon={Icon.team}
          footer={<PresenceFoot colleagues={desk} isToday={isToday} canEdit={canEdit} t={t} />}
        >
          <DeskList colleagues={desk} t={t} lang={lang} />
        </SidePanel>

        <SidePanel
          triggerClassName={tileClass}
          trigger={
            <Tile
              icon={Icon.calendar}
              tint="sun"
              label={t('Abwesend', 'Away')}
              value={String(away.length)}
              detail={away.length ? away.map((a) => a.name.split(' ')[0]).join(', ') : t('Alle sind da', 'Everyone is in')}
              alert={ill ? { tone: 'sun', text: ill === 1 ? t('1 krank', '1 ill') : t(`${ill} krank`, `${ill} ill`) } : undefined}
            />
          }
          title={t('Abwesend', 'Away')}
          subtitle={longDay}
          icon={Icon.calendar}
          tint="sun"
          footer={
            canEdit ? (
              <FormDialog icon={Icon.calendar} tint="sun" trigger={t('Abwesenheit eintragen', 'Report an absence')} title={t('Abwesenheit eintragen', 'Report an absence')} size="sm">
                <ReportAbsenceForm day={day} colleagues={register} />
              </FormDialog>
            ) : undefined
          }
        >
          <PanelSection title={t('An diesem Tag', 'On this day')}>
            {away.length ? (
              <ul>
                {away.map((a) => (
                  <PersonLine
                    key={a.staffId}
                    name={a.name}
                    aside={<ReasonChip reason={a.reason} lang={lang} />}
                    sub={[a.teaches ? t('Lehrkraft', 'Teacher') : null, a.until ? t(`bis ${dayLabel(a.until, lang, { weekday: 'short', day: 'numeric', month: 'numeric' })}`, `until ${dayLabel(a.until, lang, { weekday: 'short', day: 'numeric', month: 'short' })}`) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                ))}
              </ul>
            ) : (
              <Quiet>{t('Alle sind da.', 'Everyone is in.')}</Quiet>
            )}
          </PanelSection>
          <PanelSection title={t('In den nächsten zwei Wochen', 'In the next two weeks')}>
            {soon.length ? (
              <ul>
                {soon.map((s) => (
                  <PersonLine
                    key={`${s.staffId}-${s.from}`}
                    name={s.name}
                    aside={<ReasonChip reason={s.reason} lang={lang} />}
                    sub={
                      s.from === s.to
                        ? dayLabel(s.from, lang, { weekday: 'short', day: 'numeric', month: 'short' })
                        : `${dayLabel(s.from, lang, { day: 'numeric', month: 'short' })} – ${dayLabel(s.to, lang, { day: 'numeric', month: 'short' })}`
                    }
                  />
                ))}
              </ul>
            ) : (
              <Quiet>{t('Niemand.', 'Nobody.')}</Quiet>
            )}
          </PanelSection>
        </SidePanel>

        <SidePanel
          triggerClassName={tileClass}
          trigger={
            <Tile
              icon={Icon.catalogue}
              tint="blue"
              label={t('Unterricht', 'Lessons')}
              value={lessons.length === 1 ? t('1 Kurs', '1 course') : t(`${lessons.length} Kurse`, `${lessons.length} courses`)}
              detail={lessons.length ? [t(`${rooms} Räume`, `${rooms} rooms`), covers ? t(`${covers} Vertretung`, `${covers} cover`) : null].filter(Boolean).join(' · ') : t('Kein Unterricht', 'No lessons')}
              alert={
                uncovered || cover.length
                  ? { tone: 'red', text: uncovered ? t(`${uncovered} ohne Lehrkraft`, `${uncovered} without a teacher`) : t(`${cover.length} bald ohne Vertretung`, `${cover.length} soon without cover`) }
                  : undefined
              }
            />
          }
          title={t('Unterricht', 'Lessons')}
          subtitle={longDay}
          icon={Icon.catalogue}
          tint="blue"
          footer={
            <span className="flex flex-wrap gap-2">
              <ButtonLink href={viewHref('courses', day, today)} variant="primary" size="sm">
                {t('Kurse ansehen', 'See the courses')}
              </ButtonLink>
              <ButtonLink href={viewHref('rooms', day, today)} variant="secondary" size="sm">
                {t('Raumplan', 'Room plan')}
              </ButtonLink>
            </span>
          }
        >
          <PanelSection title={t('Der Tag', 'The day')}>
            <SessionSummary lessons={lessons} t={t} lang={lang} />
          </PanelSection>
          <PanelSection title={t('Ohne Vertretung, nächste zwei Wochen', 'Without cover, next two weeks')} tone={cover.length ? 'red' : undefined}>
            {cover.length ? (
              <ul>
                {cover.map((c, i) => (
                  <li key={`${c.courseId}-${c.date}-${i}`}>
                    <Link
                      href={`/admin/catalogue/courses/${c.courseId}${c.groupIndex > 1 ? `/${c.groupIndex}` : ''}`}
                      className="flex items-baseline gap-3 px-6 py-2 text-[0.84rem] transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]"
                    >
                      <span className="w-[5rem] shrink-0 text-[var(--casa-muted)] tabular-nums">{dayLabel(c.date, lang, { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-bold text-[var(--casa-ink)]">{c.label}</span> <span className="text-[var(--casa-muted)] tabular-nums">{c.startsAt}</span>
                        <span className="block truncate text-[0.78rem] text-[#b42318]">
                          {c.teacherName} · {pick(lang, ABSENCE_LABELS[c.reason])}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Quiet>{t('Alles besetzt.', 'Everything is covered.')}</Quiet>
            )}
          </PanelSection>
        </SidePanel>

        <AppointmentsPanel day={day} today={today} open={params.termine === 'mine' ? 'mine' : params.termine === '1' ? 'all' : null} />

        <SidePanel
          triggerClassName={tileClass}
          trigger={
            <Tile
              icon={Icon.award}
              tint="sun"
              label={t('Geburtstage', 'Birthdays')}
              value={birthdays[0] ? (birthdays[0].inDays === 0 ? t('Heute', 'Today') : birthdays[0].inDays === 1 ? t('Morgen', 'Tomorrow') : dayLabel(birthdays[0].date, lang, { weekday: 'short', day: 'numeric', month: 'short' })) : '—'}
              detail={
                birthdays.length
                  ? birthdays
                      .filter((b) => b.inDays === birthdays[0].inDays)
                      .map((b) => b.name.split(' ')[0])
                      .join(', ')
                  : t('Keine in zwei Wochen', 'None in two weeks')
              }
            />
          }
          title={t('Geburtstage', 'Birthdays')}
          subtitle={t('Die nächsten zwei Wochen', 'The next two weeks')}
          icon={Icon.award}
          tint="sun"
        >
          {birthdays.length ? (
            <ul className="py-2">
              {birthdays.map((b) => (
                <PersonLine
                  key={b.staffId}
                  name={b.name}
                  aside={
                    <span className={cn('text-[0.8rem] font-semibold whitespace-nowrap', b.inDays === 0 ? 'text-[#b45309]' : 'text-[var(--casa-muted)]')}>
                      {b.inDays === 0 ? t('Heute', 'Today') : b.inDays === 1 ? t('Morgen', 'Tomorrow') : dayLabel(b.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  }
                />
              ))}
            </ul>
          ) : (
            <Quiet>{t('Keine in den nächsten zwei Wochen.', 'None in the next two weeks.')}</Quiet>
          )}
        </SidePanel>
      </div>

      {entryTests.length ? <EntryTestCard tests={entryTests} day={day} archived={day < today} canEdit={canEdit} canDelete={canDelete} /> : null}

      <Card
        title={t('Aufgaben', 'Tasks')}
        icon={Icon.check}
        tint="ink"
        bleed
        actions={tasks.length ? <span className="text-[0.8rem] font-semibold text-[var(--casa-muted)] tabular-nums">{t(`${openCount} offen`, `${openCount} open`)}</span> : null}
      >
        {canEdit ? <TaskComposer day={day} dayName={dayName} colleagues={colleagues} /> : null}
        <TaskList tasks={tasks} day={day} t={t} lang={lang} canEdit={canEdit} canDelete={canDelete} colleagues={colleagues} />
      </Card>
    </>
  );
}

function PersonLine({ name, sub, aside }: { name: string; sub?: string; aside?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-6 py-2">
      <Avatar name={name} staff size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{name}</span>
        {sub ? <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">{sub}</span> : null}
      </span>
      {aside}
    </li>
  );
}

function ReasonChip({ reason, lang }: { reason: AbsenceReason; lang: WsLang }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[0.72rem] font-bold', reason === 'Krank' ? 'bg-[#fff2d6] text-[#6e4700]' : 'bg-ws-sunk text-[var(--casa-muted)]')}>
      {pick(lang, ABSENCE_LABELS[reason])}
    </span>
  );
}

/** Reception and the office: the usual shift, or when they came and went; away is said, not hidden. */
function DeskList({ colleagues, t, lang }: { colleagues: DeskColleague[]; t: T; lang: WsLang }) {
  if (colleagues.length === 0) return <Quiet>{t('Niemand eingetragen.', 'Nobody set up.')}</Quiet>;
  return (
    <>
      {(['front', 'back'] as const).map((desk) => {
        const rows = colleagues.filter((c) => c.desk === desk);
        if (!rows.length) return null;
        return (
          <PanelSection key={desk} title={pick(lang, DESK_LABELS[desk])}>
            <ul>
              {rows.map((c) => (
                <PersonLine
                  key={c.staffId}
                  name={c.name}
                  aside={
                    c.away ? (
                      <ReasonChip reason={c.away} lang={lang} />
                    ) : (
                      <span className="text-[0.84rem] font-semibold whitespace-nowrap text-[var(--casa-ink)] tabular-nums">
                        {c.presence ? (c.presence.to ? `${c.presence.from}–${c.presence.to}` : t(`seit ${c.presence.from}`, `since ${c.presence.from}`)) : c.shift ? `${c.shift.from}–${c.shift.to}` : '—'}
                      </span>
                    )
                  }
                />
              ))}
            </ul>
          </PanelSection>
        );
      })}
    </>
  );
}

/** „Ich bin da" / „Ich gehe" for the colleague behind the account, today only. */
function PresenceFoot({ colleagues, isToday, canEdit, t }: { colleagues: DeskColleague[]; isToday: boolean; canEdit: boolean; t: T }) {
  const me = colleagues.find((c) => c.me && !c.away);
  if (!isToday || !canEdit || !me || (me.presence && me.presence.to)) return null;
  return (
    <form action={presenceAction}>
      <input type="hidden" name="what" value={me.presence ? 'went' : 'came'} />
      <Button type="submit" size="sm">
        {me.presence ? t('Ich gehe', 'I’m leaving') : t('Ich bin da', 'I’m in')}
      </Button>
    </form>
  );
}

/** The lessons of the day by part: how many, and when. */
function SessionSummary({ lessons, t, lang }: { lessons: DayLesson[]; t: T; lang: WsLang }) {
  const rows = SESSIONS.map((s) => ({ s, items: lessons.filter((l) => l.session === s && !l.cancelled) })).filter((r) => r.items.length);
  if (!rows.length) return <Quiet>{t('An diesem Tag ist kein Unterricht.', 'No lessons on this day.')}</Quiet>;
  return (
    <ul>
      {rows.map(({ s, items }) => {
        const from = items.map((l) => l.startsAt).filter(Boolean).sort()[0];
        const to = items.map((l) => l.endsAt).filter(Boolean).sort().at(-1);
        return (
          <li key={s} className="flex items-baseline gap-3 px-6 py-2 text-[0.88rem]">
            <span className="w-[6.5rem] shrink-0 font-semibold text-[var(--casa-ink)]">{pick(lang, SESSION_LABELS[s])}</span>
            <span className="text-[var(--casa-muted)] tabular-nums">{from && to ? `${from}–${to}` : ''}</span>
            <span className="ml-auto font-semibold text-[var(--casa-ink)] tabular-nums">{items.length === 1 ? t('1 Kurs', '1 course') : t(`${items.length} Kurse`, `${items.length} courses`)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The day's tasks: the open ones by their time; those carried over from the days before above them,
 * and the done ones folded away under them.
 */
function TaskList({
  tasks,
  day,
  t,
  lang,
  canEdit,
  canDelete,
  colleagues,
}: {
  tasks: DayTask[];
  day: string;
  t: T;
  lang: WsLang;
  canEdit: boolean;
  canDelete: boolean;
  colleagues: readonly { id: string; name: string }[];
}) {
  if (tasks.length === 0) return <p className="px-4 py-6 text-center text-[0.86rem] text-[var(--casa-muted)]">{t('Für diesen Tag ist nichts eingetragen.', 'Nothing written down for this day.')}</p>;
  const carried = tasks.filter((x) => x.carried);
  const open = tasks.filter((x) => !x.carried && x.status !== 'done');
  const done = tasks.filter((x) => !x.carried && x.status === 'done');
  const row = (task: DayTask) => <TaskRow key={task.id} task={task} day={day} t={t} lang={lang} canEdit={canEdit} canDelete={canDelete} colleagues={colleagues} />;
  return (
    <div>
      {carried.length ? (
        <Fold label={t('Von den Tagen davor, noch offen', 'From the days before, still open')} count={carried.length} open tone="sun">
          <ul>{carried.map(row)}</ul>
        </Fold>
      ) : null}
      {open.length ? <ul>{open.map(row)}</ul> : <p className="px-4 py-5 text-center text-[0.86rem] text-[var(--casa-muted)]">{t('Alles erledigt.', 'All done.')}</p>}
      {done.length ? (
        <Fold label={t('Erledigt', 'Done')} count={done.length}>
          <ul>{done.map(row)}</ul>
        </Fold>
      ) : null}
    </div>
  );
}

/** A group that folds: its name and count as a row; open when it asks to be read. */
function Fold({ label, count, open = false, tone, children }: { label: string; count: number; open?: boolean; tone?: 'sun'; children: ReactNode }) {
  return (
    <details open={open} className="group/fold border-t border-ws-line-soft first:border-t-0">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[0.8rem] font-bold outline-none select-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)] [&::-webkit-details-marker]:hidden',
          tone === 'sun' ? 'bg-[#fffaf0] text-[#6e4700]' : 'text-[var(--casa-muted)]'
        )}
      >
        <span aria-hidden="true" className="transition-transform group-open/fold:rotate-90 [&_svg]:size-3.5">
          {Icon.chevronRight}
        </span>
        {label}
        <span className="font-semibold tabular-nums">{count}</span>
      </summary>
      {children}
    </details>
  );
}

function TaskRow({
  task,
  day,
  t,
  lang,
  canEdit,
  canDelete,
  colleagues,
}: {
  task: DayTask;
  day: string;
  t: T;
  lang: WsLang;
  canEdit: boolean;
  canDelete: boolean;
  colleagues: readonly { id: string; name: string }[];
}) {
  const done = task.status === 'done';
  return (
    <li className="group flex items-start gap-3 border-t border-ws-line-soft px-4 py-3 first:border-t-0">
      <span className="w-[3.25rem] shrink-0 pt-0.5 text-[0.82rem] font-semibold text-[var(--casa-ink)] tabular-nums">
        {task.carried ? (
          <span className="text-[var(--casa-muted)]">{dayLabel(task.date, lang, { day: 'numeric', month: 'numeric' })}</span>
        ) : task.startsAt ? (
          <>
            {task.startsAt}
            {task.endsAt ? <span className="block text-[0.72rem] font-medium text-[var(--casa-muted)]">{task.endsAt}</span> : null}
          </>
        ) : (
          <span aria-hidden="true" className="mt-1.5 ml-1 block size-1.5 rounded-full bg-ws-line" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[0.9rem] leading-snug whitespace-pre-line', done ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]')}>{task.body}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[0.75rem] text-[var(--casa-muted)]">
          {task.assigneeName ? <span className="font-semibold text-[var(--fm-navy)]">{t(`für ${task.assigneeName}`, `for ${task.assigneeName}`)}</span> : null}
          {task.authorName ? <span>{t(`von ${task.authorName}`, `by ${task.authorName}`)}</span> : null}
          {done && task.doneByName ? <span>{t(`erledigt von ${task.doneByName}`, `done by ${task.doneByName}`)}</span> : null}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1">
        {canEdit ? (
          <span className="transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
            <FormDialog trigger={t('Ändern', 'Edit')} triggerVariant="ghost" size="sm" icon={Icon.check} tint="ink" title={t('Aufgabe', 'Task')}>
              <EditTaskForm task={task} day={day} colleagues={colleagues} canDelete={canDelete} />
            </FormDialog>
          </span>
        ) : null}
        {canEdit ? (
          <ChoiceMenu
            action={setTaskStatusAction}
            fields={{ taskId: task.id }}
            name="status"
            label={t('Stand', 'Status')}
            align="end"
            triggerClassName="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
            trigger={<StatusChip status={task.status} lang={lang} />}
            choices={TASK_STATUSES.map((s) => ({
              value: s,
              label: pick(lang, TASK_STATUS_LABELS[s]),
              current: s === task.status,
              icon: <span aria-hidden="true" className={cn('size-2.5 rounded-full', TASK_STATUS_DOTS[s])} />,
            }))}
          />
        ) : (
          <StatusChip status={task.status} lang={lang} />
        )}
      </span>
    </li>
  );
}

function StatusChip({ status, lang }: { status: DayTask['status']; lang: WsLang }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.76rem] font-semibold whitespace-nowrap ring-1 ring-inset',
        status === 'done' ? 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]' : status === 'in_progress' ? 'bg-[#e8f0fd] text-[#1d4ea8] ring-[#c3d6f7]' : 'bg-white text-[var(--casa-ink)] ring-ws-line'
      )}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', TASK_STATUS_DOTS[status])} />
      {pick(lang, TASK_STATUS_LABELS[status])}
    </span>
  );
}
