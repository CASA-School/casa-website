import { ListEmpty } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { parseFilter, QueueToolbar, queueEmptyTitle } from '@/components/admin/queue-toolbar';
import { RegistrationTable } from '@/components/admin/registration-table';
import { RegistrationTabs } from '@/components/admin/registration-tabs';
import { Card, PageHeader } from '@/components/admin/ui';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts } from '@/lib/admin/queues';
import { listExamRegistrations, registrationTypeLabel } from '@/lib/admin/registrations';
import { formatDay, parseOptionLabel } from '../option-label';

/** "telc Deutsch B2 · 13 Nov": the exam, and the day of its sitting. */
function examAbout(exam: string, option: string | null): string {
  const parsed = parseOptionLabel(option);
  if (!parsed) return exam;
  if (parsed.toBeArranged) return `${exam} · Date to be arranged`;
  return `${exam} · ${parsed.start ? formatDay(parsed.start) : parsed.raw}`;
}

/** The full exam is the normal case; only a single part is marked on its row. */
const FULL_EXAM = registrationTypeLabel('full');

export default async function ExamRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, courseCounts, examCounts] = await Promise.all([
    listExamRegistrations({
      status: filter,
      search,
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    queueStatusCounts('course_registration'),
    queueStatusCounts('exam_registration'),
  ]);

  const rows = items.map((item) => ({
    ...item,
    about: examAbout(item.productLabel, item.optionLabel),
    flag: item.detailNote && item.detailNote !== FULL_EXAM ? item.detailNote : null,
  }));

  const open = (counts: typeof examCounts) =>
    counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting;

  return (
    <>
      <PageHeader
        title="Registrations"
        actions={<RegistrationTabs active="exam" counts={{ course: open(courseCounts), exam: open(examCounts) }} />}
      />

      <Card bleed>
        <QueueToolbar
          basePath="/admin/registrations/exam"
          active={filter}
          counts={{ ...examCounts.byStatus, open: open(examCounts), all: examCounts.total }}
          search={search}
          searchPlaceholder="Name, email or exam"
        />

        {items.length === 0 ? (
          <ListEmpty title={queueEmptyTitle(filter, search)} />
        ) : (
          <RegistrationTable items={rows} basePath="/admin/registrations/exam" filter={filter} />
        )}
      </Card>

      <Pagination basePath="/admin/registrations/exam" page={page} total={total} params={params} />
    </>
  );
}
