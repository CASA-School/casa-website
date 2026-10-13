import { ListGroup, Owner, RecordName } from './list';
import { QUEUE_TAIL_HEAD, queueGroups, Received, type QueueFilter } from './queue-toolbar';
import { Badge, Cell, Table, TableRow } from './ui';
import type { RegistrationListItem } from '@/lib/admin/registrations';

/**
 * The rows of the two registration queues, in the list design
 * (docs/ADMIN_WORKSPACE.md §Lists): who, and under the name what for and when
 * it starts; the learner's declared level for a course; who has it; when it
 * came in. Open and Everything read in groups by status, so no row repeats it.
 * A badge marks the one row that needs something else — a room, or only one
 * part of an exam.
 */

export type RegistrationRow = RegistrationListItem & {
  /** What for and when, under the name: "Intensive German · Starts 26 Oct". */
  about: string;
  /** The exception on this row, if any: "Room needed", "Oral part only". */
  flag?: string | null;
};

export function RegistrationTable({
  items,
  basePath,
  filter,
  level = false,
}: {
  items: readonly RegistrationRow[];
  basePath: string;
  filter: QueueFilter;
  /** Course registrations: the learner's declared level, a column of its own. */
  level?: boolean;
}) {
  const head = [
    'Registration',
    ...(level ? [{ label: 'Level', className: 'hidden w-[6rem] md:table-cell' }] : []),
    ...QUEUE_TAIL_HEAD,
  ];

  return (
    <Table head={head}>
      {queueGroups(items, filter).map((group) => [
        group.label ? <ListGroup key={group.key} label={group.label} count={group.rows.length} span={head.length} /> : null,
        ...group.rows.map((item) => (
          <TableRow key={item.id} interactive>
            <Cell href={`${basePath}/${item.id}`} className="max-w-0">
              <RecordName
                name={[item.firstName, item.lastName].filter(Boolean).join(' ')}
                about={item.about}
                flag={item.flag ? <Badge tone="neutral" className="hidden sm:inline-flex">{item.flag}</Badge> : null}
              />
            </Cell>
            {level ? (
              <Cell className="hidden text-[0.84rem] font-semibold whitespace-nowrap text-[#2b3546] md:table-cell">
                {item.detailNote}
              </Cell>
            ) : null}
            <Cell className="hidden md:table-cell">
              <Owner name={item.assigneeName} />
            </Cell>
            <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
              <Received at={item.submittedAt} status={item.status} />
            </Cell>
          </TableRow>
        )),
      ])}
    </Table>
  );
}
