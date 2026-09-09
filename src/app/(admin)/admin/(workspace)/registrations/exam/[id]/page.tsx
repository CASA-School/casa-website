import { notFound } from 'next/navigation';

import { PersonPanel } from '@/components/admin/person-panel';
import { RecordRail } from '@/components/admin/record-rail';
import { Badge, BirthDate, Card, DetailList, PageHeader } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { listFlags } from '@/lib/admin/flags';
import { listNotes } from '@/lib/admin/notes';
import { findDuplicateCandidates, getPersonSummary } from '@/lib/admin/people';
import { getExamRegistration, registrationTypeLabel } from '@/lib/admin/registrations';
import { listAssignableStaff } from '@/lib/admin/staff';

const SALUTATIONS: Record<string, string> = {
  mr: 'Mr',
  ms: 'Ms',
  mx: 'Mx',
  neutral: 'No salutation',
};

/**
 * One exam registration.
 *
 * The official-name confirmation gets a card and a warning of its own. A telc
 * certificate is printed from the name on the entry, and a mismatch with the
 * candidate's ID is discovered on exam day, after the fee is paid and the
 * sitting is full — the single most expensive error this queue can pass on.
 */
export default async function ExamRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const registration = await getExamRegistration(id);

  if (!registration) {
    notFound();
  }

  const [notes, activity, staff, flags, person] = await Promise.all([
    listNotes('exam_registration', registration.id),
    activityFor('exam_registration', registration.id),
    listAssignableStaff(),
    listFlags('exam_registration', registration.id),
    registration.personId ? getPersonSummary(registration.personId) : null,
  ]);
  const candidates = person
    ? await findDuplicateCandidates({
        email: registration.email,
        lastName: registration.lastName,
        birthDate: registration.birthDate?.toISOString().slice(0, 10) ?? null,
        excludePersonId: person.id,
      })
    : [];

  return (
    <>
      <PageHeader
        backHref="/admin/registrations/exam"
        backLabel="All exam registrations"
        eyebrow="Exam registration"
        title={`${registration.firstName} ${registration.lastName}`}
        description={registration.examTypeLabel ?? undefined}
        actions={
          <a
            href={`mailto:${registration.email}?subject=${encodeURIComponent(
              `CASA exam registration — ${registration.examTypeLabel ?? 'your exam'}`
            )}`}
            className="inline-flex h-9 items-center rounded-lg bg-[var(--casa-ink-deep)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
          >
            Reply by email
          </a>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card title="Registered for">
            <DetailList
              items={[
                { label: 'Exam', value: registration.examTypeLabel },
                { label: 'Sitting', value: registration.examSessionLabel },
                {
                  label: 'Parts',
                  value: registrationTypeLabel(registration.registrationType),
                },
                {
                  label: 'Reference',
                  value: <code className="font-mono text-xs">{registration.requestId}</code>,
                },
              ]}
            />
          </Card>

          <Card
            title="Name on the certificate"
            description="The certificate is printed from this. Check it against photo ID before filing the entry."
          >
            <p className="font-[family-name:var(--font-display)] text-2xl leading-tight">
              {registration.firstName} {registration.lastName}
            </p>
            <p className="mt-3">
              {registration.officialNameConfirmed ? (
                <Badge tone="positive">Candidate confirmed this matches their ID</Badge>
              ) : (
                <Badge tone="danger">Not confirmed by the candidate</Badge>
              )}
            </p>
            {!registration.officialNameConfirmed ? (
              <p className="mt-3 text-xs leading-relaxed text-[var(--casa-danger-text)]">
                The public form requires this confirmation, so an unconfirmed entry means the record
                predates that requirement or was created another way. Confirm by phone before the
                entry is filed.
              </p>
            ) : null}
          </Card>

          <Card title="Candidate">
            <DetailList
              items={[
                {
                  label: 'Salutation',
                  value: SALUTATIONS[registration.salutation] ?? registration.salutation,
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
        </div>

        <div className="space-y-5">
          <PersonPanel
            person={person}
            candidates={candidates}
            flags={flags}
            returnTo={`/admin/registrations/exam/${registration.id}`}
          />
          <RecordRail
            entity="exam_registration"
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
