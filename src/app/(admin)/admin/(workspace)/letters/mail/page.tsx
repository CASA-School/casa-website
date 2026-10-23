import { notFound } from 'next/navigation';

import { LetterMailComposer } from './composer';
import { PageHeader } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { MAX_LETTERS, letterMailDraft } from '@/lib/admin/letter-mail';
import { LOGO_PNG_BASE64 } from '@/lib/notifications/casa-logo';
import { graphSender } from '@/lib/notifications/graph-mail.server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A letter — or a sitting's letters to all — sent by mail (Rahman, 2026-10-23): on the workspace's mail
 * screen, the letter as a PDF, sent directly after a review or opened in the mail program (docs/LETTERS.md
 * §Sending). Seen with the right the letters are seen with, at `edit`; anything else is a 404.
 */
export default async function LetterMailPage({ searchParams }: { searchParams: Promise<{ ids?: string; back?: string; error?: string; sent?: string; saved?: string }> }) {
  const [params, user, { t }] = await Promise.all([searchParams, requireStaff(), getI18n()]);
  const ids = [...new Set((params.ids ?? '').split(',').filter((id) => UUID.test(id)))].slice(0, MAX_LETTERS);
  const draft = await letterMailDraft(ids, user);
  if (!draft) notFound();
  const single = draft.letters.length === 1;
  // Back to where it came from: a page of the workspace only.
  const back = params.back && /^\/admin\/[\w\-/?=&.,%]*$/.test(params.back) && !params.back.includes('//') ? params.back : `/admin/letters/${ids[0]}`;
  const sent = Number(params.sent) || 0;

  return (
    <>
      <PageHeader
        backHref={back}
        backLabel={t('Zurück', 'Back')}
        title={single ? t('Brief per E-Mail senden', 'Send the letter by e-mail') : t(`${draft.letters.length} Briefe per E-Mail senden`, `Send ${draft.letters.length} letters by e-mail`)}
      />
      {params.error ? (
        <p role="alert" className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : null}
      <LetterMailComposer
        draft={draft}
        ids={ids}
        back={params.back && back === params.back ? back : null}
        from={graphSender()}
        logo={`data:image/png;base64,${LOGO_PNG_BASE64}`}
        sent={sent}
        saved={params.saved === '1'}
      />
    </>
  );
}
