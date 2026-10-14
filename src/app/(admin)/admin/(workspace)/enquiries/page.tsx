import { ListEmpty, ListGroup, Owner, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import {
  parseFilter,
  QueueToolbar,
  queueEmptyTitle,
  queueGroups,
  queueTailHead,
  Received,
} from '@/components/admin/queue-toolbar';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { listEnquiries } from '@/lib/admin/enquiries';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts } from '@/lib/admin/queues';

/**
 * The enquiry queue.
 *
 * An unanswered enquiry is the costliest record in the building — someone asked
 * CASA a question and is currently deciding whether to ask a competitor
 * instead — so this is the first queue in the sidebar.
 *
 * A row reads as an inbox does: who wrote, and under the name the topic with
 * the start of the message. The message is the only thing that tells you
 * whether this is a two-line reply or a twenty-minute call, and hiding it
 * behind a click makes triaging twelve enquiries twelve navigations. Open reads
 * in groups by status (docs/ADMIN_WORKSPACE.md §Lists), and a new enquiry left
 * for more than two days shows its age in amber.
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

  const [{ items, total }, counts, { t, lang }] = await Promise.all([
    listEnquiries({
      status: filter,
      search,
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    queueStatusCounts('enquiry'),
    getI18n(),
  ]);

  const groups = queueGroups(items, filter, lang);

  return (
    <>
      <PageHeader title={t('Anfragen', 'Enquiries')} />

      <Card bleed>
        <QueueToolbar
          basePath="/admin/enquiries"
          active={filter}
          counts={{
            ...counts.byStatus,
            open: counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting,
            all: counts.total,
          }}
          search={search}
          searchPlaceholder={t('Name, E-Mail oder Nachricht', 'Name, email or message')}
          lang={lang}
        />

        {items.length === 0 ? (
          <ListEmpty title={queueEmptyTitle(lang, filter, search)} />
        ) : (
          <Table head={[t('Anfrage', 'Enquiry'), ...queueTailHead(lang)]}>
            {groups.map((group) => [
              group.label ? (
                <ListGroup key={group.key} label={group.label} count={group.rows.length} span={3} />
              ) : null,
              ...group.rows.map((item) => (
                <TableRow key={item.id} interactive>
                  <Cell href={`/admin/enquiries/${item.id}`} className="max-w-0">
                    <RecordName
                      name={[item.firstName, item.lastName].filter(Boolean).join(' ')}
                      flag={
                        item.kind !== 'general' ? (
                          <Badge tone="neutral" className="hidden sm:inline-flex">{item.kind === 'group' ? t('Gruppenangaben', 'Group brief') : t('Firmenangaben', 'Company brief')}</Badge>
                        ) : null
                      }
                      about={
                        <>
                          <span className="font-medium text-[#2b3546]">{item.topic}</span>
                          {item.message ? <span> — {item.message}</span> : null}
                        </>
                      }
                    />
                  </Cell>
                  <Cell className="hidden md:table-cell">
                    <Owner name={item.assigneeName} />
                  </Cell>
                  <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                    <Received at={item.submittedAt} status={item.status} lang={lang} />
                  </Cell>
                </TableRow>
              )),
            ])}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/enquiries" page={page} total={total} params={params} />
    </>
  );
}
