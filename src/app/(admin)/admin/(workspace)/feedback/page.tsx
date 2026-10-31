import { Icon } from '@/components/admin/icons';
import { InboxScreen, inboxParams, type InboxItem } from '@/components/admin/inbox';
import { Badge } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { listFeedback } from '@/lib/admin/feedback';
import { FEEDBACK_KIND_LABELS } from '@/lib/admin/feedback-shared';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { inboxCounts } from '@/lib/admin/inbox';

/**
 * What the team sent with „Feedback" (0112), in the inboxes' one design (`InboxScreen`): who, what kind
 * and on which screen, the start of what they wrote, the screenshots counted.
 */
export default async function FeedbackListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = inboxParams(params);
  const [user, { items, total }, counts, { t, lang }] = await Promise.all([
    requireModule('feedback'),
    listFeedback({ period: view.period, state: view.state, search: view.search, limit: view.limit, offset: view.offset }),
    inboxCounts('feedback'),
    getI18n(),
  ]);

  const rows: InboxItem[] = items.map((item) => ({
    id: item.id,
    href: `/admin/feedback/${item.id}`,
    name: item.senderName,
    status: item.status,
    at: item.submittedAt,
    title: [`#${item.number} ${pick(lang, FEEDBACK_KIND_LABELS[item.kind])}`, item.pageTitle].filter(Boolean).join(' · '),
    preview: item.messageStart,
    badges: item.files ? (
      <Badge tone="neutral">
        <span aria-hidden="true" className="[&_svg]:size-3">
          {Icon.camera}
        </span>
        {item.files}
      </Badge>
    ) : null,
    assigneeName: item.assigneeName,
  }));

  return (
    <InboxScreen
      entity="feedback"
      basePath="/admin/feedback"
      title={t('Feedback', 'Feedback')}
      nouns={{ one: { de: 'Feedback', en: 'feedback' }, many: { de: 'Feedbacks', en: 'feedback' } }}
      searchPlaceholder={t('Text, Name, Seite oder #Nummer', 'Text, name, page or #number')}
      view={view.view}
      state={view.state}
      search={view.search}
      page={view.page}
      params={params}
      counts={counts}
      items={rows}
      total={total}
      canClose={canAccess(user, 'feedback', 'edit')}
    />
  );
}
