import { notFound } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { RecordRail } from '@/components/admin/record-rail';
import { Badge, ButtonLink, Card, DateText, DetailList, RecordHeader } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { getApplication } from '@/lib/admin/careers';
import { formatFileSize } from '@/lib/admin/format';
import { pick, relativeDays } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { listAssignableStaff } from '@/lib/admin/staff';
import { fileKind } from '../file-kind';

/**
 * One application.
 *
 * The record's head names the CV and carries the download; the cover letter
 * and the candidate's links sit under it, the rail beside them — who has the
 * application is the rail's, where it is changed, not a fact in the head.
 *
 * The CV is a download, not an inline preview. Rendering an arbitrary uploaded
 * PDF inside the workspace means either an iframe pointed at attacker-supplied
 * bytes or a PDF renderer in the client bundle, and neither is worth it for a
 * file that is going to be read properly in a real reader anyway. The route
 * behind the button sets `Content-Disposition: attachment` for the same reason.
 */
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [application, { t, lang }] = await Promise.all([getApplication(id), getI18n()]);

  if (!application) {
    notFound();
  }

  const [notes, activity, staff] = await Promise.all([
    listNotes('career_application', application.id),
    activityFor('career_application', application.id),
    listAssignableStaff(),
  ]);

  return (
    <>
      <RecordHeader
        backHref="/admin/applications"
        backLabel={t('Alle Bewerbungen', 'All applications')}
        title={`${application.firstName} ${application.lastName}`}
        avatar={`${application.firstName} ${application.lastName}`}
        subtitle={application.positionTitle}
        status={
          <>
            <Badge tone={STATUS_TONES[application.status]}>{pick(lang, STATUS_LABELS[application.status])}</Badge>
            {/* Still carrying the status the public form wrote: setting one in
                the rail is what puts it in the pipeline. */}
            {application.rawStatus === 'submitted' ? <Badge tone="quiet">{t('Unbearbeitet', 'Untouched')}</Badge> : null}
          </>
        }
        actions={
          <>
            {application.hasStoredFile ? (
              <ButtonLink href={`/admin/applications/${application.id}/cv`} variant="primary" plain>
                <span aria-hidden="true">{Icon.download}</span>
                {t('Lebenslauf herunterladen', 'Download CV')}
              </ButtonLink>
            ) : null}
            <ButtonLink href={`mailto:${application.email}?subject=${encodeURIComponent(
                `Your application — ${application.positionTitle}`
              )}`}>{t('Per E-Mail antworten', 'Reply by email')}</ButtonLink>
          </>
        }
        facts={[
          {
            label: t('Beworben', 'Applied'),
            icon: Icon.clock,
            tint: 'blue',
            value: <DateText value={application.createdAt} />,
            sub: relativeDays(application.createdAt, lang),
          },
          {
            label: t('E-Mail', 'Email'),
            icon: Icon.mail,
            tint: 'ink',
            value: application.email,
            href: `mailto:${application.email}`,
          },
          {
            // Not a fact link: those are Next links, which prefetch, and the
            // CV route is a file download. The header's button is the way in.
            label: t('Lebenslauf', 'CV'),
            icon: Icon.download,
            tint: application.hasStoredFile ? 'ink' : 'sun',
            value: application.cvFileName,
            sub: application.hasStoredFile
              ? [fileKind(application.cvFileName, application.cvMimeType, lang), formatFileSize(application.cvFileSize)]
                  .filter(Boolean)
                  .join(' · ')
              : t('Keine Datei gespeichert', 'No file stored'),
          },
          {
            label: t('Geschrieben auf', 'Wrote in'),
            icon: Icon.globe,
            tint: 'sun',
            value: application.locale === 'de' ? t('Deutsch', 'German') : t('Englisch', 'English'),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title={t('Anschreiben', 'Cover letter')} icon={Icon.note} tint="blue">
            <p className="max-w-prose text-base leading-relaxed whitespace-pre-line">
              {application.coverLetter}
            </p>
          </Card>

          <Card title={t('Bewerbende Person', 'Candidate')} icon={Icon.person} tint="ink">
            <DetailList
              items={[
                {
                  label: t('Telefon', 'Phone'),
                  value: application.phone ? (
                    <a href={`tel:${application.phone}`} className="font-medium">
                      {application.phone}
                    </a>
                  ) : null,
                },
                {
                  label: 'LinkedIn',
                  value: application.linkedinUrl ? (
                    <a
                      href={application.linkedinUrl}
                      rel="noreferrer noopener nofollow"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                    >
                      {t('Profil', 'Profile')}
                      <span aria-hidden="true">{Icon.external}</span>
                    </a>
                  ) : null,
                },
              ]}
            />
          </Card>
        </div>

        <RecordRail
          entity="career_application"
          id={application.id}
          status={application.status}
          assignedTo={application.assignedTo}
          assignableStaff={staff}
          notes={notes}
          activity={activity}
        />
      </div>
    </>
  );
}
