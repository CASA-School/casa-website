import Link from 'next/link';
import { notFound } from 'next/navigation';

import { WorkspaceMailComposer } from './composer';
import { PageHeader } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin/guard';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { mailDraft } from '@/lib/admin/mail/draft';
import type { MailAbout } from '@/lib/admin/mail/href';
import { graphSender } from '@/lib/notifications/graph-mail.server';

const REPLIES = new Set<MailAbout>(['enquiry', 'course_registration', 'exam_registration', 'application']);

/** What the record under the title is, where its own name would repeat the title. */
const ABOUT: Partial<Record<MailAbout, Bilingual>> = {
  enquiry: { de: 'Anfrage', en: 'Enquiry' },
  course_registration: { de: 'Kursanmeldung', en: 'Course registration' },
  exam_registration: { de: 'Prüfungsanmeldung', en: 'Exam registration' },
  application: { de: 'Bewerbung', en: 'Application' },
  person: { de: 'Teilnehmende', en: 'Learner' },
  staff: { de: 'Mitarbeitende', en: 'Staff' },
  organisation: { de: 'Organisation', en: 'Organisation' },
  accommodation: { de: 'Unterkunft', en: 'Accommodation' },
  class: { de: 'Kurs im Tagesplan', en: 'Class in the day plan' },
};

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
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireStaff(), getI18n()]);
  const draft = await mailDraft(params.to ?? '', { subject: params.subject, address: params.address }, user);
  if (!draft) notFound();
  // Back to where it came from: a page of the workspace only.
  const back = params.back && /^\/admin\/[\w\-/?=&.,%:]*$/.test(params.back) && !params.back.includes('//') ? params.back : draft.href;
  const sent = Number(params.sent) || 0;

  return (
    <>
      <PageHeader
        backHref={back}
        backLabel={t('Zurück', 'Back')}
        title={
          REPLIES.has(draft.about)
            ? t(`Antwort an ${draft.title}`, `Reply to ${draft.title}`)
            : draft.about === 'teacher_list'
              ? t(`Teilnehmerliste an ${draft.recipients[0]?.name ?? 'die Lehrkraft'}`, `Class list to ${draft.recipients[0]?.name ?? 'the teacher'}`)
              : draft.about === 'exam_sitting'
                ? t('E-Mail an alle Teilnehmenden', 'E-mail to every candidate')
                : draft.about === 'exam_examiners'
                  ? t('E-Mail an die Prüfenden', 'E-mail to the examiners')
                  : t(`E-Mail an ${draft.title}`, `E-mail to ${draft.title}`)
        }
        description={
          <>
            <Link href={draft.href} className="font-semibold text-[var(--casa-accent-text)] hover:underline">
              {draft.about === 'contact' ? draft.detail : ABOUT[draft.about] ? pick(lang, ABOUT[draft.about]!) : draft.title}
            </Link>
            {draft.detail && draft.about !== 'contact' ? <span> · {draft.detail}</span> : null}
          </>
        }
      />
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
