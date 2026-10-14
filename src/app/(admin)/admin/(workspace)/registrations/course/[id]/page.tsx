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
import { Badge, BirthDate, ButtonLink, Card, DateText, DetailList, RecordHeader } from '@/components/admin/ui';
import { activityFor } from '@/lib/admin/activity';
import { listFlags } from '@/lib/admin/flags';
import { pick, relativeDays, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
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
import { courseNameResolver } from '../../course-names';
import { formatRange, localDays, parseOptionLabel } from '../../option-label';

const SALUTATIONS: Record<string, Bilingual> = {
  mr: { de: 'Herr', en: 'Mr' },
  ms: { de: 'Frau', en: 'Ms' },
  mx: { de: 'Mx', en: 'Mx' },
  neutral: { de: 'Keine Anrede', en: 'No salutation' },
};

const ACCOMMODATION: Record<string, Bilingual> = {
  flat: { de: 'WG', en: 'Shared flat' },
  host: { de: 'Gastfamilie', en: 'Host family' },
};

/**
 * One course registration.
 *
 * The record's head carries what decides the next step — when it came in, the
 * dates, the level, whether a room or visa support is needed — and the cards
 * under it hold the rest: who they are, and what they asked CASA to arrange
 * beyond a seat. Who has it is the rail's, where it is changed. The dated
 * option is read out of its stored label (`../../option-label.ts`) and shown
 * as written when it does not parse.
 */
export default async function CourseRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireModule('registrations')]);
  const [registration, { t, lang }] = await Promise.all([getCourseRegistration(id), getI18n()]);

  if (!registration) {
    notFound();
  }

  const canBook = canAccess(user, 'bookings', 'edit') && Boolean(registration.personId);
  const offer = canBook ? await bookingOffer() : null;

  const [notes, activity, staff, flags, person, courseName] = await Promise.all([
    listNotes('course_registration', registration.id),
    activityFor('course_registration', registration.id),
    listAssignableStaff(),
    listFlags('course_registration', registration.id),
    registration.personId ? getPersonSummary(registration.personId) : null,
    courseNameResolver(),
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
  const course = courseName(registration.courseTypeLabel, registration.courseTypeId);
  const option = parseOptionLabel(registration.courseInstanceLabel);

  return (
    <>
      <RecordHeader
        backHref="/admin/registrations/course"
        backLabel={t('Alle Kursanmeldungen', 'All course registrations')}
        title={fullName}
        avatar={fullName}
        subtitle={course ?? undefined}
        status={<Badge tone={STATUS_TONES[registration.status]}>{pick(lang, STATUS_LABELS[registration.status])}</Badge>}
        actions={
          <>
            {canBook && offer && registration.personId ? (
              <FormDialog
                trigger={t('Buchung anlegen', 'Create booking')}
                title={t(`${fullName} buchen`, `Book ${fullName}`)}
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
                `CASA registration — ${course ?? 'your course'}`
              )}`}>{t('Per E-Mail antworten', 'Reply by email')}</ButtonLink>
          </>
        }
        facts={[
          {
            label: t('Eingegangen', 'Received'),
            icon: Icon.clock,
            tint: 'blue',
            value: <DateText value={registration.submittedAt} />,
            sub: relativeDays(registration.submittedAt, lang),
          },
          {
            label: t('Zeitraum', 'Dates'),
            icon: Icon.calendar,
            tint: 'blue',
            value: option?.start
              ? formatRange(option.start, option.end, lang)
              : option?.toBeArranged
                ? t('Wird noch festgelegt', 'To be arranged')
                : (option?.raw ?? null),
            sub: [localDays(option?.days ?? null, lang), option?.time].filter(Boolean).join(' · ') || undefined,
          },
          {
            // A confirmed level outranks the learner's own claim; the claim
            // stays on the Applicant card below when both exist.
            label: t('Niveau', 'Level'),
            icon: Icon.book,
            tint: 'red',
            value: confirmed?.level ?? declared,
            sub: confirmed
              ? t(
                  `Einstufung · ${confirmed.reviewerName ?? 'ehemaliges Teammitglied'}`,
                  `Placement · ${confirmed.reviewerName ?? 'a former colleague'}`
                )
              : declared
                ? registration.declaredLevelCode
                  ? t('Selbst angegeben', 'Self-declared')
                  : t('Selbst angegeben · nicht erkannt', 'Self-declared · unrecognised')
                : undefined,
          },
          {
            label: t('Unterkunft', 'Accommodation'),
            icon: Icon.rooms,
            tint: registration.accommodationRequired ? 'blue' : 'ink',
            value: registration.accommodationRequired
              ? registration.accommodationType
                ? ACCOMMODATION[registration.accommodationType]
                  ? pick(lang, ACCOMMODATION[registration.accommodationType])
                  : registration.accommodationType
                : t('Nötig', 'Needed')
              : t('Nicht nötig', 'Not needed'),
          },
          {
            label: t('Visumshilfe', 'Visa support'),
            icon: Icon.globe,
            tint: registration.visaRequired ? 'sun' : 'ink',
            value: registration.visaRequired ? t('Nötig', 'Needed') : t('Nicht nötig', 'Not needed'),
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title={t('Angaben zur Person', 'Applicant')} icon={Icon.person} tint="ink">
            <DetailList
              items={[
                {
                  label: t('Name', 'Name'),
                  value: `${SALUTATIONS[registration.salutation] ? pick(lang, SALUTATIONS[registration.salutation]) : registration.salutation} ${fullName}`,
                },
                {
                  label: t('E-Mail', 'Email'),
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
                  label: t('Telefon', 'Phone'),
                  value: (
                    <a href={`tel:${registration.phone}`} className="font-medium">
                      {registration.phone}
                    </a>
                  ),
                },
                {
                  label: t('Nationalität', 'Nationality'),
                  value: registration.nationalityName ?? (
                    <span className="flex items-center gap-2">
                      {registration.nationalityRaw}
                      <Badge tone="warning">{t('nicht erkannt', 'unrecognised')}</Badge>
                    </span>
                  ),
                },
                {
                  label: t('Geburtsdatum', 'Date of birth'),
                  value: <BirthDate value={registration.birthDate ?? registration.birthDateRaw} />,
                },
                {
                  label: t('Angemeldet auf', 'Registered in'),
                  value: registration.locale === 'de' ? t('Deutsch', 'German') : t('Englisch', 'English'),
                },
                ...(confirmed && declared
                  ? [
                      {
                        label: t('Angegebenes Niveau', 'Declared level'),
                        value: (
                          <span className="flex items-center gap-2">
                            {declared}
                            {!registration.declaredLevelCode ? (
                              <Badge tone="warning">{t('nicht erkannt', 'unrecognised')}</Badge>
                            ) : null}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>

          {needsSomething ? (
            <Card title={t('Zu organisieren', 'Needs arranging')} icon={Icon.attention} tint="sun">
              <DetailList
                items={[
                  { label: t('Allergien', 'Allergies'), value: registration.allergies },
                  {
                    label: t('Eigene Anmerkungen', 'Their notes'),
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
