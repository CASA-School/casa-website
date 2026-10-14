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
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { listApplications } from '@/lib/admin/careers';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts } from '@/lib/admin/queues';

/**
 * The career application queue.
 *
 * The only queue that already had a table before the workspace existed —
 * `career_applications`, written by the public apply route with the CV stored
 * alongside it. What it never had was a status anyone could set or a person it
 * belonged to. A row is the candidate and, under the name, the position; the
 * CV is on the record, since every application has one.
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

  const [{ items, total }, counts, { t, lang }] = await Promise.all([
    listApplications({
      status: filter,
      search,
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    queueStatusCounts('career_application'),
    getI18n(),
  ]);

  const groups = queueGroups(items, filter, lang);

  return (
    <>
      <PageHeader title={t('Bewerbungen', 'Applications')} />

      <Card bleed>
        <QueueToolbar
          basePath="/admin/applications"
          active={filter}
          counts={{
            ...counts.byStatus,
            open: counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting,
            all: counts.total,
          }}
          search={search}
          searchPlaceholder={t('Name, E-Mail oder Stelle', 'Name, email or position')}
          lang={lang}
        />

        {items.length === 0 ? (
          <ListEmpty title={queueEmptyTitle(lang, filter, search)} />
        ) : (
          <Table head={[t('Bewerbung', 'Application'), ...queueTailHead(lang)]}>
            {groups.map((group) => [
              group.label ? (
                <ListGroup key={group.key} label={group.label} count={group.rows.length} span={3} />
              ) : null,
              ...group.rows.map((item) => (
                <TableRow key={item.id} interactive>
                  <Cell href={`/admin/applications/${item.id}`} className="max-w-0">
                    <RecordName
                      name={[item.firstName, item.lastName].filter(Boolean).join(' ')}
                      about={item.positionTitle}
                    />
                  </Cell>
                  <Cell className="hidden md:table-cell">
                    <Owner name={item.assigneeName} />
                  </Cell>
                  <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                    <Received at={item.createdAt} status={item.status} lang={lang} />
                  </Cell>
                </TableRow>
              )),
            ])}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/applications" page={page} total={total} params={params} />
    </>
  );
}
