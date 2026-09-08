import {
  Badge,
  Card,
  Cell,
  DateText,
  Table,
  TableRow,
} from './ui';
import type { RegistrationListItem } from '@/lib/admin/registrations';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';

/**
 * The list body shared by the two registration queues.
 *
 * The columns are the same for both because the *decisions* are the same —
 * who, for what, when, and is anyone on it. Only the last column differs, and
 * it differs in content rather than in kind: a course learner's declared level,
 * an exam candidate's chosen part. Both are the one fact that changes what
 * staff have to do next.
 */
export function RegistrationTable({
  items,
  basePath,
  detailColumn,
}: {
  items: readonly RegistrationListItem[];
  basePath: string;
  detailColumn: string;
}) {
  return (
    <Card bleed>
      <Table
        head={[
          'Name',
          'Registered for',
          detailColumn,
          'Owner',
          'Status',
          { label: 'Received', align: 'right' },
        ]}
      >
        {items.map((item) => (
          <TableRow key={item.id} interactive>
            <Cell href={`${basePath}/${item.id}`} className="font-semibold">
              <span className="block">
                {item.firstName} {item.lastName}
              </span>
              <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                {item.email}
              </span>
            </Cell>
            <Cell>
              <span className="block max-w-[14rem] truncate text-sm">{item.productLabel}</span>
              {item.optionLabel ? (
                <span className="block max-w-[14rem] truncate text-xs text-[var(--casa-text-subtle)]">
                  {item.optionLabel}
                </span>
              ) : null}
            </Cell>
            <Cell className="text-sm">
              {item.detailNote ? (
                <span>{item.detailNote}</span>
              ) : (
                <span className="text-[var(--casa-text-subtle)]">—</span>
              )}
              {item.accommodationRequired ? (
                <Badge tone="neutral" className="mt-1">
                  Room needed
                </Badge>
              ) : null}
            </Cell>
            <Cell className="text-sm text-[var(--casa-text-subtle)]">
              {item.assigneeName ?? '—'}
            </Cell>
            <Cell>
              <Badge tone={STATUS_TONES[item.status]}>{STATUS_LABELS[item.status]}</Badge>
            </Cell>
            <Cell align="right" className="text-xs text-[var(--casa-text-subtle)]">
              <DateText value={item.submittedAt} compact />
            </Cell>
          </TableRow>
        ))}
      </Table>
    </Card>
  );
}
