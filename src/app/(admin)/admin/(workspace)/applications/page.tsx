import { InboxScreen, inboxParams, type InboxItem } from '@/components/admin/inbox';
import { canAccess } from '@/lib/admin/access';
import { listApplications } from '@/lib/admin/careers';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { inboxCounts } from '@/lib/admin/inbox';

/**
 * Job applications: the inbox (`InboxScreen`, shared with enquiries and
 * registrations), each row the candidate, the position and the start of the
 * cover letter. The CV is on the record, since every application has one.
 */
export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = inboxParams(params);
  const [user, { items, total }, counts, { t }] = await Promise.all([
    requireModule('applications'),
    listApplications({ period: view.period, state: view.state, search: view.search, limit: view.limit, offset: view.offset }),
    inboxCounts('career_application'),
    getI18n(),
  ]);

  const rows: InboxItem[] = items.map((item) => ({
    id: item.id,
    href: `/admin/applications/${item.id}`,
    name: [item.firstName, item.lastName].filter(Boolean).join(' '),
    status: item.status,
    at: item.createdAt,
    title: item.positionTitle,
    preview: item.coverStart,
    locale: item.locale,
    assigneeName: item.assigneeName,
  }));

  return (
    <InboxScreen
      entity="career_application"
      basePath="/admin/applications"
      title={t('Bewerbungen', 'Applications')}
      nouns={{ one: { de: 'Bewerbung', en: 'application' }, many: { de: 'Bewerbungen', en: 'applications' } }}
      searchPlaceholder={t('Name, E-Mail oder Stelle', 'Name, email or position')}
      view={view.view}
      state={view.state}
      search={view.search}
      page={view.page}
      params={params}
      counts={counts}
      items={rows}
      total={total}
      canClose={canAccess(user, 'applications', 'edit')}
    />
  );
}
