import type { ReactNode } from 'react';

import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Owner } from '@/components/admin/list';
import { Card, DateText } from '@/components/admin/ui';
import type { DayTask } from '@/lib/admin/day-board';
import { cn } from '@/lib/utils';
import { AREA_LABELS, AREA_ORDER } from './areas';
import { deleteDayTaskAction, toggleDayTaskAction } from './actions';
import { TaskForm } from './task-form';

/**
 * The day's tasks, a checklist.
 *
 * Calm on purpose: it is the first thing the team reads in the morning. A task
 * left from an earlier day comes first, under "From earlier", and its date is
 * the one warm thing — amber text, not a yellow band over the card. The area
 * is a word, not a hue, and the groups show only when there is more than one.
 * On the right, whose it is, as a colleague's initials; nobody's is nothing.
 * Edit and Delete take that place while the row is hovered or focused, so
 * twenty tasks do not carry forty buttons.
 *
 * Ticking a task is a form submission, so the board works with no JavaScript
 * and the name of whoever ticked it is recorded either way.
 */
export function DayBoard({
  date,
  today,
  overdue,
  staff,
  canWrite,
  away,
}: {
  date: string;
  today: readonly DayTask[];
  overdue: readonly DayTask[];
  staff: readonly { id: string; name: string }[];
  canWrite: boolean;
  /** Colleagues away that day (the rota): their tasks show it. */
  away?: ReadonlySet<string>;
}) {
  const open = today.filter((t) => !t.doneAt);
  const done = today.filter((t) => t.doneAt);
  // Groups earn their headings only when there is more than one of them.
  const grouped = (overdue.length > 0 ? 1 : 0) + new Set(open.map((t) => t.area)).size + (done.length > 0 ? 1 : 0) > 1;

  return (
    <Card
      title="Tasks"
      icon={Icon.check}
      tint="ink"
      bleed
      actions={
        canWrite ? (
          <FormDialog
            trigger="Add a task"
            title="Add to the day"
            triggerVariant="secondary"
            size="sm"
          >
            <TaskForm date={date} staff={staff} />
          </FormDialog>
        ) : undefined
      }
    >
      {overdue.length > 0 ? (
        <TaskGroup label="From earlier" count={overdue.length} tone="warm">
          {overdue.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              date={date}
              staff={staff}
              canWrite={canWrite}
              away={away}
              showDate
            />
          ))}
        </TaskGroup>
      ) : null}

      {open.length === 0 && done.length === 0 ? (
        overdue.length > 0 ? null : (
          <p className="px-5 py-8 text-center text-sm text-[var(--casa-text-subtle)]">Nothing on the list for this day.</p>
        )
      ) : (
        <>
          {AREA_ORDER.map((area) => {
            const rows = open.filter((t) => t.area === area);
            if (rows.length === 0) return null;
            return (
              <TaskGroup key={area} label={grouped ? AREA_LABELS[area] : ''} count={rows.length}>
                {rows.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    date={date}
                    staff={staff}
                    canWrite={canWrite}
                    away={away}
                  />
                ))}
              </TaskGroup>
            );
          })}

          {done.length > 0 ? (
            <TaskGroup label="Done" count={done.length} tone="quiet">
              {done.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  date={date}
                  staff={staff}
                  canWrite={canWrite}
                  away={away}
                />
              ))}
            </TaskGroup>
          ) : null}
        </>
      )}
    </Card>
  );
}

const GROUP_TONES = {
  plain: 'text-[var(--casa-muted)]',
  warm: 'text-[#9a5b00]',
  quiet: 'text-[var(--casa-text-subtle)]',
} as const;

function TaskGroup({
  label,
  count,
  tone = 'plain',
  children,
}: {
  label: string;
  count: number;
  tone?: keyof typeof GROUP_TONES;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-ws-line-soft last:border-b-0">
      {label ? (
        <h3 className={cn('flex items-center gap-1.5 border-b border-ws-line-soft bg-[#f8fafc] px-5 pt-3 pb-2 text-xs font-bold', GROUP_TONES[tone])}>
          {label}
          <span className="font-semibold opacity-60">{count}</span>
        </h3>
      ) : null}
      <ul className="divide-y divide-ws-line-soft">{children}</ul>
    </section>
  );
}

function TaskRow({
  task,
  date,
  staff,
  canWrite,
  away,
  showDate = false,
}: {
  task: DayTask;
  date: string;
  staff: readonly { id: string; name: string }[];
  canWrite: boolean;
  away?: ReadonlySet<string>;
  showDate?: boolean;
}) {
  const finished = Boolean(task.doneAt);

  return (
    <li className="group/row relative flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#f7f9fc]">
      {canWrite ? (
        <form action={toggleDayTaskAction} className="shrink-0 pt-px">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="done" value={finished ? 'false' : 'true'} />
          <button
            type="submit"
            aria-label={finished ? `Reopen: ${task.title}` : `Mark done: ${task.title}`}
            className={cn(
              'flex size-[18px] items-center justify-center rounded-lg border transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
              finished
                ? 'border-[var(--casa-success-text)] bg-[var(--casa-success-text)] text-white'
                : 'border-ws-line-firm bg-white hover:border-[var(--casa-blue)]'
            )}
          >
            {finished ? (
              <svg
                viewBox="0 0 16 16"
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m3.5 8.5 3 3 6-7" />
              </svg>
            ) : null}
          </button>
        </form>
      ) : (
        <span aria-hidden="true" className="size-[18px] shrink-0" />
      )}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm leading-snug',
            finished
              ? 'text-[var(--casa-text-subtle)] line-through'
              : 'font-semibold text-[var(--casa-ink)]'
          )}
        >
          {task.title}
        </span>
        {task.detail ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--casa-text-subtle)]">
            {task.detail}
          </span>
        ) : null}
        {finished && task.doneByName ? (
          <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">
            Done by {task.doneByName}
          </span>
        ) : null}
      </span>

      {/*
       * Whose it is, on the right. The minimum width keeps room for Edit and
       * Delete, which take this place on hover, so they never cover the title.
       */}
      <span
        className={cn(
          'flex min-w-[7.5rem] shrink-0 items-center justify-end gap-3 text-xs transition-opacity',
          canWrite ? 'group-focus-within/row:opacity-0 group-hover/row:opacity-0' : undefined
        )}
      >
        {showDate ? (
          <span className="font-semibold text-[#9a5b00]">
            <DateText value={task.onDate} compact />
          </span>
        ) : null}
        {/* A fixed place for the initials, so the dates line up with or without them. */}
        <span className="flex w-6 justify-center">
          <Owner name={task.assigneeName} away={!!task.assigneeName && !task.doneAt && !!away?.has(task.assigneeName)} />
        </span>
      </span>

      {canWrite ? (
        <span className="absolute top-2 right-3 flex items-center gap-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          <FormDialog trigger="Edit" title="Edit the task" triggerVariant="ghost" size="sm">
            <TaskForm date={date} task={task} staff={staff} />
          </FormDialog>
          <form action={deleteDayTaskAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="date" value={date} />
            <ConfirmSubmit
              title="Delete this task?"
              description={`"${task.title}" is removed from the board for everyone.`}
              confirmLabel="Delete"
              variant="ghost"
            >
              Delete
            </ConfirmSubmit>
          </form>
        </span>
      ) : null}
    </li>
  );
}
