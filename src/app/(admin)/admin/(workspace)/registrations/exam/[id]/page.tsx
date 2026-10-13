import { notFound } from 'next/navigation';

import { PersonPanel } from '@/components/admin/person-panel';
import { RecordRail } from '@/components/admin/record-rail';
import { Icon } from '@/components/admin/icons';
import { Badge, BirthDate, ButtonLink, Card, DateText, DetailList, RecordHeader, relativeDays } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { listFlags } from '@/lib/admin/flags';
import { listNotes } from '@/lib/admin/notes';
import { findDuplicateCandidates, getPersonSummary } from '@/lib/admin/people';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';
import { getExamRegistration, registrationTypeLabel } from '@/lib/admin/registrations';
import { listAssignableStaff } from '@/lib/admin/staff';
import { toDateInputValue } from '@/lib/dates';

const SALUTATIONS: Record<string, string> = {
  mr: 'Mr',
  ms: 'Ms',
  mx: 'Mx',
  neutral: 'No salutation',
};

/**
 * One exam registration.
 *
 * The head carries the sitting, the parts and who has it; under it, the
 * official-name confirmation gets the first card and a warning of its own. A
 * telc certificate is printed from the name on the entry, and a mismatch with
 * the candidate's ID is discovered on exam day, after the fee is paid and the
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
        birthDate: toDateInputValue(registration.birthDate) || null,
        excludePersonId: person.id,
      })
    : [];

  const fullName = `${registration.firstName} ${registration.lastName}`;

  return (
    <>
      <RecordHeader
        backHref="/admin/registrations/exam"
        backLabel="All exam registrations"
        title={fullName}
        subtitle={registration.examTypeLabel ?? undefined}
        status={<Badge tone={STATUS_TONES[registration.status]}>{STATUS_LABELS[registration.status]}</Badge>}
        actions={
          <ButtonLink href={`mailto:${registration.email}?subject=${encodeURIComponent(
              `CASA exam registration — ${registration.examTypeLabel ?? 'your exam'}`
            )}`} variant="primary">Reply by email</ButtonLink>
        }
        facts={[
          {
            label: 'Received',
            icon: Icon.clock,
            tint: 'blue',
            value: <DateText value={registration.submittedAt} />,
            sub: relativeDays(registration.submittedAt),
          },
          { label: 'Sitting', icon: Icon.calendar, tint: 'blue', value: registration.examSessionLabel },
          {
            label: 'Parts',
            icon: Icon.book,
            tint: 'red',
            value: registrationTypeLabel(registration.registrationType),
          },
          {
            label: 'Email',
            icon: Icon.mail,
            tint: 'ink',
            value: registration.email,
            href: `mailto:${registration.email}`,
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
          <Card
            title="Name on the certificate"
            description="Check against photo ID."
            icon={registration.officialNameConfirmed ? Icon.check : Icon.attention}
            tint={registration.officialNameConfirmed ? 'green' : 'sun'}
          >
            <p className="text-2xl leading-tight font-extrabold tracking-[-0.02em] text-[var(--casa-ink)]">
              {fullName}
            </p>
            <p className="mt-3">
              {registration.officialNameConfirmed ? (
                <Badge tone="positive">Candidate confirmed this matches their ID</Badge>
              ) : (
                <Badge tone="danger">Not confirmed by the candidate</Badge>
              )}
            </p>
            {!registration.officialNameConfirmed ? (
              <p className="mt-2 text-xs text-[var(--casa-danger-text)]">
                Confirm by phone before the entry is filed.
              </p>
            ) : null}
          </Card>

          <Card title="Candidate" icon={Icon.person} tint="ink" footer={<p className="text-xs text-[var(--casa-text-subtle)]">Reference <code className="font-mono">{registration.requestId}</code></p>}>
            <DetailList
              items={[
                {
                  label: 'Salutation',
                  value: SALUTATIONS[registration.salutation] ?? registration.salutation,
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

        <div className="space-y-4">
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
