import { InboxScreen, inboxParams, type InboxItem } from '@/components/admin/inbox';
import { RegistrationTabs } from '@/components/admin/registration-tabs';
import { Badge } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { translator, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { inboxCounts, openCount } from '@/lib/admin/inbox';
import { listCourseRegistrations } from '@/lib/admin/registrations';
import { courseNameResolver } from '../course-names';
import { formatRange, parseOptionLabel } from '../option-label';

/** "26. Okt. – 18. Dez. · Niveau B1.2": when it runs, and the level the learner gave. */
function courseDetails(option: string | null, level: string | null | undefined, lang: WsLang): string | null {
  const t = translator(lang);
  const parsed = parseOptionLabel(option);
  const when = !parsed
    ? null
    : parsed.toBeArranged
      ? t('Termin wird noch festgelegt', 'Date to be arranged')
      : parsed.start
        ? formatRange(parsed.start, parsed.end, lang)
        : parsed.raw;
  return [when, level ? t(`Niveau ${level}`, `Level ${level}`) : null].filter(Boolean).join(' · ') || null;
}

/**
 * Course registrations: the inbox (`InboxScreen`, shared with enquiries and
 * applications), each row the course, when it runs and the level the learner
 * gave, marked when a room is needed. Kurs | Prüfung beside the title switches
 * to the exam registrations.
 */
export default async function CourseRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = inboxParams(params);
  const [user, { items, total }, counts, examCounts, courseName, { t, lang }] = await Promise.all([
    requireModule('registrations'),
    listCourseRegistrations({ period: view.period, state: view.state, search: view.search, limit: view.limit, offset: view.offset }),
    inboxCounts('course_registration'),
    inboxCounts('exam_registration'),
    courseNameResolver(),
    getI18n(),
  ]);

  const rows: InboxItem[] = items.map((item) => ({
    id: item.id,
    href: `/admin/registrations/course/${item.id}`,
    name: [item.firstName, item.lastName].filter(Boolean).join(' '),
    status: item.status,
    at: item.submittedAt,
    title: courseName(item.productLabel) ?? t('Kurs', 'Course'),
    preview: courseDetails(item.optionLabel, item.detailNote, lang),
    badges: item.accommodationRequired ? <Badge tone="neutral">{t('Unterkunft nötig', 'Room needed')}</Badge> : null,
    locale: item.locale,
    assigneeName: item.assigneeName,
  }));

  return (
    <InboxScreen
      entity="course_registration"
      basePath="/admin/registrations/course"
      title={t('Anmeldungen', 'Registrations')}
      actions={<RegistrationTabs active="course" counts={{ course: openCount(counts), exam: openCount(examCounts) }} lang={lang} />}
      nouns={{ one: { de: 'Anmeldung', en: 'registration' }, many: { de: 'Anmeldungen', en: 'registrations' } }}
      searchPlaceholder={t('Name, E-Mail oder Kurs', 'Name, email or course')}
      view={view.view}
      state={view.state}
      search={view.search}
      page={view.page}
      params={params}
      counts={counts}
      items={rows}
      total={total}
      canClose={canAccess(user, 'registrations', 'edit')}
    />
  );
}
