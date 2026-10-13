import { notFound } from 'next/navigation';

import { MakeOffer } from '@/components/admin/make-offer';
import { PersonPanel } from '@/components/admin/person-panel';
import { RecordRail } from '@/components/admin/record-rail';
import { Icon } from '@/components/admin/icons';
import { Badge, ButtonLink, Card, DateText, DetailList, RecordHeader, relativeDays } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { getEnquiry } from '@/lib/admin/enquiries';
import { listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { offersFor } from '@/lib/admin/offers/repo';
import { listNotes } from '@/lib/admin/notes';
import { findDuplicateCandidates, getPersonSummary } from '@/lib/admin/people';
import { listAssignableStaff } from '@/lib/admin/staff';
import { ORGANISER_BRIEF_LABELS, formatBriefValue } from '@/lib/admin/brief-labels';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';

const KIND_LABEL = { general: 'Enquiry', group: 'Group enquiry', company: 'Company enquiry' } as const;

/**
 * Where an enquiry came from, when that says something. The contact page is
 * where every enquiry comes from, and a demo seed is plumbing; the interest
 * list (German for Medical's popup) is worth knowing.
 */
const SOURCE_LABEL: Record<string, string | null> = {
  'contact-page': null,
  'demo-seed': null,
  'interest-list': 'Interest list',
};

const sourceLabel = (source: string | null | undefined) => {
  if (!source) return null;
  if (source in SOURCE_LABEL) return SOURCE_LABEL[source];
  const words = source.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
};

/**
 * One enquiry.
 *
 * The record's head with its facts — when, what kind, the address, in which
 * language — then two columns: the record on the left, the work done to it on
 * the right, where who has it is shown and changed. The split is the same on every queue detail screen, which is
 * what makes them feel like one product rather than screens that happen to
 * share a sidebar.
 *
 * The reply button is a `mailto:`, not a compose box. CASA has no outbound mail
 * infrastructure wired to this workspace, and a reply form that silently went
 * nowhere — or worse, sent from a no-reply address the visitor cannot answer —
 * would be a downgrade from the inbox staff use today. When sending is real,
 * this is where it goes.
 */
export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireModule('enquiries')]);
  const enquiry = await getEnquiry(id);

  if (!enquiry) {
    notFound();
  }

  const canOffer = canAccess(user, 'offers', 'edit');
  const [notes, activity, staff, flags, person, offers] = await Promise.all([
    listNotes('enquiry', enquiry.id),
    activityFor('enquiry', enquiry.id),
    listAssignableStaff(),
    listFlags('enquiry', enquiry.id),
    enquiry.personId ? getPersonSummary(enquiry.personId) : null,
    canOffer ? offersFor({ enquiryId: enquiry.id }) : [],
  ]);
  const candidates = person
    ? await findDuplicateCandidates({
        email: enquiry.email,
        excludePersonId: person.id,
      })
    : [];

  const fullName = [enquiry.firstName, enquiry.lastName].filter(Boolean).join(' ');
  const cameFrom = sourceLabel(enquiry.source);

  const brief = enquiry.organiserBrief
    ? Object.entries(enquiry.organiserBrief).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
    : [];

  return (
    <>
      <RecordHeader
        backHref="/admin/enquiries"
        backLabel="All enquiries"
        title={fullName || enquiry.email}
        subtitle={enquiry.topic}
        status={<Badge tone={STATUS_TONES[enquiry.status]}>{STATUS_LABELS[enquiry.status]}</Badge>}
        actions={
          <>
            {canOffer ? <MakeOffer from={{ enquiryId: enquiry.id }} existing={offers} /> : null}
            <ButtonLink href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.topic}`)}`} variant="primary">Reply by email</ButtonLink>
          </>
        }
        facts={[
          { label: 'Received', icon: Icon.clock, tint: 'blue', value: <DateText value={enquiry.submittedAt} />, sub: relativeDays(enquiry.submittedAt) },
          {
            label: 'Kind',
            icon: Icon.enquiries,
            tint: enquiry.kind === 'general' ? 'ink' : 'sun',
            value: KIND_LABEL[enquiry.kind],
            sub: cameFrom ? `From the ${cameFrom.toLowerCase()}` : undefined,
          },
          { label: 'Email', icon: Icon.mail, tint: 'ink', value: enquiry.email, href: `mailto:${enquiry.email}` },
          { label: 'Wrote in', icon: Icon.globe, tint: 'sun', value: enquiry.locale === 'de' ? 'German' : 'English' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title="Message" icon={Icon.note} tint="blue">
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

          {brief.length > 0 ? (
            <Card title="Organiser brief" icon={Icon.people} tint="sun">
              <DetailList
                items={brief.map(([key, value]) => ({
                  label: ORGANISER_BRIEF_LABELS[key] ?? key,
                  value: formatBriefValue(value),
                }))}
              />
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <PersonPanel
            person={person}
            candidates={candidates}
            flags={flags}
            returnTo={`/admin/enquiries/${enquiry.id}`}
          />
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
      </div>
    </>
  );
}
