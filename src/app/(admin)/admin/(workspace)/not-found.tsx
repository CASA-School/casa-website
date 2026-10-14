import { PageHeader } from '@/components/admin/ui';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * The workspace's 404, inside the shell: an unknown screen (`[...rest]`) and
 * a record id that does not exist. Without it, Next's bare English page
 * replaced the whole shell.
 */
export default async function WorkspaceNotFound() {
  const { t } = await getI18n();
  return <PageHeader title={t('Seite nicht gefunden', 'Page not found')} backHref="/admin" backLabel={t('Übersicht', 'Overview')} />;
}
