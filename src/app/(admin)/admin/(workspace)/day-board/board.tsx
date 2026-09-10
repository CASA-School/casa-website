import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Badge, Card, DateText, EmptyState } from '@/components/admin/ui';
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
        <section className="mb-5 rounded-lg border border-[var(--casa-warning-text)]/35 bg-[var(--casa-warning-text)]/6 p-3">
          <h3 className="mb-2 text-xs font-semibold text-[var(--casa-warning-text)]">
            Still open from earlier
          </h3>
          <ul className="space-y-1">
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
          </ul>
        </section>
      ) : null}

      {open.length === 0 && done.length === 0 ? (
        <EmptyState
          title="Nothing written down for this day"
          description={
            canWrite
              ? 'Add what needs doing and the whole team sees it.'
              : 'The team has not added anything.'
          }
        />
      ) : (
        <div className="space-y-4">
          {AREA_ORDER.map((area) => {
            const rows = open.filter((t) => t.area === area);
            if (rows.length === 0) return null;
            return (
              <section key={area}>
                <h3 className="mb-1.5 flex items-baseline gap-2 text-xs font-semibold text-[var(--casa-ink)]">
                  {AREA_LABELS[area]}
                  <span className="font-normal text-[var(--casa-text-subtle)]">{rows.length}</span>
                </h3>
                <ul className="space-y-1">
                  {rows.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      date={date}
                      staff={staff}
                      canWrite={canWrite}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          {done.length > 0 ? (
            <section className="border-t border-ws-line-soft pt-3">
              <h3 className="mb-1.5 text-xs font-semibold text-[var(--casa-text-subtle)]">
                Finished today · {done.length}
              </h3>
              <ul className="space-y-1">
                {done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    date={date}
                    staff={staff}
                    canWrite={canWrite}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Card>
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
    <li className="group/row flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-ws-sunk">
      {canWrite ? (
        <form action={toggleDayTaskAction} className="shrink-0 pt-px">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="done" value={finished ? 'false' : 'true'} />
          <button
            type="submit"
            aria-label={finished ? `Reopen: ${task.title}` : `Mark done: ${task.title}`}
            className={cn(
              'flex size-[1.15rem] items-center justify-center rounded-[0.3rem] border transition-colors',
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
        <span aria-hidden="true" className="mt-1 size-[1.15rem] shrink-0" />
      )}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm leading-snug',
            finished ? 'text-[var(--casa-text-subtle)] line-through' : 'text-[var(--casa-ink)]'
          )}
        >
          {task.title}
        </span>
        {task.detail ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--casa-text-subtle)]">
            {task.detail}
          </span>
        ) : null}
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--casa-text-subtle)]">
          {showDate ? (
            <Badge tone="warning">
              <DateText value={task.onDate} compact />
            </Badge>
          ) : null}
          {task.assigneeName ? (
            <span className="font-medium text-[var(--casa-muted)]">{task.assigneeName}</span>
          ) : (
            <span>Anyone</span>
          )}
          {finished && task.doneByName ? <span>· done by {task.doneByName}</span> : null}
        </span>
      </span>

      {canWrite ? (
        <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
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
