import { PageHeader } from '@/components/admin/ui';

/**
 * The workspace's 404, inside the shell: an unknown screen (`[...rest]`) and
 * a record id that does not exist. Without it, Next's bare English page
 * replaced the whole shell.
 */
export default function WorkspaceNotFound() {
  return <PageHeader title="Page not found" backHref="/admin" backLabel="Today" />;
}
