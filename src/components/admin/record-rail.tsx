import {
  addNoteAction,
  assignAction,
  updateStatusAction,
} from '@/app/(admin)/admin/(workspace)/actions';
import { Popover, PopoverChoice } from './popover';
import { Badge, Button, Card, Textarea } from './ui';
import { Icon } from './icons';
import { describeActivity, type ActivityEntry } from '@/lib/admin/activity';
import type { StaffNote } from '@/lib/admin/notes';
import {
  STATUS_LABELS,
  STATUS_TONES,
  WORK_STATUSES,
  type QueueEntity,
  type WorkStatus,
} from '@/lib/admin/queues';
import { relativeDays } from './ui';

/**
 * The right-hand rail on every record screen.
 *
 * Three panels in a fixed order — where it stands, who owns it, what has been
 * said — identical for an enquiry, a registration and an application. The
 * record's own fields differ wildly between the four queues; the work done TO a
 * record does not, and putting those controls in the same place every time is
 * what lets someone work a mixed queue without re-reading the layout.
 *
 * Status is a select plus a submit rather than six buttons. Six buttons is
 * faster for one change and unreadable at a glance, because nothing shows which
 * one is current — and "what is this record's status" is asked far more often
 * than "change it".
 */
/** A label and its value on one line, with the hint that a click changes it. */
function ValueRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex min-h-11 items-center gap-3 px-2.5 py-2">
      <span className="w-14 shrink-0 text-xs font-bold text-[var(--casa-muted)]">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--casa-ink)]">{children}</span>
      <span aria-hidden="true" className="text-xs text-[var(--casa-text-subtle)]">
        Change
      </span>
    </span>
  );
}

export function RecordRail({
  entity,
  id,
  status,
  assignedTo,
  assignableStaff,
  notes,
  activity,
  noteEntity,
}: {
  entity: QueueEntity;
  id: string;
  status: WorkStatus;
  assignedTo: string | null;
  assignableStaff: readonly { id: string; name: string }[];
  notes: readonly StaffNote[];
  activity: readonly ActivityEntry[];
  /** `placement_attempt` shares the notes panel but is not a queue entity. */
  noteEntity?: string;
}) {
  const owner = assignableStaff.find((member) => member.id === assignedTo)?.name;
  return (
    <div className="space-y-4">
      <Card title="Status" icon={Icon.check} tint="blue" overflow="visible">
        <div className="-mx-2 -my-2 divide-y divide-ws-line-soft">
          <Popover label="Status" trigger={<ValueRow label="Status"><Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge></ValueRow>}>
            <form action={updateStatusAction}>
              <input type="hidden" name="entity" value={entity} />
              <input type="hidden" name="id" value={id} />
              {WORK_STATUSES.map((value) => (
                <PopoverChoice key={value} name="status" value={value} current={value === status}>
                  <Badge tone={STATUS_TONES[value]}>{STATUS_LABELS[value]}</Badge>
                </PopoverChoice>
              ))}
            </form>
          </Popover>
          <Popover label="Who is dealing with this" trigger={<ValueRow label="Owner">{owner ?? <span className="text-[var(--casa-text-subtle)]">Nobody yet</span>}</ValueRow>}>
            <form action={assignAction}>
              <input type="hidden" name="entity" value={entity} />
              <input type="hidden" name="id" value={id} />
              <PopoverChoice name="staffUserId" value="" current={!assignedTo}>
                Nobody yet
              </PopoverChoice>
              {assignableStaff.map((member) => (
                <PopoverChoice key={member.id} name="staffUserId" value={member.id} current={member.id === assignedTo}>
                  {member.name}
                </PopoverChoice>
              ))}
            </form>
          </Popover>
        </div>
      </Card>

      <Card title="Notes" icon={Icon.note} tint="sun">
        <form action={addNoteAction} className="space-y-2">
          <input type="hidden" name="entity" value={noteEntity ?? entity} />
          <input type="hidden" name="entityId" value={id} />
          <Textarea
            name="body"
            rows={3}
            required
            placeholder="What did you agree, and what happens next?"
            aria-label="New note"
          />
          <Button type="submit" variant="secondary" size="sm">
            Add note
          </Button>
        </form>

        {notes.length > 0 ? (
          <ul className="mt-4 space-y-3 border-t border-ws-line-soft pt-4">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl bg-[#fffbea] px-3 py-2.5">
                <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">
                  {note.body}
                </p>
                <p className="mt-1 text-xs text-[var(--casa-text-subtle)]">
                  {note.authorName ?? 'A former colleague'} · {relativeDays(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {activity.length > 0 ? (
        <Card title="History" icon={Icon.clock} tint="ink">
          <ol className="relative space-y-3 before:absolute before:top-1 before:bottom-1 before:left-[4px] before:w-px before:bg-ws-line">
            {activity.map((entry) => (
              <li key={entry.id} className="relative flex gap-3 text-xs">
                <span aria-hidden="true" className="relative mt-1 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-white bg-ws-line-firm" />
                <span className="text-[var(--casa-text-subtle)]">
                  <span className="font-bold text-[var(--casa-ink)]">{entry.staffName ?? 'Someone'}</span>{' '}
                  {describeActivity(entry)} · {relativeDays(entry.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
