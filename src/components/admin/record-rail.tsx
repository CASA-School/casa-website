import {
  addNoteAction,
  assignAction,
  updateStatusAction,
} from '@/app/(admin)/admin/(workspace)/actions';
import { Badge, Button, Card, Select, Textarea } from './ui';
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
  return (
    <div className="space-y-5">
      <Card title="Status">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
        </div>

        <form action={updateStatusAction} className="flex gap-2">
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={id} />
          <Select name="status" defaultValue={status} aria-label="Status">
            {WORK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" size="md">
            Save
          </Button>
        </form>
      </Card>

      <Card title="Owner" description="Who is dealing with this.">
        <form action={assignAction} className="flex gap-2">
          <input type="hidden" name="entity" value={entity} />
          <input type="hidden" name="id" value={id} />
          <Select name="staffUserId" defaultValue={assignedTo ?? ''} aria-label="Owner">
            <option value="">Nobody yet</option>
            {assignableStaff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" size="md">
            Save
          </Button>
        </form>
      </Card>

      <Card title="Notes" description="Only staff see these.">
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
              <li key={note.id}>
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
        <Card title="History">
          <ol className="space-y-2.5">
            {activity.map((entry) => (
              <li key={entry.id} className="flex gap-2.5 text-xs">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--casa-text-subtle)]">
                  {Icon.check}
                </span>
                <span className="text-[var(--casa-text-subtle)]">
                  <span className="font-semibold text-[var(--casa-ink)]">
                    {entry.staffName ?? 'Someone'}
                  </span>{' '}
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
