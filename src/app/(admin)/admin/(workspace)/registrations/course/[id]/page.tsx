import { notFound } from 'next/navigation';

import { createBookingFromWizardAction } from '../../../bookings/actions';
import { BookingWizard } from '../../../bookings/booking-wizard';
import { FormDialog } from '@/components/admin/dialogs';
import { PersonPanel } from '@/components/admin/person-panel';
import { canAccess } from '@/lib/admin/access';
import { bookingOffer } from '@/lib/admin/booking-offer';
import { requireModule } from '@/lib/admin/guard';
import { RecordRail } from '@/components/admin/record-rail';
import { Icon } from '@/components/admin/icons';
import { Badge, BirthDate, ButtonLink, Card, DateText, DetailList, RecordHeader, relativeDays } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { listFlags } from '@/lib/admin/flags';
import { listNotes } from '@/lib/admin/notes';
import {
  findDuplicateCandidates,
  getPersonSummary,
  latestConfirmedLevel,
} from '@/lib/admin/people';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { getCourseRegistration } from '@/lib/admin/registrations';
import { listAssignableStaff } from '@/lib/admin/staff';
import { toDateInputValue } from '@/lib/dates';

const SALUTATIONS: Record<string, string> = {
  mr: 'Mr',
  ms: 'Ms',
  mx: 'Mx',
  neutral: 'No salutation',
};

const ACCOMMODATION: Record<string, string> = {
  flat: 'Shared flat',
  host: 'Host family',
};

/**
 * One course registration.
 *
 * The record's head carries what decides the next step — when it came in, the
 * level, whether a room or visa support is needed, who has it — and the cards
 * under it hold the rest in the order the work happens: what they registered
 * for, who they are, and what they asked CASA to arrange beyond a seat.
 */
export default async function CourseRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireModule('registrations')]);
  const registration = await getCourseRegistration(id);

  if (!registration) {
    notFound();
  }

  const canBook = canAccess(user, 'bookings', 'edit') && Boolean(registration.personId);
  const offer = canBook ? await bookingOffer() : null;

  const [notes, activity, staff, flags, person] = await Promise.all([
    listNotes('course_registration', registration.id),
    activityFor('course_registration', registration.id),
    listAssignableStaff(),
    listFlags('course_registration', registration.id),
    registration.personId ? getPersonSummary(registration.personId) : null,
  ]);
  const [candidates, confirmed] = person
    ? await Promise.all([
        findDuplicateCandidates({
          email: registration.email,
          lastName: registration.lastName,
          birthDate: toDateInputValue(registration.birthDate) || null,
          excludePersonId: person.id,
        }),
        latestConfirmedLevel(person.canonicalId),
      ])
    : [[], null];

  const needsSomething = Boolean(registration.allergies) || Boolean(registration.notes);
  const declared = registration.declaredLevelCode ?? registration.declaredLevelRaw;
  const fullName = `${registration.firstName} ${registration.lastName}`;

  return (
    <>
      <RecordHeader
        backHref="/admin/registrations/course"
        backLabel="All course registrations"
        title={fullName}
        subtitle={registration.courseTypeLabel ?? undefined}
        status={<Badge tone={STATUS_TONES[registration.status]}>{STATUS_LABELS[registration.status]}</Badge>}
        actions={
          <>
            {canBook && offer && registration.personId ? (
              <FormDialog
                trigger="Create booking"
                title={`Book ${fullName}`}
                triggerVariant="primary"
                width="lg"
              >
                <BookingWizard
                  personId={registration.personId}
                  personName={fullName}
                  offer={offer}
                  preselectedCohortId={registration.courseInstanceId}
                  sourceRegistrationId={registration.id}
                  returnTo={`/admin/registrations/course/${registration.id}`}
                  action={createBookingFromWizardAction}
                />
              </FormDialog>
            ) : null}
            <ButtonLink href={`mailto:${registration.email}?subject=${encodeURIComponent(
                `CASA registration — ${registration.courseTypeLabel ?? 'your course'}`
              )}`}>Reply by email</ButtonLink>
          </>
        }
        facts={[
          {
            label: 'Received',
            icon: Icon.clock,
            tint: 'blue',
            value: <DateText value={registration.submittedAt} />,
            sub: relativeDays(registration.submittedAt),
          },
          {
            // A confirmed level outranks the learner's own claim; the claim
            // stays on the Course card below when both exist.
            label: 'Level',
            icon: Icon.book,
            tint: 'red',
            value: confirmed?.level ?? declared,
            sub: confirmed
              ? `Placement · ${confirmed.reviewerName ?? 'a former colleague'}`
              : declared
                ? registration.declaredLevelCode
                  ? 'Self-declared'
                  : 'Self-declared · unrecognised'
                : undefined,
          },
          {
            label: 'Accommodation',
            icon: Icon.rooms,
            tint: registration.accommodationRequired ? 'blue' : 'ink',
            value: registration.accommodationRequired
              ? registration.accommodationType
                ? (ACCOMMODATION[registration.accommodationType] ?? registration.accommodationType)
                : 'Needed'
              : 'Not needed',
          },
          {
            label: 'Visa support',
            icon: Icon.globe,
            tint: registration.visaRequired ? 'sun' : 'ink',
            value: registration.visaRequired ? 'Needed' : 'Not needed',
          },
          {
            label: 'Owner',
            icon: Icon.person,
            tint: registration.assignedTo ? 'green' : 'ink',
            value: staff.find((member) => member.id === registration.assignedTo)?.name ?? 'Nobody yet',
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title="Course" icon={Icon.catalogue} tint="red" footer={<p className="text-xs text-[var(--casa-text-subtle)]">Reference <code className="font-mono">{registration.requestId}</code></p>}>
            <DetailList
              items={[
                { label: 'Option chosen', value: registration.courseInstanceLabel, wide: true },
                ...(confirmed && declared
                  ? [
                      {
                        label: 'Declared level',
                        value: (
                          <span className="flex items-center gap-2">
                            {declared}
                            {!registration.declaredLevelCode ? (
                              <Badge tone="warning">unrecognised</Badge>
                            ) : null}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>

          <Card title="Applicant" icon={Icon.person} tint="ink">
            <DetailList
              items={[
                {
                  label: 'Name',
                  value: `${SALUTATIONS[registration.salutation] ?? registration.salutation} ${fullName}`,
                },
                {
                  label: 'Email',
                  value: (
                    <a
                      href={`mailto:${registration.email}`}
                      className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                    >
                      {registration.email}
                    </a>
                  ),
                },
                {
                  label: 'Phone',
                  value: (
                    <a href={`tel:${registration.phone}`} className="font-medium">
                      {registration.phone}
                    </a>
                  ),
                },
                {
                  label: 'Nationality',
                  value: registration.nationalityName ?? (
                    <span className="flex items-center gap-2">
                      {registration.nationalityRaw}
                      <Badge tone="warning">unrecognised</Badge>
                    </span>
                  ),
                },
                {
                  label: 'Date of birth',
                  value: <BirthDate value={registration.birthDate ?? registration.birthDateRaw} />,
                },
                {
                  label: 'Registered in',
                  value: registration.locale === 'de' ? 'German' : 'English',
                },
              ]}
            />
          </Card>

          {needsSomething ? (
            <Card title="Needs arranging" icon={Icon.attention} tint="sun">
              <DetailList
                items={[
                  { label: 'Allergies', value: registration.allergies },
                  {
                    label: 'Their notes',
                    value: registration.notes,
                    wide: true,
                  },
                ]}
              />
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <PersonPanel
            person={person}
            candidates={candidates}
            flags={flags}
            returnTo={`/admin/registrations/course/${registration.id}`}
          />
          <RecordRail
            entity="course_registration"
            id={registration.id}
            status={registration.status}
            assignedTo={registration.assignedTo}
            assignableStaff={staff}
            notes={notes}
            activity={activity}
          />
        </div>
      </div>
    </>
  );
}
