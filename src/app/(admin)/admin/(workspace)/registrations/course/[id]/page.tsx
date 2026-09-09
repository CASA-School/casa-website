import { notFound } from 'next/navigation';

import { NewBookingForm } from '../../../bookings/booking-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { PersonPanel } from '@/components/admin/person-panel';
import { canAccess } from '@/lib/admin/access';
import { listCohortOptions } from '@/lib/admin/bookings';
import { listCourseTypes } from '@/lib/admin/catalogue';
import { requireModule } from '@/lib/admin/guard';
import { RecordRail } from '@/components/admin/record-rail';
import { Badge, BirthDate, Card, DetailList, PageHeader } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { listFlags } from '@/lib/admin/flags';
import { listNotes } from '@/lib/admin/notes';
import {
  findDuplicateCandidates,
  getPersonSummary,
  latestConfirmedLevel,
} from '@/lib/admin/people';
import { getCourseRegistration } from '@/lib/admin/registrations';
import { listAssignableStaff } from '@/lib/admin/staff';

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
 * Grouped into three cards, in the order the work happens: who they are, what
 * they registered for, and what they need from CASA beyond a seat. That last
 * group — visa, accommodation, allergies — is the one that generates work for
 * other people, so it is a card of its own rather than six more rows.
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
  const [cohorts, courseTypes] = canBook
    ? await Promise.all([listCohortOptions(), listCourseTypes()])
    : [[], []];

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
          birthDate: registration.birthDate?.toISOString().slice(0, 10) ?? null,
          excludePersonId: person.id,
        }),
        latestConfirmedLevel(person.canonicalId),
      ])
    : [[], null];

  const needsSomething =
    registration.visaRequired ||
    registration.accommodationRequired ||
    Boolean(registration.allergies) ||
    Boolean(registration.notes);

  return (
    <>
      <PageHeader
        backHref="/admin/registrations/course"
        backLabel="All course registrations"
        eyebrow="Course registration"
        title={`${registration.firstName} ${registration.lastName}`}
        description={registration.courseTypeLabel ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {canBook && registration.personId ? (
              <FormDialog
                trigger="Create booking"
                title="Create a booking"
                triggerVariant="primary"
              >
                <NewBookingForm
                  personId={registration.personId}
                  cohorts={cohorts}
                  courseTypes={courseTypes}
                  preselectedCohortId={registration.courseInstanceId}
                  sourceRegistrationId={registration.id}
                  returnTo={`/admin/registrations/course/${registration.id}`}
                />
              </FormDialog>
            ) : null}
            <a
              href={`mailto:${registration.email}?subject=${encodeURIComponent(
                `CASA registration — ${registration.courseTypeLabel ?? 'your course'}`
              )}`}
              className="inline-flex h-9 items-center rounded-lg bg-[var(--casa-ink-deep)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
            >
              Reply by email
            </a>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card title="Registered for">
            <DetailList
              items={[
                { label: 'Course', value: registration.courseTypeLabel },
                {
                  label: 'Option chosen',
                  value: registration.courseInstanceLabel,
                },
                {
                  label: 'Declared level',
                  value: registration.declaredLevelRaw ? (
                    <span className="flex items-center gap-2">
                      {registration.declaredLevelCode ?? registration.declaredLevelRaw}
                      <Badge tone="quiet">self-declared</Badge>
                      {!registration.declaredLevelCode ? (
                        <Badge tone="warning">unrecognised</Badge>
                      ) : null}
                    </span>
                  ) : null,
                },
                {
                  label: 'Confirmed level',
                  value: confirmed ? (
                    <span className="flex items-center gap-2">
                      {confirmed.level}
                      <Badge tone="positive">placement</Badge>
                      <span className="text-xs text-[var(--casa-text-subtle)]">
                        {confirmed.reviewerName ?? 'A former colleague'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--casa-text-subtle)]">—</span>
                  ),
                },
                {
                  label: 'Reference',
                  value: <code className="font-mono text-xs">{registration.requestId}</code>,
                },
              ]}
            />
          </Card>

          <Card title="Applicant">
            <DetailList
              items={[
                {
                  label: 'Name',
                  value: `${SALUTATIONS[registration.salutation] ?? registration.salutation} ${registration.firstName} ${registration.lastName}`,
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
            <Card
              title="Needs arranging"
              description="Everything here creates work outside the classroom."
            >
              <DetailList
                items={[
                  {
                    label: 'Visa support',
                    value: registration.visaRequired ? (
                      <Badge tone="warning">Needed</Badge>
                    ) : (
                      'Not needed'
                    ),
                  },
                  {
                    label: 'Accommodation',
                    value: registration.accommodationRequired ? (
                      <span className="flex items-center gap-2">
                        <Badge tone="warning">Needed</Badge>
                        {registration.accommodationType
                          ? (ACCOMMODATION[registration.accommodationType] ??
                            registration.accommodationType)
                          : null}
                      </span>
                    ) : (
                      'Not needed'
                    ),
                  },
                  {
                    label: 'Smoker',
                    value: registration.smoker ? 'Yes' : 'No',
                  },
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

        <div className="space-y-5">
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
