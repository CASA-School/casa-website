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
import { listEnquiries } from '@/lib/admin/enquiries';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts, STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { Pagination } from '@/components/admin/pagination';

/**
 * The enquiry queue.
 *
 * An unanswered enquiry is the costliest record in the building — someone asked
 * CASA a question and is currently deciding whether to ask a competitor
 * instead — so this is the first queue in the sidebar and the one whose badge
 * is allowed to interrupt.
 *
 * The message excerpt is in the table on purpose. Every other column is
 * metadata; the message is the only thing that tells you whether this is a
 * two-line reply or a twenty-minute call, and hiding it behind a click makes
 * triaging twelve enquiries twelve navigations.
 */
export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, counts] = await Promise.all([
    listEnquiries({
      status: filter,
      search,
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    queueStatusCounts('enquiry'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Queue"
        title="Enquiries"
        description="Everything sent through the contact form, including the structured brief that group and company enquiries carry."
      />

      <QueueToolbar
        basePath="/admin/enquiries"
        active={filter}
        counts={{
          ...counts.byStatus,
          open:
            counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting,
          all: counts.total,
        }}
        search={search}
        searchPlaceholder="Name, email or message"
      />

      {items.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches that search' : 'This queue is clear'}
          description={
            search
              ? 'Try a shorter term, or switch the filter to Everything.'
              : 'New enquiries from the contact form land here the moment they are submitted.'
          }
        />
      ) : (
        <Card bleed>
          <Table
            head={[
              'Name',
              'Topic',
              'Message',
              'Owner',
              'Status',
              { label: 'Received', align: 'right' },
            ]}
          >
            {items.map((item) => (
              <TableRow key={item.id} interactive>
                <Cell href={`/admin/enquiries/${item.id}`} className="font-semibold">
                  <span className="block">
                    {[item.firstName, item.lastName].filter(Boolean).join(' ')}
                  </span>
                  <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                    {item.email}
                  </span>
                </Cell>
                <Cell>
                  <span className="block max-w-[10rem] truncate text-sm">{item.topic}</span>
                  {item.kind !== 'general' ? (
                    <Badge tone="neutral" className="mt-1">
                      {item.kind === 'group' ? 'Group brief' : 'Company brief'}
                    </Badge>
                  ) : null}
                </Cell>
                <Cell className="text-[var(--casa-muted)]">
                  <span className="block max-w-[18rem] truncate text-sm">{item.message}</span>
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
      )}

      <Pagination basePath="/admin/enquiries" page={page} total={total} params={params} />
    </>
  );
}
