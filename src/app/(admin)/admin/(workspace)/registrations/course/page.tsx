import { ListEmpty } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { parseFilter, QueueToolbar, queueEmptyTitle } from '@/components/admin/queue-toolbar';
import { RegistrationTable } from '@/components/admin/registration-table';
import { RegistrationTabs } from '@/components/admin/registration-tabs';
import { Card, PageHeader } from '@/components/admin/ui';
import { translator, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { queueStatusCounts } from '@/lib/admin/queues';
import { listCourseRegistrations } from '@/lib/admin/registrations';
import { courseNameResolver } from '../course-names';
import { formatDay, parseOptionLabel } from '../option-label';

/** "Intensive German · Starts 26 Oct": the course as staff call it, and when it starts. */
function courseAbout(course: string, option: string | null, lang: WsLang): string {
  const t = translator(lang);
  const parsed = parseOptionLabel(option);
  if (!parsed) return course;
  if (parsed.toBeArranged) return `${course} · ${t('Termin wird noch festgelegt', 'Date to be arranged')}`;
  if (!parsed.start) return `${course} · ${parsed.raw}`;
  const day = formatDay(parsed.start, lang);
  return `${course} · ${t(`Beginn ${day}`, `Starts ${day}`)}`;
}

export default async function CourseRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, courseCounts, examCounts, courseName, { t, lang }] = await Promise.all([
    listCourseRegistrations({
      status: filter,
      search,
      limit: PAGE_SIZE,
      offset: offsetFor(page),
    }),
    queueStatusCounts('course_registration'),
    queueStatusCounts('exam_registration'),
    courseNameResolver(),
    getI18n(),
  ]);

  const rows = items.map((item) => ({
    ...item,
    about: courseAbout(courseName(item.productLabel) ?? t('Kurs', 'Course'), item.optionLabel, lang),
    flag: item.accommodationRequired ? t('Unterkunft nötig', 'Room needed') : null,
  }));

  const open = (counts: typeof courseCounts) =>
    counts.byStatus.new + counts.byStatus.in_progress + counts.byStatus.waiting;

  return (
    <>
      <PageHeader
        title={t('Anmeldungen', 'Registrations')}
        actions={<RegistrationTabs active="course" counts={{ course: open(courseCounts), exam: open(examCounts) }} lang={lang} />}
      />

      <Card bleed>
        <QueueToolbar
          basePath="/admin/registrations/course"
          active={filter}
          counts={{ ...courseCounts.byStatus, open: open(courseCounts), all: courseCounts.total }}
          search={search}
          searchPlaceholder={t('Name, E-Mail oder Kurs', 'Name, email or course')}
          lang={lang}
        />

        {items.length === 0 ? (
          <ListEmpty title={queueEmptyTitle(lang, filter, search)} />
        ) : (
          <RegistrationTable items={rows} basePath="/admin/registrations/course" filter={filter} level lang={lang} />
        )}
      </Card>

      <Pagination basePath="/admin/registrations/course" page={page} total={total} params={params} />
    </>
  );
}
