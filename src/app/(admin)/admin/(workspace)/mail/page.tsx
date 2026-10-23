import { notFound } from 'next/navigation';

import { WorkspaceMailComposer } from './composer';
import { PageHeader } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { mailDraft } from '@/lib/admin/mail/draft';
import { graphSender } from '@/lib/notifications/graph-mail.server';

/**
 * A mail about a record — „Antworten" on an enquiry, „E-Mail an …" on a learner, a colleague, an
 * organisation, a host, a class or its teacher — on the workspace's mail screen (Rahman, 2026-10-23:
 * every mail through it). Seen with a right the record is seen with; anything else is a 404.
 */
export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; subject?: string; address?: string; back?: string; error?: string; sent?: string }>;
}) {
  const [params, user, { t }] = await Promise.all([searchParams, requireStaff(), getI18n()]);
  const draft = await mailDraft(params.to ?? '', { subject: params.subject, address: params.address }, user);
  if (!draft) notFound();
  // Back to where it came from: a page of the workspace only.
  const back = params.back && /^\/admin\/[\w\-/?=&.,%:]*$/.test(params.back) && !params.back.includes('//') ? params.back : draft.href;
  const sent = Number(params.sent) || 0;

  return (
    <>
      <PageHeader backHref={back} backLabel={t('Zurück', 'Back')} title={t('E-Mail schreiben', 'Write an e-mail')} />
      {params.error ? (
        <p role="alert" className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : null}
      <WorkspaceMailComposer
        key={`${draft.about}:${draft.id}:${sent}`}
        draft={draft}
        back={back === params.back ? back : null}
        from={draft.canSend ? graphSender() : null}
        sent={sent}
      />
    </>
  );
}
