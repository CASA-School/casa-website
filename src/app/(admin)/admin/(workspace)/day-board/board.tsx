import type { ReactNode } from 'react';

import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Badge, Card, DateText } from '@/components/admin/ui';
import type { DayTask } from '@/lib/admin/day-board';
import { cn } from '@/lib/utils';
import { AREA_LABELS, AREA_ORDER } from './areas';
import { deleteDayTaskAction, toggleDayTaskAction } from './actions';
import { TaskForm } from './task-form';

/**
 * The day board.
 *
 * Colour here means STATE, never category: an unfinished task from an earlier
 * day is the only warm thing on the screen, and a finished one recedes. The
 * area is a word, not a hue — six categorical colours on a screen staff read
 * every morning is the "confusing contrast" the workspace is trying to avoid.
 *
 * The card's body runs edge to edge, like a table: each group is a light band
 * with its name and count, and each task a row under it — the tick, what needs
 * doing, and on the right whose it is. Edit and Delete take that right-hand
 * place while the row is hovered or focused, so twenty tasks do not carry forty
 * buttons.
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
}: {
  date: string;
  today: readonly DayTask[];
  overdue: readonly DayTask[];
  staff: readonly { id: string; name: string }[];
  canWrite: boolean;
}) {
  const open = today.filter((t) => !t.doneAt);
  const done = today.filter((t) => t.doneAt);

  return (
    <Card
      title="The day board"
      icon={Icon.check}
      tint="green"
      bleed
      actions={
        canWrite ? (
          <FormDialog
            trigger="Add a task"
            title="Add to the day"
            triggerVariant="primary"
            size="sm"
          >
            <TaskForm date={date} staff={staff} />
          </FormDialog>
        ) : undefined
      }
    >
      {overdue.length > 0 ? (
        <TaskGroup label="Still open from earlier" count={overdue.length} tone="warm">
          {overdue.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              date={date}
              staff={staff}
              canWrite={canWrite}
              showDate
            />
          ))}
        </TaskGroup>
      ) : null}

      {open.length === 0 && done.length === 0 && overdue.length > 0 ? (
        <p className="border-t border-ws-line-soft px-4 py-3 text-sm text-[var(--casa-text-subtle)]">Nothing new for this day.</p>
      ) : open.length === 0 && done.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-extrabold text-[var(--casa-ink)]">
            Nothing written down for this day
          </p>
          <p className="mt-1 text-sm text-[var(--casa-text-subtle)]">
            {canWrite
              ? 'Add what needs doing and the whole team sees it.'
              : 'The team has not added anything.'}
          </p>
        </div>
      ) : (
        <>
          {AREA_ORDER.map((area) => {
            const rows = open.filter((t) => t.area === area);
            if (rows.length === 0) return null;
            return (
              <TaskGroup key={area} label={AREA_LABELS[area]} count={rows.length}>
                {rows.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    date={date}
                    staff={staff}
                    canWrite={canWrite}
                  />
                ))}
              </TaskGroup>
            );
          })}

          {done.length > 0 ? (
            <TaskGroup label="Finished today" count={done.length} tone="quiet">
              {done.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  date={date}
                  staff={staff}
                  canWrite={canWrite}
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
  plain: { band: 'bg-[#f8fafc] text-[var(--casa-ink)]', body: '' },
  warm: { band: 'bg-[#fff7cc] text-[#6b5600]', body: 'bg-[#fffdf3]' },
  quiet: { band: 'bg-[#f8fafc] text-[var(--casa-text-subtle)]', body: '' },
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
    <section className={cn('border-b border-ws-line-soft last:border-b-0', GROUP_TONES[tone].body)}>
      <h3
        className={cn(
          'flex items-center gap-2 border-b border-ws-line-soft px-4 py-2 text-xs font-bold',
          GROUP_TONES[tone].band
        )}
      >
        {tone === 'warm' ? (
          <span aria-hidden="true" className="[&_svg]:size-3.5">
            {Icon.attention}
          </span>
        ) : null}
        {label}
        <span className="font-semibold opacity-60">{count}</span>
      </h3>
      <ul className="divide-y divide-ws-line-soft">{children}</ul>
    </section>
  );
}

function TaskRow({
  task,
  date,
  staff,
  canWrite,
  showDate = false,
}: {
  task: DayTask;
  date: string;
  staff: readonly { id: string; name: string }[];
  canWrite: boolean;
  showDate?: boolean;
}) {
  const finished = Boolean(task.doneAt);

  return (
    <li className="group/row relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#0f172a]/[0.025]">
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
          'flex min-w-[7.5rem] shrink-0 items-center justify-end gap-2 pt-px text-xs transition-opacity',
          canWrite ? 'group-focus-within/row:opacity-0 group-hover/row:opacity-0' : undefined
        )}
      >
        {showDate ? (
          <Badge tone="warning">
            <DateText value={task.onDate} compact />
          </Badge>
        ) : null}
        <span
          className={cn(
            'inline-flex items-center gap-1 whitespace-nowrap [&_svg]:size-3.5',
            task.assigneeName
              ? 'font-semibold text-[var(--casa-muted)]'
              : 'text-[var(--casa-text-subtle)]'
          )}
        >
          {Icon.person}
          {task.assigneeName ?? 'Anyone'}
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
