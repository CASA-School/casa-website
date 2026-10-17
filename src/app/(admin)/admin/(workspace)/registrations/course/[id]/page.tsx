import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createBookingFromWizardAction, waitlistFromWizardAction } from '../../../bookings/actions';
import { BookingWizard } from '../../../bookings/booking-wizard';
import { WaitlistForm } from '../../../catalogue/waitlist-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { PersonPanel } from '@/components/admin/person-panel';
import { FactGrid, MetaItem, MetaLine, OwnerControl, StatusBar, SubmissionCard, Timeline } from '@/components/admin/record-parts';
import { Badge, BirthDate, Card, DateText, DetailList, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingOffer } from '@/lib/admin/booking-offer';
import { query } from '@/lib/admin/db';
import { listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { findDuplicateCandidates, getPersonSummary, latestConfirmedLevel } from '@/lib/admin/people';
import { getCourseRegistration } from '@/lib/admin/registrations';
import { inTheirLanguage, replyHref } from '@/lib/admin/reply';
import { listAssignableStaff } from '@/lib/admin/staff';
import { levelGroups } from '@/lib/admin/waitlist';
import { LetterKindIcon } from '@/components/admin/letters/letter-kind';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForRegistration } from '@/lib/admin/letters/repo';
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
 * One course registration, in the inbox records' one design (the enquiry page
 * first, 2026-10-14; registrations and applications 2026-10-15): the head with
 * who and which course and, in its bar, where it stands and who has it; the
 * registration as it was sent — the course and the facts that decide the next
 * step (the dates, the level, a room, visa support), with what they wrote; who
 * they are; beside it the person and one line of notes and changes. „Buchung
 * anlegen" is the page's main action, so „Antworten" is a quiet one here.
 */
export default async function CourseRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireModule('registrations')]);
  const [registration, { t, lang }] = await Promise.all([getCourseRegistration(id), getI18n()]);

  if (!registration) {
    notFound();
  }

  const canEdit = canAccess(user, 'registrations', 'edit');
  const canBook = canAccess(user, 'bookings', 'edit') && Boolean(registration.personId);
  const offer = canBook ? await bookingOffer() : null;
  // A full course: the registration can go straight into a level's queue for its start.
  const queues = canBook && registration.courseInstanceId;
  const [levels, groups] = queues
    ? await Promise.all([
        query<{ code: string }>(`SELECT code FROM levels ORDER BY sort_order`).then((rows) => rows.map((r) => r.code)),
        levelGroups([registration.courseInstanceId!]),
      ])
    : [[], []];

  const [notes, activity, staff, flags, person, courseName, letters] = await Promise.all([
    listNotes('course_registration', registration.id),
    activityFor('course_registration', registration.id),
    listAssignableStaff(),
    listFlags('course_registration', registration.id),
    registration.personId ? getPersonSummary(registration.personId) : null,
    courseNameResolver(),
    lettersForRegistration(registration.id),
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

  const declared = registration.declaredLevelCode ?? registration.declaredLevelRaw;
  const fullName = `${registration.firstName} ${registration.lastName}`;
  const course = courseName(registration.courseTypeLabel, registration.courseTypeId) ?? t('Kurs', 'Course');
  const option = parseOptionLabel(registration.courseInstanceLabel);
  const german = registration.locale === 'de';
  const via = t('über das Anmeldeformular', 'from the registration form');
  const reply = replyHref({
    email: registration.email,
    subject: inTheirLanguage(registration.locale, `Deine Anmeldung: ${course}`, `Your registration: ${course}`),
    firstName: registration.firstName,
    locale: registration.locale,
    signer: user.name,
  });
  const accommodation = registration.accommodationType
    ? ACCOMMODATION[registration.accommodationType]
      ? pick(lang, ACCOMMODATION[registration.accommodationType])
      : registration.accommodationType
    : t('Nötig', 'Needed');

  return (
    <>
      <RecordHeader
        backHref="/admin/registrations/course"
        backLabel={t('Anmeldungen', 'Registrations')}
        title={fullName}
        avatar={fullName}
        status={<Badge tone="neutral">{t('Kurs', 'Course')}</Badge>}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">{course}</span>
            <MetaLine>
              <MetaItem icon={Icon.mail}>
                <a href={`mailto:${registration.email}`} className="hover:text-[var(--casa-ink)] hover:underline">
                  {registration.email}
                </a>
              </MetaItem>
              <MetaItem icon={Icon.phone}>
                <a href={`tel:${registration.phone}`} className="hover:text-[var(--casa-ink)] hover:underline">
                  {registration.phone}
                </a>
              </MetaItem>
              <MetaItem icon={Icon.globe}>{german ? t('auf Deutsch', 'in German') : t('auf Englisch', 'in English')}</MetaItem>
            </MetaLine>
          </>
        }
        actions={
          canBook && offer && registration.personId ? (
            <>
              {queues ? (
                <FormDialog trigger={t('Auf die Warteliste', 'Waiting list')} title={t(`${fullName} auf die Warteliste`, `${fullName} on the waiting list`)} size="sm">
                  <WaitlistForm
                    personId={registration.personId}
                    courseInstanceId={registration.courseInstanceId!}
                    levels={levels}
                    groups={groups}
                    registrationId={registration.id}
                    defaultLevel={registration.declaredLevelCode}
                    returnTo={`/admin/registrations/course/${registration.id}`}
                  />
                </FormDialog>
              ) : null}
              <FormDialog trigger={t('Buchung anlegen', 'Create booking')} title={t(`${fullName} buchen`, `Book ${fullName}`)} triggerVariant="primary" width="lg">
                <BookingWizard
                  personId={registration.personId}
                  personName={fullName}
                  offer={offer}
                  preselectedCohortId={registration.courseInstanceId}
                  sourceRegistrationId={registration.id}
                  returnTo={`/admin/registrations/course/${registration.id}`}
                  action={createBookingFromWizardAction}
                  waitlistAction={waitlistFromWizardAction}
                />
              </FormDialog>
            </>
          ) : null
        }
        bar={
          <>
            <StatusBar entity="course_registration" id={registration.id} status={registration.status} canEdit={canEdit} />
            <OwnerControl entity="course_registration" id={registration.id} assignedTo={registration.assignedTo} staff={staff} me={user} canEdit={canEdit} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <SubmissionCard
            name={fullName}
            email={registration.email}
            at={registration.submittedAt}
            via={via}
            title={course}
            reply={{ href: reply, locale: registration.locale, primary: !canBook }}
          >
            <FactGrid
              facts={[
                {
                  label: t('Zeitraum', 'Dates'),
                  value: option?.start
                    ? formatRange(option.start, option.end, lang)
                    : option?.toBeArranged
                      ? t('Wird noch festgelegt', 'To be arranged')
                      : (option?.raw ?? null),
                  sub: [localDays(option?.days ?? null, lang), option?.time].filter(Boolean).join(' · ') || undefined,
                },
                {
                  // A confirmed level outranks the learner's own claim; the claim stays on the person card below.
                  label: t('Niveau', 'Level'),
                  value: confirmed?.level ?? declared,
                  sub: confirmed
                    ? t(`Einstufung · ${confirmed.reviewerName ?? 'ehemaliges Teammitglied'}`, `Placement · ${confirmed.reviewerName ?? 'a former colleague'}`)
                    : declared
                      ? registration.declaredLevelCode
                        ? t('Selbst angegeben', 'Self-declared')
                        : t('Selbst angegeben · nicht erkannt', 'Self-declared · unrecognised')
                      : undefined,
                  tone: confirmed ? 'good' : 'plain',
                },
                {
                  label: t('Unterkunft', 'Accommodation'),
                  value: registration.accommodationRequired ? accommodation : t('Nicht nötig', 'Not needed'),
                  tone: registration.accommodationRequired ? 'attention' : 'plain',
                },
                {
                  label: t('Visumshilfe', 'Visa support'),
                  value: registration.visaRequired ? t('Nötig', 'Needed') : t('Nicht nötig', 'Not needed'),
                  tone: registration.visaRequired ? 'attention' : 'plain',
                },
                ...(registration.allergies ? [{ label: t('Allergien', 'Allergies'), value: registration.allergies, tone: 'attention' as const }] : []),
              ]}
            />
            {registration.notes ? (
              <figure className="mt-4">
                <figcaption className="mb-1.5 text-[0.74rem] font-semibold text-[var(--casa-muted)]">{t('Eigene Anmerkungen', 'Their notes')}</figcaption>
                <blockquote className="max-w-prose border-l-2 border-[#d3dbe6] pl-3.5 text-[0.95rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">
                  {registration.notes}
                </blockquote>
              </figure>
            ) : null}
          </SubmissionCard>

          <Card title={t('Angaben zur Person', 'Applicant')} icon={Icon.person} tint="ink">
            <DetailList
              items={[
                {
                  label: t('Name', 'Name'),
                  value: `${SALUTATIONS[registration.salutation] ? pick(lang, SALUTATIONS[registration.salutation]) : registration.salutation} ${fullName}`,
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
                { label: t('Geburtsdatum', 'Date of birth'), value: <BirthDate value={registration.birthDate ?? registration.birthDateRaw} /> },
                ...(confirmed && declared
                  ? [
                      {
                        label: t('Angegebenes Niveau', 'Declared level'),
                        value: (
                          <span className="flex items-center gap-2">
                            {declared}
                            {!registration.declaredLevelCode ? <Badge tone="warning">{t('nicht erkannt', 'unrecognised')}</Badge> : null}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <PersonPanel person={person} candidates={candidates} flags={flags} returnTo={`/admin/registrations/course/${registration.id}`} />
          {/* Before there is a booking: the down payment, or the placement-test result (docs/LETTERS.md). */}
          <Card
            title={t('Briefe', 'Letters')}
            icon={Icon.mail}
            tint="blue"
            actions={
              canEdit ? (
                <Link href={`/admin/registrations/course/${registration.id}/letter`} className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
                  {t('Brief schreiben', 'Write a letter')}
                </Link>
              ) : undefined
            }
          >
            {letters.length ? (
              <ul className="-my-1 space-y-0.5">
                {letters.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/letters/${l.id}`} className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-ws-sunk">
                      <LetterKindIcon kind={l.kind} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{pick(lang, LETTER_KIND_LABELS[l.kind])}</span>
                      <span className="shrink-0 text-xs text-[var(--casa-muted)]">
                        <DateText value={l.sentAt} compact />
                        {l.sentByName ? ` · ${l.sentByName}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--casa-muted)]">{t('Noch kein Brief.', 'No letter yet.')}</p>
            )}
          </Card>
          <Timeline
            canWrite={canEdit}
            entity="course_registration"
            id={registration.id}
            notes={notes}
            activity={activity}
            origin={{ at: registration.submittedAt, label: t('Angemeldet über das Formular', 'Registered through the form') }}
          />
        </div>
      </div>
    </>
  );
}
