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
 * triaging twelve enquiries twelve navigations. It sits under the topic, as in
 * an inbox, so the topic gets the width to be read whole rather than two
 * narrow columns each cutting their text mid-word.
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
      <PageHeader title="Enquiries" description="Everything sent through the contact form." />

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
              'Enquiry',
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
                {/* `w-full max-w-0`: the column takes the width the others leave,
                    and its text is cut at the edge rather than widening the table. */}
                <Cell className="w-full max-w-0">
                  <span className="flex min-w-60 items-center gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold">{item.topic}</span>
                    {item.kind !== 'general' ? (
                      <Badge tone="neutral">
                        {item.kind === 'group' ? 'Group brief' : 'Company brief'}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block min-w-60 truncate text-sm text-[var(--casa-text-subtle)]">
                    {item.message}
                  </span>
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
