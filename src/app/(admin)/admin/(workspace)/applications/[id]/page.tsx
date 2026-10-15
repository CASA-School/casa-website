import { notFound } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { MetaItem, MetaLine, OwnerControl, StatusBar, SubmissionCard, Timeline } from '@/components/admin/record-parts';
import { RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { getApplication } from '@/lib/admin/careers';
import { formatFileSize } from '@/lib/admin/format';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { inTheirLanguage, replyHref } from '@/lib/admin/reply';
import { listAssignableStaff } from '@/lib/admin/staff';
import { fileKind } from '../file-kind';

/**
 * One application, in the inbox records' one design (2026-10-15): the head with
 * the candidate, the position, how to reach them and, in its bar, where it
 * stands and who has it; the cover letter as it was sent, with „Antworten" and
 * the CV under it; beside it one line of notes and changes.
 *
 * The CV is a download, not an inline preview. Rendering an arbitrary uploaded
 * PDF inside the workspace means either an iframe pointed at attacker-supplied
 * bytes or a PDF renderer in the client bundle, and neither is worth it for a
 * file that is going to be read properly in a real reader anyway. The route
 * behind the button sets `Content-Disposition: attachment` and checks access
 * itself (CLAUDE.md, hard rule 7c).
 */
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireModule('applications')]);
  const [application, { t, lang }] = await Promise.all([getApplication(id), getI18n()]);

  if (!application) {
    notFound();
  }

  const canEdit = canAccess(user, 'applications', 'edit');
  const [notes, activity, staff] = await Promise.all([
    listNotes('career_application', application.id),
    activityFor('career_application', application.id),
    listAssignableStaff(),
  ]);

  const fullName = `${application.firstName} ${application.lastName}`;
  const german = application.locale === 'de';
  const reply = replyHref({
    email: application.email,
    subject: inTheirLanguage(application.locale, `Deine Bewerbung: ${application.positionTitle}`, `Your application: ${application.positionTitle}`),
    firstName: application.firstName,
    locale: application.locale,
    signer: user.name,
  });
  const cvDetails = [fileKind(application.cvFileName, application.cvMimeType, lang), formatFileSize(application.cvFileSize)].filter(Boolean).join(' · ');

  return (
    <>
      <RecordHeader
        backHref="/admin/applications"
        backLabel={t('Bewerbungen', 'Applications')}
        title={fullName}
        avatar={fullName}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">{application.positionTitle}</span>
            <MetaLine>
              <MetaItem icon={Icon.mail}>
                <a href={`mailto:${application.email}`} className="hover:text-[var(--casa-ink)] hover:underline">
                  {application.email}
                </a>
              </MetaItem>
              {application.phone ? (
                <MetaItem icon={Icon.phone}>
                  <a href={`tel:${application.phone}`} className="hover:text-[var(--casa-ink)] hover:underline">
                    {application.phone}
                  </a>
                </MetaItem>
              ) : null}
              {application.linkedinUrl ? (
                <MetaItem icon={Icon.external}>
                  <a href={application.linkedinUrl} rel="noreferrer noopener nofollow" target="_blank" className="hover:text-[var(--casa-ink)] hover:underline">
                    LinkedIn
                  </a>
                </MetaItem>
              ) : null}
              <MetaItem icon={Icon.globe}>{german ? t('auf Deutsch', 'in German') : t('auf Englisch', 'in English')}</MetaItem>
            </MetaLine>
          </>
        }
        bar={
          <>
            <StatusBar entity="career_application" id={application.id} status={application.status} canEdit={canEdit} />
            <OwnerControl entity="career_application" id={application.id} assignedTo={application.assignedTo} staff={staff} me={user} canEdit={canEdit} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <SubmissionCard
            name={fullName}
            email={application.email}
            at={application.createdAt}
            via={t('über die Karriereseite', 'from the careers page')}
            title={application.positionTitle}
            reply={{ href: reply, locale: application.locale }}
            extra={
              application.hasStoredFile ? (
                // A plain link, not a Next link: it is a file download, and a Link would prefetch it.
                <a
                  href={`/admin/applications/${application.id}/cv`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-[0.84rem] font-semibold text-[var(--casa-ink)] ring-1 ring-[#d3dbe6] ring-inset transition-colors outline-none hover:bg-[#eef2f7] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4"
                >
                  <span aria-hidden="true">{Icon.download}</span>
                  {t('Lebenslauf', 'CV')}
                  <span className="font-medium text-[var(--casa-muted)]">{cvDetails}</span>
                </a>
              ) : (
                <span className="text-[0.78rem] font-semibold text-[#9a5b00]">{t('Kein Lebenslauf gespeichert', 'No CV stored')}</span>
              )
            }
          >
            <p className="max-w-prose text-base leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{application.coverLetter}</p>
          </SubmissionCard>
        </div>

        <div className="space-y-4">
          <Timeline
            entity="career_application"
            id={application.id}
            notes={notes}
            activity={activity}
            origin={{ at: application.createdAt, label: t('Beworben über die Karriereseite', 'Applied through the careers page') }}
          />
        </div>
      </div>
    </>
  );
}
