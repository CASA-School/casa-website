import { Pagination } from '@/components/admin/pagination';
import { parseFilter, QueueToolbar } from '@/components/admin/queue-toolbar';
import { RegistrationTable } from '@/components/admin/registration-table';
import { RegistrationTabs } from '@/components/admin/registration-tabs';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts } from '@/lib/admin/queues';
import { listCourseRegistrations } from '@/lib/admin/registrations';

export default async function CourseRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, courseCounts, examCounts] = await Promise.all([
    listCourseRegistrations({
      status: filter,
      search,
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    queueStatusCounts('course_registration'),
    queueStatusCounts('exam_registration'),
  ]);

  const open = (counts: typeof courseCounts) =>
    counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting;

  return (
    <>
      <PageHeader
        eyebrow="Queue"
        title="Registrations"
        description="Learners who completed the public registration wizard. Nothing here is a confirmed seat until staff say so."
      />

      <RegistrationTabs
        active="course"
        counts={{ course: open(courseCounts), exam: open(examCounts) }}
      />

      <QueueToolbar
        basePath="/admin/registrations/course"
        active={filter}
        counts={{ ...courseCounts.byStatus, open: open(courseCounts), all: courseCounts.total }}
        search={search}
        searchPlaceholder="Name, email or course"
      />

      {items.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches that search' : 'No course registrations open'}
          description={
            search
              ? 'Try a shorter term, or switch the filter to Everything.'
              : 'A completed registration on the public site appears here immediately.'
          }
        />
      ) : (
        <RegistrationTable
          items={items}
          basePath="/admin/registrations/course"
          detailColumn="Declared level"
        />
      )}

      <Pagination
        basePath="/admin/registrations/course"
        page={page}
        total={total}
        params={params}
      />
    </>
  );
}
