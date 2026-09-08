import { Pagination } from '@/components/admin/pagination';
import { parseFilter, QueueToolbar } from '@/components/admin/queue-toolbar';
import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { listApplications } from '@/lib/admin/careers';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts, STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { formatFileSize } from '@/lib/admin/format';

/**
 * The career application queue.
 *
 * The only queue that already had a table before the workspace existed —
 * `career_applications`, written by the public apply route with the CV stored
 * alongside it. What it never had was a status anyone could set or a person it
 * belonged to.
 */
export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, counts] = await Promise.all([
    listApplications({
      status: filter,
      search,
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    queueStatusCounts('career_application'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Queue"
        title="Applications"
        description="Applications for open positions, with the CV the candidate uploaded."
      />

      <QueueToolbar
        basePath="/admin/applications"
        active={filter}
        counts={{
          ...counts.byStatus,
          open: counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting,
          all: counts.total,
        }}
        search={search}
        searchPlaceholder="Name, email or position"
      />

      {items.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches that search' : 'No applications open'}
          description={
            search
              ? 'Try a shorter term, or switch the filter to Everything.'
              : 'Applications submitted through the careers pages land here with their CV attached.'
          }
        />
      ) : (
        <Card bleed>
          <Table
            head={[
              'Candidate',
              'Position',
              'CV',
              'Owner',
              'Status',
              { label: 'Applied', align: 'right' },
            ]}
          >
            {items.map((item) => (
              <TableRow key={item.id} interactive>
                <Cell href={`/admin/applications/${item.id}`} className="font-semibold">
                  <span className="block">
                    {item.firstName} {item.lastName}
                  </span>
                  <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                    {item.email}
                  </span>
                </Cell>
                <Cell>
                  <span className="block max-w-[14rem] truncate text-sm">
                    {item.positionTitle}
                  </span>
                </Cell>
                <Cell className="text-xs text-[var(--casa-text-subtle)]">
                  <span className="block max-w-[10rem] truncate">{item.cvFileName}</span>
                  <span className="block">{formatFileSize(item.cvFileSize)}</span>
                </Cell>
                <Cell className="text-sm text-[var(--casa-text-subtle)]">
                  {item.assigneeName ?? '—'}
                </Cell>
                <Cell>
                  <Badge tone={STATUS_TONES[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                </Cell>
                <Cell align="right" className="text-xs text-[var(--casa-text-subtle)]">
                  <DateText value={item.createdAt} compact />
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      <Pagination basePath="/admin/applications" page={page} total={total} params={params} />
    </>
  );
}
