import { notFound } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { RecordRail } from '@/components/admin/record-rail';
import { Badge, Card, DateText, DetailList, PageHeader } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { getApplication } from '@/lib/admin/careers';
import { formatFileSize } from '@/lib/admin/format';
import { listNotes } from '@/lib/admin/notes';
import { listAssignableStaff } from '@/lib/admin/staff';

/**
 * One application.
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
      <PageHeader
        backHref="/admin/applications"
        backLabel="All applications"
        eyebrow="Application"
        title={`${application.firstName} ${application.lastName}`}
        description={application.positionTitle}
        actions={
          <>
            {application.hasStoredFile ? (
              <a
                href={`/admin/applications/${application.id}/cv`}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
              >
                <span aria-hidden="true">{Icon.download}</span>
                Download CV
              </a>
            ) : null}
            <a
              href={`mailto:${application.email}?subject=${encodeURIComponent(
                `Your application — ${application.positionTitle}`
              )}`}
              className="inline-flex h-9 items-center rounded-lg border border-ws-line-firm bg-white px-4 text-sm font-semibold transition-colors hover:border-[var(--casa-blue)]/45"
            >
              Reply by email
            </a>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card title="Cover letter">
            <p className="max-w-prose text-base leading-relaxed whitespace-pre-line">
              {application.coverLetter}
            </p>
          </Card>

          <Card title="Candidate">
            <DetailList
              items={[
                {
                  label: 'Email',
                  value: (
                    <a
                      href={`mailto:${application.email}`}
                      className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                    >
                      {application.email}
                    </a>
                  ),
                },
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
                { label: 'Applied for', value: application.positionTitle },
                {
                  label: 'Applied in',
                  value: application.locale === 'de' ? 'German' : 'English',
                },
                { label: 'Applied', value: <DateText value={application.createdAt} withTime /> },
              ]}
            />
          </Card>

          <Card title="CV">
            {application.hasStoredFile ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{application.cvFileName}</p>
                  <p className="mt-0.5 text-xs text-[var(--casa-text-subtle)]">
                    {formatFileSize(application.cvFileSize)}
                    {application.cvMimeType ? ` · ${application.cvMimeType}` : ''}
                  </p>
                </div>
                <a
                  href={`/admin/applications/${application.id}/cv`}
                  className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-ws-line-firm bg-white px-3 text-xs font-semibold transition-colors hover:border-[var(--casa-blue)]/45"
                >
                  <span aria-hidden="true">{Icon.download}</span>
                  Download
                </a>
              </div>
            ) : (
              <p className="text-sm text-[var(--casa-text-subtle)]">
                The application names{' '}
                <span className="font-medium">{application.cvFileName}</span> but no
                file is stored against it. Ask the candidate to send it directly.
              </p>
            )}

            <p className="mt-4 border-t border-ws-line-soft pt-3 text-xs leading-relaxed text-[var(--casa-text-subtle)]">
              A CV is personal data under GDPR. Download it only when you are
              acting on the application, and do not forward it outside the
              hiring conversation.
            </p>
          </Card>

          {application.rawStatus === 'submitted' ? (
            <p className="text-xs text-[var(--casa-text-subtle)]">
              <Badge tone="quiet">Untouched</Badge>{' '}
              Still carrying the status the public form wrote. Setting a status
              here is what puts it in the pipeline.
            </p>
          ) : null}
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
