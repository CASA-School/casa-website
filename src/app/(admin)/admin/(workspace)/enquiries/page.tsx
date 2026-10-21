import { ConfirmSubmit } from '@/components/admin/dialogs';
import { InboxScreen, inboxParams, type InboxItem } from '@/components/admin/inbox';
import { Badge } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { listEnquiries, spamEnquiryIds } from '@/lib/admin/enquiries';

import { deleteSpamAction } from './actions';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { inboxCounts } from '@/lib/admin/inbox';

/**
 * The enquiry queue (Rahman, 2026-10-14: "per day format … completed so it
 * doesn't show in the number of open enquiries", then "only one week history").
 * An unanswered enquiry is the costliest record in the building — someone asked
 * CASA a question and is deciding whether to ask a competitor instead — so a row
 * shows the start of the message: it tells a two-line reply from a twenty-minute
 * call. The inbox itself — the week by day, the history, „Erledigt" — is
 * `InboxScreen`, shared with registrations and applications.
 */
export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = inboxParams(params);
  const [user, { items, total }, counts, { t }] = await Promise.all([
    requireModule('enquiries'),
    listEnquiries({ period: view.period, state: view.state, search: view.search, limit: view.limit, offset: view.offset }),
    inboxCounts('enquiry'),
    getI18n(),
  ]);
  // What was marked spam, on arrival or by hand: deleted in one go (2026-10-21).
  const spam = canAccess(user, 'enquiries', 'full') ? (await spamEnquiryIds()).length : 0;

  const rows: InboxItem[] = items.map((item) => ({
    id: item.id,
    href: `/admin/enquiries/${item.id}`,
    name: [item.firstName, item.lastName].filter(Boolean).join(' '),
    status: item.status,
    at: item.submittedAt,
    title: item.topic,
    preview: item.message,
    badges: item.kind !== 'general' ? <Badge tone="neutral">{item.kind === 'group' ? t('Gruppe', 'Group') : t('Firma', 'Company')}</Badge> : null,
    locale: item.locale,
    assigneeName: item.assigneeName,
  }));

  return (
    <InboxScreen
      entity="enquiry"
      basePath="/admin/enquiries"
      title={t('Anfragen', 'Enquiries')}
      nouns={{ one: { de: 'Anfrage', en: 'enquiry' }, many: { de: 'Anfragen', en: 'enquiries' } }}
      searchPlaceholder={t('Name, E-Mail oder Nachricht', 'Name, email or message')}
      view={view.view}
      state={view.state}
      search={view.search}
      page={view.page}
      params={params}
      counts={counts}
      items={rows}
      total={total}
      canClose={canAccess(user, 'enquiries', 'edit')}
      actions={
        spam ? (
          <form action={deleteSpamAction}>
            <ConfirmSubmit
              title={t(`${spam} Spam-Anfragen löschen?`, `Delete ${spam} spam enquiries?`)}
              description={t('Sie verschwinden aus allen Listen, mit ihren Absendern, wenn bei CASA sonst nichts von ihnen ist.', 'They leave every list, with their senders if nothing else at CASA is theirs.')}
              confirmLabel={t('Löschen', 'Delete')}
              variant="ghost"
            >
              {t(`Spam löschen (${spam})`, `Delete spam (${spam})`)}
            </ConfirmSubmit>
          </form>
        ) : undefined
      }
    />
  );
}
