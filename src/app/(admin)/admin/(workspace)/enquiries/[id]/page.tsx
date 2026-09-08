import { notFound } from 'next/navigation';

import { RecordRail } from '@/components/admin/record-rail';
import { Badge, Card, DetailList, PageHeader } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { getEnquiry } from '@/lib/admin/enquiries';
import { listNotes } from '@/lib/admin/notes';
import { listAssignableStaff } from '@/lib/admin/staff';
import { ORGANISER_BRIEF_LABELS, formatBriefValue } from '@/lib/admin/brief-labels';

/**
 * One enquiry.
 *
 * Two columns: the record on the left, the work done to it on the right. The
 * split is the same on all four queue detail screens, which is what makes them
 * feel like one product rather than four screens that happen to share a
 * sidebar.
 *
 * The reply button is a `mailto:`, not a compose box. CASA has no outbound mail
 * infrastructure wired to this workspace, and a reply form that silently went
 * nowhere — or worse, sent from a no-reply address the visitor cannot answer —
 * would be a downgrade from the inbox staff use today. When sending is real,
 * this is where it goes.
 */
export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enquiry = await getEnquiry(id);

  if (!enquiry) {
    notFound();
  }

  const [notes, activity, staff] = await Promise.all([
    listNotes('enquiry', enquiry.id),
    activityFor('enquiry', enquiry.id),
    listAssignableStaff(),
  ]);

  const fullName = [enquiry.firstName, enquiry.lastName].filter(Boolean).join(' ');

  const brief = enquiry.organiserBrief
    ? Object.entries(enquiry.organiserBrief).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
    : [];

  return (
    <>
      <PageHeader
        backHref="/admin/enquiries"
        backLabel="All enquiries"
        eyebrow={enquiry.kind === 'general' ? 'Enquiry' : `${enquiry.kind} enquiry`}
        title={fullName || enquiry.email}
        description={enquiry.topic}
        actions={
          <a
            href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.topic}`)}`}
            className="inline-flex h-9 items-center rounded-lg bg-[var(--casa-ink-deep)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
          >
            Reply by email
          </a>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card title="Message">
            {/*
             * `whitespace-pre-line`, and the one place in the workspace that
             * uses the public site's 17px reading size. This is the only
             * genuinely prose-shaped field on the screen — someone wrote it in
             * paragraphs, and it should be read in paragraphs.
             */}
            <p className="max-w-prose text-base leading-relaxed whitespace-pre-line">
              {enquiry.message}
            </p>
          </Card>

          <Card title="Contact">
            <DetailList
              items={[
                {
                  label: 'Name',
                  value: fullName || <span className="italic">not given</span>,
                },
                {
                  label: 'Email',
                  value: (
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                    >
                      {enquiry.email}
                    </a>
                  ),
                },
                { label: 'Topic', value: enquiry.topic },
                {
                  label: 'Wrote in',
                  value: enquiry.locale === 'de' ? 'German' : 'English',
                },
                { label: 'Came from', value: enquiry.source },
                {
                  label: 'Reference',
                  value: <code className="font-mono text-xs">{enquiry.requestId}</code>,
                },
              ]}
            />
          </Card>

          {brief.length > 0 ? (
            <Card
              title="Organiser brief"
              description="Collected by the public form. An estimate request, never a quotation — the binding offer still comes from CASA."
            >
              <DetailList
                items={brief.map(([key, value]) => ({
                  label: ORGANISER_BRIEF_LABELS[key] ?? key,
                  value: formatBriefValue(value),
                }))}
              />
            </Card>
          ) : null}
        </div>

        <RecordRail
          entity="enquiry"
          id={enquiry.id}
          status={enquiry.status}
          assignedTo={enquiry.assignedTo}
          assignableStaff={staff}
          notes={notes}
          activity={activity}
        />
      </div>

      {enquiry.userAgent ? (
        <p className="mt-6 text-xs text-[var(--casa-text-subtle)]">
          Submitted from <span className="font-mono">{enquiry.userAgent}</span>
        </p>
      ) : null}

      {enquiry.externalRef ? (
        <p className="mt-2 text-xs text-[var(--casa-text-subtle)]">
          FileMaker reference <Badge tone="quiet">{enquiry.externalRef}</Badge>
        </p>
      ) : null}
    </>
  );
}
