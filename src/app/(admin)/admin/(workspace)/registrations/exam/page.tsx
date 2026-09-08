import { Pagination } from '@/components/admin/pagination';
import { parseFilter, QueueToolbar } from '@/components/admin/queue-toolbar';
import { RegistrationTable } from '@/components/admin/registration-table';
import { RegistrationTabs } from '@/components/admin/registration-tabs';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts } from '@/lib/admin/queues';
import { listExamRegistrations } from '@/lib/admin/registrations';

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

  const open = (counts: typeof examCounts) =>
    counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting;

  return (
    <>
      <PageHeader
        eyebrow="Queue"
        title="Registrations"
        description="telc candidates who registered through the public site. Check the declared official name against ID before the entry is filed."
      />

      <RegistrationTabs
        active="exam"
        counts={{ course: open(courseCounts), exam: open(examCounts) }}
      />

      <QueueToolbar
        basePath="/admin/registrations/exam"
        active={filter}
        counts={{ ...examCounts.byStatus, open: open(examCounts), all: examCounts.total }}
        search={search}
        searchPlaceholder="Name, email or exam"
      />

      {items.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches that search' : 'No exam registrations open'}
          description={
            search
              ? 'Try a shorter term, or switch the filter to Everything.'
              : 'Exam registrations from the public site appear here immediately.'
          }
        />
      ) : (
        <RegistrationTable
          items={items}
          basePath="/admin/registrations/exam"
          detailColumn="Sitting"
        />
      )}

      <Pagination basePath="/admin/registrations/exam" page={page} total={total} params={params} />
    </>
  );
}
