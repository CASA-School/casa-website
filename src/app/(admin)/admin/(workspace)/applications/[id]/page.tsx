import { notFound } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { RecordRail } from '@/components/admin/record-rail';
import { Badge, ButtonLink, Card, DateText, DetailList, RecordHeader, relativeDays } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { getApplication } from '@/lib/admin/careers';
import { formatFileSize } from '@/lib/admin/format';
import { listNotes } from '@/lib/admin/notes';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { listAssignableStaff } from '@/lib/admin/staff';

/**
 * One application.
 *
 * The record's head names the CV and carries the download; the cover letter
 * and the candidate's links sit under it, the rail beside them.
 *
 * The CV is a download, not an inline preview. Rendering an arbitrary uploaded
 * PDF inside the workspace means either an iframe pointed at attacker-supplied
 * bytes or a PDF renderer in the client bundle, and neither is worth it for a
 * file that is going to be read properly in a real reader anyway. The route
 * behind the button sets `Content-Disposition: attachment` for the same reason.
 */
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await getApplication(id);

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
        backLabel="All applications"
        title={`${application.firstName} ${application.lastName}`}
        subtitle={application.positionTitle}
        status={
          <>
            <Badge tone={STATUS_TONES[application.status]}>{STATUS_LABELS[application.status]}</Badge>
            {/* Still carrying the status the public form wrote: setting one in
                the rail is what puts it in the pipeline. */}
            {application.rawStatus === 'submitted' ? <Badge tone="quiet">Untouched</Badge> : null}
          </>
        }
        actions={
          <>
            {application.hasStoredFile ? (
              <ButtonLink href={`/admin/applications/${application.id}/cv`} variant="primary" plain>
                <span aria-hidden="true">{Icon.download}</span>
                Download CV
              </ButtonLink>
            ) : null}
            <ButtonLink href={`mailto:${application.email}?subject=${encodeURIComponent(
                `Your application — ${application.positionTitle}`
              )}`}>Reply by email</ButtonLink>
          </>
        }
        facts={[
          {
            label: 'Applied',
            icon: Icon.clock,
            tint: 'blue',
            value: <DateText value={application.createdAt} />,
            sub: relativeDays(application.createdAt),
          },
          {
            label: 'Email',
            icon: Icon.mail,
            tint: 'ink',
            value: application.email,
            href: `mailto:${application.email}`,
          },
          {
            // Not a fact link: those are Next links, which prefetch, and the
            // CV route is a file download. The header's button is the way in.
            label: 'CV',
            icon: Icon.download,
            tint: application.hasStoredFile ? 'ink' : 'sun',
            value: application.cvFileName,
            sub: application.hasStoredFile
              ? `${formatFileSize(application.cvFileSize)}${application.cvMimeType ? ` · ${application.cvMimeType}` : ''}`
              : 'No file stored',
          },
          { label: 'Wrote in', icon: Icon.globe, tint: 'sun', value: application.locale === 'de' ? 'German' : 'English' },
          {
            label: 'Owner',
            icon: Icon.person,
            tint: application.assignedTo ? 'green' : 'ink',
            value: staff.find((member) => member.id === application.assignedTo)?.name ?? 'Nobody yet',
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title="Cover letter" icon={Icon.note} tint="blue">
            <p className="max-w-prose text-base leading-relaxed whitespace-pre-line">
              {application.coverLetter}
            </p>
          </Card>

          <Card title="Candidate" icon={Icon.person} tint="ink">
            <DetailList
              items={[
                {
                  label: 'Phone',
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
                      Profile
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
