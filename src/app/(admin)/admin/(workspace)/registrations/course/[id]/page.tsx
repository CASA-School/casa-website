import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createBookingFromWizardAction, waitlistFromWizardAction } from '../../../bookings/actions';
import { BookingWizard } from '../../../bookings/booking-wizard';
import { WaitlistForm } from '../../../catalogue/waitlist-forms';
import { editRegistrationAction } from '../../actions';
import { DateFormField } from '@/components/admin/date-picker';
import { DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { PersonPanel } from '@/components/admin/person-panel';
import { FactGrid, MetaItem, MetaLine, OwnerControl, StatusBar, SubmissionCard, Timeline } from '@/components/admin/record-parts';
import { Badge, BirthDate, Button, ButtonLink, Card, DetailList, Field, Input, RecordHeader, Select, Textarea } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingOffer } from '@/lib/admin/booking-offer';
import { REGISTRATION_ACCOMMODATION, wishesWholeLevel } from '@/lib/admin/booking-levels';
import { query } from '@/lib/admin/db';
import { listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { pick, type Bilingual } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { listNotes } from '@/lib/admin/notes';
import { findDuplicateCandidates, getPersonSummary, latestConfirmedLevel } from '@/lib/admin/people';
import { getCourseRegistration } from '@/lib/admin/registrations';
import { mailHref } from '@/lib/admin/mail/href';
import { inTheirLanguage } from '@/lib/admin/reply';
import { listAssignableStaff } from '@/lib/admin/staff';
import { startLevelPlaces } from '@/lib/admin/waitlist';
import { LetterList } from '@/components/admin/letters/letter-list';
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
export default async function CourseRegistrationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }, user] = await Promise.all([params, searchParams, requireModule('registrations')]);
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
        startLevelPlaces(registration.courseInstanceId!),
      ])
    : [[], {}];

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

  // The level as they asked for it — „A2 komplett (A2.1 + A2.2) · 8 Wochen", not only the step it starts at.
  const declared = registration.declaredLevelRaw?.trim() || registration.declaredLevelCode;
  const wholeLevel = wishesWholeLevel(registration.declaredLevelRaw);
  const fullName = `${registration.firstName} ${registration.lastName}`;
  const course = courseName(registration.courseTypeLabel, registration.courseTypeId) ?? t('Kurs', 'Course');
  const option = parseOptionLabel(registration.courseInstanceLabel);
  const german = registration.locale === 'de';
  const via = t('über das Anmeldeformular', 'from the registration form');
  const reply = mailHref('course_registration', registration.id, { subject: inTheirLanguage(registration.locale, `Deine Anmeldung: ${course}`, `Your registration: ${course}`) });
  const accommodation = registration.accommodationType
    ? ACCOMMODATION[registration.accommodationType]
      ? pick(lang, ACCOMMODATION[registration.accommodationType])
      : registration.accommodationType
    : t('Nötig', 'Needed');

  // The values a colleague may correct, as they stand: compared with what was sent (`original`).
  const currentValues: Record<string, unknown> = {
    salutation: registration.salutation,
    first_name: registration.firstName,
    last_name: registration.lastName,
    email: registration.email,
    phone: registration.phone,
    nationality: registration.nationalityRaw,
    birth_date: registration.birthDateRaw,
    visa_required: registration.visaRequired,
    accommodation_required: registration.accommodationRequired,
    accommodation_type: registration.accommodationType,
    allergies: registration.allergies,
    notes: registration.notes,
  };

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
                <Link href={reply} className="hover:text-[var(--casa-ink)] hover:underline">
                  {registration.email}
                </Link>
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
          <>
            {/* The course chosen is full or closed: offer its next start by letter (2026-10-21), or a place in its queue. */}
            {canEdit && registration.courseInstanceId ? (
              <ButtonLink href={`/admin/registrations/course/${registration.id}/letter?kind=later`} variant="secondary">
                {t('Späteren Kurs anbieten', 'Offer a later course')}
              </ButtonLink>
            ) : null}
            {canBook && offer && registration.personId ? (
              <>
                {queues ? (
                  <FormDialog icon={Icon.clock} tint="sun" trigger={t('Auf die Warteliste', 'Waiting list')} title={t(`${fullName} auf die Warteliste`, `${fullName} on the waiting list`)}>
                    <WaitlistForm
                      personId={registration.personId}
                      courseInstanceId={registration.courseInstanceId!}
                      levels={levels}
                      places={groups}
                      registrationId={registration.id}
                      defaultLevel={registration.declaredLevelCode}
                      returnTo={`/admin/registrations/course/${registration.id}`}
                    />
                  </FormDialog>
                ) : null}
                <FormDialog icon={Icon.bookings} tint="red" trigger={t('Buchung anlegen', 'Create booking')} title={t(`${fullName} buchen`, `Book ${fullName}`)} triggerVariant="primary" width="lg">
                  <BookingWizard
                    personId={registration.personId}
                    personName={fullName}
                    offer={offer}
                    preselectedCohortId={registration.courseInstanceId}
                    // What they asked for, carried into the booking: the level and how much of it, and the stay.
                    preselectedLevelCode={registration.declaredLevelCode}
                    preselectedLevelScope={registration.declaredLevelCode ? (wholeLevel ? 'whole' : 'half') : null}
                    preselectedAccommodation={
                      registration.accommodationRequired && registration.accommodationType
                        ? (REGISTRATION_ACCOMMODATION[registration.accommodationType] ?? null)
                        : null
                    }
                    sourceRegistrationId={registration.id}
                    returnTo={`/admin/registrations/course/${registration.id}`}
                    action={createBookingFromWizardAction}
                    waitlistAction={waitlistFromWizardAction}
                  />
                </FormDialog>
              </>
            ) : null}
          </>
        }
        bar={
          <>
            <StatusBar entity="course_registration" id={registration.id} status={registration.status} canEdit={canEdit} />
            <OwnerControl entity="course_registration" id={registration.id} assignedTo={registration.assignedTo} staff={staff} me={user} canEdit={canEdit} />
          </>
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

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

          <Card
            title={t('Angaben zur Person', 'Applicant')}
            icon={Icon.person}
            tint="ink"
            description={
              registration.editedAt
                ? t(
                    `Bearbeitet von ${registration.editedByName ?? 'einem Teammitglied'} am ${new Date(registration.editedAt).toLocaleDateString('de-DE')}`,
                    `Edited by ${registration.editedByName ?? 'a colleague'} on ${new Date(registration.editedAt).toLocaleDateString('en-GB')}`
                  )
                : undefined
            }
            actions={
              canEdit ? (
                /* „Daten bearbeiten" (0076): complete or correct what was sent; the visitor's values stay below. */
                <FormDialog
                  trigger={t('Bearbeiten', 'Edit')}
                  title={t('Angaben bearbeiten', 'Edit the details')}
                  description={t('Was die Person geschickt hat, bleibt sichtbar.', 'What the person sent stays visible.')}
                  icon={Icon.person}
                  tint="ink"
                  size="sm"
                  triggerVariant="ghost"
                >
                  <form action={editRegistrationAction} className="space-y-3">
                    <input type="hidden" name="id" value={registration.id} />
                    <div className="grid gap-3 sm:grid-cols-[9rem_1fr_1fr]">
                      <Field label={t('Anrede', 'Salutation')} htmlFor="edit-salutation">
                        <Select id="edit-salutation" name="salutation" defaultValue={registration.salutation}>
                          {Object.entries(SALUTATIONS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {pick(lang, label)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={t('Vorname', 'First name')} htmlFor="edit-first">
                        <Input id="edit-first" name="firstName" required maxLength={200} defaultValue={registration.firstName} />
                      </Field>
                      <Field label={t('Nachname', 'Last name')} htmlFor="edit-last">
                        <Input id="edit-last" name="lastName" required maxLength={200} defaultValue={registration.lastName} />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={t('E-Mail', 'Email')} htmlFor="edit-email">
                        <Input id="edit-email" name="email" type="email" required maxLength={200} defaultValue={registration.email} />
                      </Field>
                      <Field label={t('Telefon', 'Phone')} htmlFor="edit-phone">
                        <Input id="edit-phone" name="phone" maxLength={40} defaultValue={registration.phone} />
                      </Field>
                      <Field label={t('Nationalität', 'Nationality')} htmlFor="edit-nationality">
                        <Input id="edit-nationality" name="nationality" maxLength={80} defaultValue={registration.nationalityRaw} />
                      </Field>
                      <Field label={t('Geburtsdatum', 'Date of birth')} htmlFor="edit-birth">
                        <DateFormField id="edit-birth" name="birthDate" defaultValue={toDateInputValue(registration.birthDate)} />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="visaRequired" defaultChecked={registration.visaRequired} className="size-4" />
                        {t('Visumshilfe nötig', 'Needs visa support')}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="accommodationRequired" defaultChecked={registration.accommodationRequired} className="size-4" />
                        {t('Unterkunft nötig', 'Needs accommodation')}
                      </label>
                    </div>
                    <Field label={t('Unterkunft', 'Accommodation')} htmlFor="edit-accommodation">
                      <Select id="edit-accommodation" name="accommodationType" defaultValue={registration.accommodationType ?? ''}>
                        <option value="">{t('Keine Angabe', 'Not given')}</option>
                        {Object.entries(ACCOMMODATION).map(([value, label]) => (
                          <option key={value} value={value}>
                            {pick(lang, label)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={t('Allergien', 'Allergies')} htmlFor="edit-allergies">
                      <Input id="edit-allergies" name="allergies" maxLength={500} defaultValue={registration.allergies ?? ''} />
                    </Field>
                    <Field label={t('Anmerkungen', 'Notes')} htmlFor="edit-notes">
                      <Textarea id="edit-notes" name="notes" rows={3} maxLength={2000} defaultValue={registration.notes ?? ''} />
                    </Field>
                    <DialogFooter>
                      <Button type="submit" size="md">
                        {t('Speichern', 'Save')}
                      </Button>
                    </DialogFooter>
                  </form>
                </FormDialog>
              ) : undefined
            }
          >
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

          {registration.original ? <OriginalValues original={registration.original} current={currentValues} lang={lang} /> : null}
        </div>

        <div className="space-y-4">
          <PersonPanel person={person} candidates={candidates} flags={flags} returnTo={`/admin/registrations/course/${registration.id}`} canList={canAccess(user, 'people', 'edit')} />
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
              <LetterList
                variant="side"
                title={t('Briefe', 'Letters')}
                rows={letters.map((l) => ({
                  id: l.id,
                  kind: l.kind,
                  kindLabel: pick(lang, LETTER_KIND_LABELS[l.kind]),
                  subject: l.subject,
                  by: l.sentByName,
                  sentAt: new Date(l.sentAt).toISOString(),
                }))}
              />
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

const ORIGINAL_LABELS: Record<string, Bilingual> = {
  salutation: { de: 'Anrede', en: 'Salutation' },
  first_name: { de: 'Vorname', en: 'First name' },
  last_name: { de: 'Nachname', en: 'Last name' },
  email: { de: 'E-Mail', en: 'Email' },
  phone: { de: 'Telefon', en: 'Phone' },
  nationality: { de: 'Nationalität', en: 'Nationality' },
  birth_date: { de: 'Geburtsdatum', en: 'Date of birth' },
  visa_required: { de: 'Visumshilfe', en: 'Visa support' },
  accommodation_required: { de: 'Unterkunft nötig', en: 'Needs accommodation' },
  accommodation_type: { de: 'Unterkunft', en: 'Accommodation' },
  allergies: { de: 'Allergien', en: 'Allergies' },
  notes: { de: 'Anmerkungen', en: 'Notes' },
};

/** What the visitor sent, where a colleague changed it (0076): only the values that differ. */
function OriginalValues({ original, current, lang }: { original: Record<string, unknown>; current: Record<string, unknown>; lang: 'de' | 'en' }) {
  const shown = (value: unknown) =>
    value === true ? (lang === 'de' ? 'Ja' : 'Yes') : value === false ? (lang === 'de' ? 'Nein' : 'No') : value === null || value === undefined || value === '' ? '–' : String(value);
  const changed = Object.keys(ORIGINAL_LABELS).filter((key) => shown(original[key]) !== shown(current[key]));
  if (changed.length === 0) return null;
  return (
    <Card title={lang === 'de' ? 'Ursprünglich geschickt' : 'As sent'} icon={Icon.note} tint="sun">
      <DetailList items={changed.map((key) => ({ label: pick(lang, ORIGINAL_LABELS[key]), value: shown(original[key]) }))} />
    </Card>
  );
}
