import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createBookingFromWizardAction, waitlistFromWizardAction } from '../../bookings/actions';
import { BookingWizard } from '../../bookings/booking-wizard';
import { WaitlistForm } from '../../catalogue/waitlist-forms';
import { bookRegistrationAction, editRegistrationAction, resolveRegistrationDeliveryAction, setLineDeclinedAction } from '../actions';
import { courseNameResolver } from '../course-names';
import { formatDay, formatRange, parseOptionLabel, type ParsedOption } from '../option-label';
import { examLevel, levelWord, registrationChecks, registrationTitle, type RegistrationCheck } from '../summary';
import { DateFormField } from '@/components/admin/date-picker';
import { DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { LetterList } from '@/components/admin/letters/letter-list';
import { PersonPanel } from '@/components/admin/person-panel';
import { FactGrid, MetaItem, MetaLine, OwnerControl, StatusBar, SubmissionCard, Timeline } from '@/components/admin/record-parts';
import { RowActions, type RowAction } from '@/components/admin/row-actions';
import { Badge, BirthDate, Button, ButtonLink, Card, DetailList, Field, Input, RecordHeader, Select, Textarea } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingOffer, stayVocabulary } from '@/lib/admin/booking-offer';
import { levelFree, levelPlaces } from '@/lib/admin/booking-offer-types';
import { REGISTRATION_ACCOMMODATION, wishesWholeLevel } from '@/lib/admin/booking-levels';
import { BOOKING_STATUS_LABELS, PAYER_LABELS } from '@/lib/admin/bookings';
import { isExamParts } from '@/lib/admin/exam-parts';
import { FLAG_LABELS, listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForRegistration } from '@/lib/admin/letters/repo';
import { mailHref } from '@/lib/admin/mail/href';
import { listNotes } from '@/lib/admin/notes';
import { learnerHistory } from '@/lib/admin/offers/course-catalogue';
import { findDuplicateCandidates, getPersonSummary, latestConfirmedLevel } from '@/lib/admin/people';
import { getRegistration, registrationTypeLabel, type LineOutcome, type RegistrationCourseLine, type RegistrationExamLine } from '@/lib/admin/registrations';
import { inTheirLanguage } from '@/lib/admin/reply';
import { listAssignableStaff } from '@/lib/admin/staff';
import { startLevelPlaces } from '@/lib/admin/waitlist';
import { toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

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

/** A line as the page shows it: a course or the exam, at its place in time. */
type Line = (RegistrationCourseLine | RegistrationExamLine) & {
  name: string;
  /** The level as the learner chose it („A1 komplett · 8 Wochen"), or the exam's parts. */
  detail: string | null;
  option: ParsedOption | null;
  /** A course's free places at its level in its start; null where there is no start or no level. */
  free: number | null;
};

const isOpen = (outcome: LineOutcome) => outcome.kind !== 'booked' && outcome.kind !== 'declined';

/**
 * One Anmeldung (0097, Rahman 2026-10-27): what one person sent at once, worked as one. The head says who
 * and what — „Intensive German A1 → C1 + telc Deutsch B2" — and, in its bar, where it stands and who has
 * it. The registration as sent is the plan: each course and the exam at its dates, with what became of
 * it (booked, on a waiting list, a later course offered, declined) and what can be done with it. „Alle
 * buchen" books every open line at once, one booking per level; a line's own „Buchen" opens the wizard
 * for what the quick way does not ask (books, a stay of other dates). What the lines say together — an
 * exam before its course ends, a level with no date, a gap — is said once, above the person.
 */
export default async function RegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string; book?: string; queue?: string; decline?: string }>;
}) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireModule('registrations')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [registration, { t, lang }] = await Promise.all([getRegistration(id), getI18n()]);
  if (!registration) notFound();

  const here = `/admin/registrations/${registration.id}`;
  const canEdit = canAccess(user, 'registrations', 'edit');
  const personId = registration.personId;
  const canBook = canAccess(user, 'bookings', 'edit') && Boolean(personId);
  const courseName = await courseNameResolver();

  const placesByStart = new Map(
    await Promise.all(
      [...new Set(registration.courses.map((c) => c.courseInstanceId).filter((v): v is string => Boolean(v)))].map(async (start) => [start, await startLevelPlaces(start)] as const)
    )
  );
  const lines: Line[] = [
    ...registration.courses.map((c) => {
      const places = c.courseInstanceId ? placesByStart.get(c.courseInstanceId) : undefined;
      return {
        ...c,
        name: courseName(c.courseTypeLabel, c.courseTypeId) ?? t('Kurs', 'Course'),
        detail: c.declaredLevelRaw?.trim() || c.declaredLevelCode,
        option: parseOptionLabel(c.courseInstanceLabel),
        free: places && c.declaredLevelCode ? levelFree(levelPlaces({ levels: places }, c.declaredLevelCode), personId ?? undefined) : null,
      };
    }),
    ...registration.exams.map((e) => ({
      ...e,
      name: e.examTypeLabel ?? t('Prüfung', 'Exam'),
      detail: registrationTypeLabel(e.registrationType, lang),
      option: parseOptionLabel(e.examSessionLabel),
      free: null,
    })),
  ].sort((a, b) => (a.option?.start?.getTime() ?? Infinity) - (b.option?.start?.getTime() ?? Infinity));

  const open = lines.filter((l) => isOpen(l.outcome));
  const bookable = open.filter((l) => (l.kind === 'course' ? Boolean(l.courseInstanceId) && l.free !== 0 : Boolean(l.examSessionId)));
  const booked = lines.filter((l) => l.outcome.kind === 'booked' && !l.outcome.cancelled).map((l) => (l.outcome as { bookingId: string }).bookingId);
  const checks = registrationChecks(
    lines.map((l) => ({
      id: l.id,
      kind: l.kind,
      level: l.kind === 'course' ? levelWord(l.detail) : examLevel(l.name),
      start: l.option?.start ?? null,
      end: l.option?.end ?? l.option?.start ?? null,
      toBeArranged: l.kind === 'course' && (l.option?.toBeArranged ?? !l.courseInstanceId),
      settled: !isOpen(l.outcome),
    }))
  );

  const lineIds = [...registration.courses.map((c) => ['course_registration', c.id] as const), ...registration.exams.map((e) => ['exam_registration', e.id] as const)];
  const [notes, activity, staff, flags, person, letters, offer, vocabulary, history] = await Promise.all([
    Promise.all([listNotes('registration', registration.id), ...lineIds.map(([entity, lineId]) => listNotes(entity, lineId))]).then((all) => all.flat()),
    Promise.all([activityFor('registration', registration.id), ...lineIds.map(([entity, lineId]) => activityFor(entity, lineId))]).then((all) => all.flat()),
    listAssignableStaff(),
    Promise.all(lineIds.map(([entity, lineId]) => listFlags(entity, lineId))).then((all) => all.flat()),
    personId ? getPersonSummary(personId) : null,
    Promise.all(registration.courses.map((c) => lettersForRegistration(c.id))).then((all) => all.flat().sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt))),
    canBook && (query.book || query.queue) ? bookingOffer() : null,
    canBook && registration.stay?.accommodationRequired && bookable.length ? stayVocabulary() : null,
    canBook && personId && bookable.length ? learnerHistory(personId).catch(() => null) : null,
  ]);
  const [candidates, confirmed] = person
    ? await Promise.all([
        findDuplicateCandidates({
          email: registration.contact.email,
          lastName: registration.contact.lastName,
          birthDate: toDateInputValue(registration.contact.birthDate) || null,
          excludePersonId: person.id,
        }),
        latestConfirmedLevel(person.canonicalId),
      ])
    : [[], null];

  const { contact, stay } = registration;
  const deliveryFlags = flags.filter((flag) => !flag.resolvedAt && (flag.code === 'registration_staff_notice_unconfirmed' || flag.code === 'registration_receipt_unconfirmed'));
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const title = registrationTitle(lines.map((l) => ({ kind: l.kind, name: l.name, level: l.kind === 'course' ? l.detail : null }))) || t('Anmeldung', 'Registration');
  const reply = mailHref('registration', registration.id, { subject: inTheirLanguage(registration.locale, `Deine Anmeldung: ${title}`, `Your registration: ${title}`) });
  const firstCourse = registration.courses.find((c) => c.courseInstanceId && isOpen(c.outcome)) ?? registration.courses[0];
  const dated = lines.filter((l) => l.kind === 'course' && l.option?.start);
  const stayFrom = dated[0]?.option?.start ?? null;
  const stayTo = dated.reduce<Date | null>((end, l) => (l.option?.end && (!end || l.option.end > end) ? l.option.end : end), null);

  // The line whose wizard, queue or confirmation the address asks for.
  const bookingLine = canBook && offer ? lines.find((l) => l.id === query.book && isOpen(l.outcome)) : undefined;
  const queueLine = canBook && offer ? lines.find((l): l is Line & RegistrationCourseLine => l.id === query.queue && l.kind === 'course' && Boolean(l.courseInstanceId)) : undefined;
  const queueLevels = queueLine ? (offer?.levels.map((l) => l.code) ?? []) : [];

  // The values a colleague may correct, as they stand: compared with what was sent (`original`).
  const currentValues: Record<string, unknown> = {
    salutation: contact.salutation,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    nationality: contact.nationalityRaw,
    birth_date: contact.birthDateRaw,
    visa_required: stay?.visaRequired,
    accommodation_required: stay?.accommodationRequired,
    accommodation_type: stay?.accommodationType,
    allergies: stay?.allergies,
    notes: stay?.notes,
  };

  return (
    <>
      <RecordHeader
        backHref="/admin/registrations"
        backLabel={t('Anmeldungen', 'Registrations')}
        title={fullName}
        avatar={fullName}
        subtitle={
          <>
            <span className="block text-[0.98rem] font-semibold text-[#2b3546]">{title}</span>
            <MetaLine>
              <MetaItem icon={Icon.mail}>
                <Link href={reply} className="hover:text-[var(--casa-ink)] hover:underline">
                  {contact.email}
                </Link>
              </MetaItem>
              <MetaItem icon={Icon.phone}>
                <a href={`tel:${contact.phone}`} className="hover:text-[var(--casa-ink)] hover:underline">
                  {contact.phone}
                </a>
              </MetaItem>
              <MetaItem icon={Icon.globe}>{registration.locale === 'de' ? t('auf Deutsch', 'in German') : t('auf Englisch', 'in English')}</MetaItem>
            </MetaLine>
          </>
        }
        actions={
          canBook && bookable.length ? (
            <FormDialog
              icon={Icon.bookings}
              tint="red"
              trigger={
                bookable.length === lines.length
                  ? t('Alle buchen', 'Book all')
                  : bookable.length === 1
                    ? t('1 Position buchen', 'Book 1 line')
                    : t(`${bookable.length} Positionen buchen`, `Book ${bookable.length} lines`)
              }
              title={t(`${fullName} buchen`, `Book ${fullName}`)}
              triggerVariant="primary"
              width="lg"
            >
              <form action={bookRegistrationAction} className="space-y-4">
                <input type="hidden" name="id" value={registration.id} />
                <fieldset className="space-y-1.5">
                  <legend className="mb-1.5 text-[0.78rem] font-semibold text-[var(--casa-muted)]">{t('Je Position eine Buchung', 'One booking per line')}</legend>
                  {bookable.map((line) => (
                    <label key={line.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-ws-line ring-inset has-[:checked]:bg-[#f7f9fc]">
                      <input type="checkbox" name="lineIds" value={line.id} defaultChecked className="mt-0.5 size-4 accent-[var(--casa-accent-surface)]" />
                      <span className="min-w-0 text-[0.86rem]">
                        <span className="font-semibold text-[var(--casa-ink)]">{lineName(line)}</span>
                        <span className="block text-[0.78rem] text-[var(--casa-muted)]">{lineWhen(line, t, lang)}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('Status', 'Status')} htmlFor="book-status">
                    <Select id="book-status" name="status" defaultValue="reserved">
                      <option value="reserved">{pick(lang, BOOKING_STATUS_LABELS.reserved)}</option>
                      <option value="confirmed">{pick(lang, BOOKING_STATUS_LABELS.confirmed)}</option>
                    </Select>
                  </Field>
                  <Field label={t('Wer zahlt', 'Who pays')} htmlFor="book-payer">
                    <Select id="book-payer" name="payer" defaultValue="self">
                      {(['self', 'agency', 'company', 'other'] as const).map((payer) => (
                        <option key={payer} value={payer}>
                          {pick(lang, PAYER_LABELS[payer])}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label={t('Name der Zahlenden', 'Payer name')} htmlFor="book-payer-name">
                  <Input id="book-payer-name" name="payerName" maxLength={120} />
                </Field>
                {vocabulary && stay?.accommodationRequired ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={t('Unterkunft', 'Accommodation')} htmlFor="book-stay">
                      <Select id="book-stay" name="accommodationTypeCode" defaultValue={REGISTRATION_ACCOMMODATION[stay.accommodationType ?? ''] ?? ''}>
                        <option value="">{t('Keine', 'None')}</option>
                        {vocabulary.types
                          .filter((type) => type.bookable)
                          .map((type) => (
                            <option key={type.code} value={type.code}>
                              {pick(lang, type.name)}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Field label={t('Zimmer', 'Room')} htmlFor="book-room">
                      <Select id="book-room" name="roomTypeCode" defaultValue="">
                        <option value="">—</option>
                        {vocabulary.rooms.map((room) => (
                          <option key={room.code} value={room.code}>
                            {pick(lang, room.name)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={t('Verpflegung', 'Meals')} htmlFor="book-catering">
                      <Select id="book-catering" name="cateringCode" defaultValue="">
                        <option value="">—</option>
                        {vocabulary.catering.map((meal) => (
                          <option key={meal.code} value={meal.code}>
                            {pick(lang, meal.name)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ) : null}
                {bookable.some((l) => l.kind === 'course') ? (
                  <label className="flex items-center gap-2.5 text-sm">
                    <input type="checkbox" name="includeEnrolmentFee" value="1" defaultChecked={!history?.studiedBefore} className="size-4 accent-[var(--casa-accent-surface)]" />
                    {t('Einschreibegebühr berechnen', 'Charge the enrolment fee')}
                  </label>
                ) : null}
                <DialogFooter>
                  <Button type="submit" size="md">
                    {t('Buchen', 'Book')}
                  </Button>
                </DialogFooter>
              </form>
            </FormDialog>
          ) : null
        }
        bar={
          <>
            <StatusBar entity="registration" id={registration.id} status={registration.status} canEdit={canEdit} />
            <OwnerControl entity="registration" id={registration.id} assignedTo={registration.assignedTo} staff={staff} me={user} canEdit={canEdit} />
          </>
        }
      />

      {query.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {query.error}
        </p>
      ) : query.notice ? (
        <p role="status" className="mb-4 rounded-lg border border-[#c8e6d3] bg-[#f0f9f3] px-4 py-3 text-sm text-[#17693a]">
          {query.notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <SubmissionCard
            name={fullName}
            email={contact.email}
            at={registration.submittedAt}
            via={t('über das Anmeldeformular', 'from the registration form')}
            title={title}
            reply={{ href: reply, locale: registration.locale, primary: !canBook }}
          >
            <ol className="divide-y divide-ws-line-soft rounded-2xl ring-1 ring-ws-line ring-inset">
              {lines.map((line) => (
                <li key={line.id} id={`line-${line.id}`} className="scroll-mt-24 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">
                    <p className="w-full shrink-0 text-[0.8rem] text-[var(--casa-muted)] tabular-nums sm:w-40">{lineWhen(line, t, lang)}</p>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[0.92rem] font-semibold text-[var(--casa-ink)]', line.outcome.kind === 'declined' && 'text-[var(--casa-muted)] line-through')}>
                        {line.name}
                        {line.detail ? <span className="font-normal text-[#2b3546]"> · {line.detail}</span> : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.76rem] text-[var(--casa-muted)]">
                        {lineFacts(line, t)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Outcome outcome={line.outcome} t={t} />
                      {canBook && isOpen(line.outcome) ? (
                        bookingLine?.id === line.id && offer && personId ? (
                          <FormDialog defaultOpen icon={Icon.bookings} tint="red" trigger={t('Buchen', 'Book')} title={t(`${fullName} buchen`, `Book ${fullName}`)} size="sm" width="lg">
                            {line.kind === 'course' ? (
                              <BookingWizard
                                personId={personId}
                                personName={fullName}
                                offer={offer}
                                preselectedCohortId={line.courseInstanceId}
                                preselectedLevelCode={line.declaredLevelCode}
                                preselectedLevelScope={line.declaredLevelCode ? (wishesWholeLevel(line.declaredLevelRaw) ? 'whole' : 'half') : null}
                                preselectedAccommodation={stay?.accommodationRequired && stay.accommodationType ? (REGISTRATION_ACCOMMODATION[stay.accommodationType] ?? null) : null}
                                sourceRegistrationId={line.id}
                                returnTo={here}
                                action={createBookingFromWizardAction}
                                waitlistAction={waitlistFromWizardAction}
                              />
                            ) : (
                              <BookingWizard
                                personId={personId}
                                personName={fullName}
                                offer={offer}
                                preselectedExam={
                                  line.examTypeId
                                    ? { examTypeId: line.examTypeId, sittingId: line.examSessionId, parts: isExamParts(line.registrationType) ? line.registrationType : 'full' }
                                    : null
                                }
                                sourceExamRegistrationId={line.id}
                                returnTo={here}
                                action={createBookingFromWizardAction}
                                waitlistAction={waitlistFromWizardAction}
                              />
                            )}
                          </FormDialog>
                        ) : (
                          <ButtonLink href={`${here}?book=${line.id}#line-${line.id}`} size="sm">
                            {t('Buchen', 'Book')}
                          </ButtonLink>
                        )
                      ) : null}
                      {canEdit && line.outcome.kind === 'declined' ? (
                        <form action={setLineDeclinedAction}>
                          <input type="hidden" name="id" value={registration.id} />
                          <input type="hidden" name="lineId" value={line.id} />
                          <input type="hidden" name="kind" value={line.kind} />
                          <Button type="submit" variant="ghost" size="sm">
                            {t('Wieder öffnen', 'Reopen')}
                          </Button>
                        </form>
                      ) : null}
                      <RowActions label={t('Weitere Aktionen', 'More actions')} actions={lineActions(line, { here, canBook, canEdit, t })} />
                    </div>
                  </div>
                  {queueLine?.id === line.id && personId ? (
                    <div className="mt-3">
                      <FormDialog defaultOpen icon={Icon.clock} tint="sun" trigger={t('Warteliste', 'Waiting list')} title={t(`${fullName} auf die Warteliste`, `${fullName} on the waiting list`)} size="sm">
                        <WaitlistForm
                          personId={personId}
                          courseInstanceId={queueLine.courseInstanceId!}
                          levels={queueLevels}
                          places={placesByStart.get(queueLine.courseInstanceId!) ?? {}}
                          registrationId={queueLine.id}
                          defaultLevel={queueLine.declaredLevelCode}
                          returnTo={here}
                        />
                      </FormDialog>
                    </div>
                  ) : null}
                  {canEdit && query.decline === line.id && isOpen(line.outcome) ? (
                    <form action={setLineDeclinedAction} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#fdecec]/60 px-3.5 py-2.5 ring-1 ring-[#f5cfcd] ring-inset">
                      <input type="hidden" name="id" value={registration.id} />
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="kind" value={line.kind} />
                      <input type="hidden" name="declined" value="1" />
                      <input type="hidden" name="confirmed" value="1" />
                      <span className="text-[0.84rem] font-semibold text-[var(--casa-ink)]">{t(`${lineName(line)} absagen?`, `Decline ${lineName(line)}?`)}</span>
                      <span className="ml-auto flex gap-2">
                        <ButtonLink href={`${here}#line-${line.id}`} variant="ghost" size="sm">
                          {t('Abbrechen', 'Cancel')}
                        </ButtonLink>
                        <Button type="submit" variant="danger" size="sm">
                          {t('Absagen', 'Decline')}
                        </Button>
                      </span>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>

            {stay ? (
              <div className="mt-4">
                <FactGrid
                  facts={[
                    {
                      label: t('Unterkunft', 'Accommodation'),
                      value: stay.accommodationRequired
                        ? stay.accommodationType && ACCOMMODATION[stay.accommodationType]
                          ? pick(lang, ACCOMMODATION[stay.accommodationType])
                          : t('Nötig', 'Needed')
                        : t('Nicht nötig', 'Not needed'),
                      sub: stay.accommodationRequired && stayFrom ? formatRange(stayFrom, stayTo, lang) : undefined,
                      tone: stay.accommodationRequired ? 'attention' : 'plain',
                    },
                    {
                      label: t('Visumshilfe', 'Visa support'),
                      value: stay.visaRequired ? t('Nötig', 'Needed') : t('Nicht nötig', 'Not needed'),
                      tone: stay.visaRequired ? 'attention' : 'plain',
                    },
                    ...(confirmed
                      ? [
                          {
                            label: t('Einstufung', 'Placement'),
                            value: confirmed.level,
                            sub: confirmed.reviewerName ?? t('ehemaliges Teammitglied', 'a former colleague'),
                            tone: 'good' as const,
                          },
                        ]
                      : []),
                    ...(stay.allergies ? [{ label: t('Allergien', 'Allergies'), value: stay.allergies, tone: 'attention' as const }] : []),
                  ]}
                />
              </div>
            ) : null}
            {stay?.notes ? (
              <figure className="mt-4">
                <figcaption className="mb-1.5 text-[0.74rem] font-semibold text-[var(--casa-muted)]">{t('Eigene Anmerkungen', 'Their notes')}</figcaption>
                <blockquote className="max-w-prose border-l-2 border-[#d3dbe6] pl-3.5 text-[0.95rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{stay.notes}</blockquote>
              </figure>
            ) : null}
          </SubmissionCard>

          {deliveryFlags.length ? (
            <Card title={t('E-Mail-Versand prüfen', 'Check email delivery')} icon={Icon.attention} tint="sun">
              <p className="mb-3 text-sm">{t('Der Versand wurde nicht bestätigt. Prüfe die Anmeldung und kontaktiere die Person bei Bedarf. Markiere den Hinweis erst nach der Prüfung als erledigt.', 'Delivery was not confirmed. Review the registration and contact the applicant if needed. Mark each item done after checking it.')}</p>
              <ul className="space-y-2">
                {deliveryFlags.map((flag) => (
                  <li key={flag.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{pick(lang, FLAG_LABELS[flag.code])}</span>
                    {canEdit ? <form action={resolveRegistrationDeliveryAction}>
                      <input type="hidden" name="id" value={registration.id} />
                      <input type="hidden" name="flagId" value={flag.id} />
                      <Button type="submit" variant="ghost" size="sm">{t('Geprüft', 'Checked')}</Button>
                    </form> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {checks.length ? (
            <Card title={t('Hinweise', 'Worth a look')} icon={Icon.attention} tint="sun">
              <ul className="space-y-2 text-[0.88rem] text-[var(--casa-ink)]">
                {checks.map((check) => (
                  <li key={checkKey(check)} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#c98a00]" />
                    {checkText(check, lines, t, lang)}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

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
                        <Select id="edit-salutation" name="salutation" defaultValue={contact.salutation}>
                          {Object.entries(SALUTATIONS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {pick(lang, label)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label={t('Vorname', 'First name')} htmlFor="edit-first">
                        <Input id="edit-first" name="firstName" required maxLength={200} defaultValue={contact.firstName} />
                      </Field>
                      <Field label={t('Nachname', 'Last name')} htmlFor="edit-last">
                        <Input id="edit-last" name="lastName" required maxLength={200} defaultValue={contact.lastName} />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={t('E-Mail', 'Email')} htmlFor="edit-email">
                        <Input id="edit-email" name="email" type="email" required maxLength={200} defaultValue={contact.email} />
                      </Field>
                      <Field label={t('Telefon', 'Phone')} htmlFor="edit-phone">
                        <Input id="edit-phone" name="phone" maxLength={40} defaultValue={contact.phone} />
                      </Field>
                      <Field label={t('Nationalität', 'Nationality')} htmlFor="edit-nationality">
                        <Input id="edit-nationality" name="nationality" maxLength={80} defaultValue={contact.nationalityRaw} />
                      </Field>
                      <Field label={t('Geburtsdatum', 'Date of birth')} htmlFor="edit-birth">
                        <DateFormField id="edit-birth" name="birthDate" defaultValue={toDateInputValue(contact.birthDate)} />
                      </Field>
                    </div>
                    {stay ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="visaRequired" defaultChecked={stay.visaRequired} className="size-4" />
                            {t('Visumshilfe nötig', 'Needs visa support')}
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="accommodationRequired" defaultChecked={stay.accommodationRequired} className="size-4" />
                            {t('Unterkunft nötig', 'Needs accommodation')}
                          </label>
                        </div>
                        <Field label={t('Unterkunft', 'Accommodation')} htmlFor="edit-accommodation">
                          <Select id="edit-accommodation" name="accommodationType" defaultValue={stay.accommodationType ?? ''}>
                            <option value="">{t('Keine Angabe', 'Not given')}</option>
                            {Object.entries(ACCOMMODATION).map(([value, label]) => (
                              <option key={value} value={value}>
                                {pick(lang, label)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label={t('Allergien', 'Allergies')} htmlFor="edit-allergies">
                          <Input id="edit-allergies" name="allergies" maxLength={500} defaultValue={stay.allergies ?? ''} />
                        </Field>
                        <Field label={t('Anmerkungen', 'Notes')} htmlFor="edit-notes">
                          <Textarea id="edit-notes" name="notes" rows={3} maxLength={2000} defaultValue={stay.notes ?? ''} />
                        </Field>
                      </>
                    ) : null}
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
                  value: `${SALUTATIONS[contact.salutation] ? pick(lang, SALUTATIONS[contact.salutation]) : contact.salutation} ${fullName}`,
                },
                {
                  label: t('Nationalität', 'Nationality'),
                  value: contact.nationalityName ?? (
                    <span className="flex items-center gap-2">
                      {contact.nationalityRaw}
                      <Badge tone="warning">{t('nicht erkannt', 'unrecognised')}</Badge>
                    </span>
                  ),
                },
                { label: t('Geburtsdatum', 'Date of birth'), value: <BirthDate value={contact.birthDate ?? contact.birthDateRaw} /> },
              ]}
            />
          </Card>

          {registration.original ? <OriginalValues original={registration.original} current={currentValues} lang={lang} /> : null}
        </div>

        <div className="space-y-4">
          <PersonPanel person={person} candidates={candidates} flags={flags.filter((flag) => flag.code !== 'registration_staff_notice_unconfirmed' && flag.code !== 'registration_receipt_unconfirmed')} returnTo={here} canList={canAccess(user, 'people', 'edit')} />
          {/* Before there is a booking: the down payment or the placement test (docs/LETTERS.md); after it, one confirmation of every booking. */}
          <Card
            title={t('Briefe', 'Letters')}
            icon={Icon.mail}
            tint="blue"
            actions={
              booked.length && personId && canAccess(user, 'bookings', 'edit') ? (
                <Link
                  href={`/admin/people/${personId}/letter?bookings=${booked.join(',')}`}
                  className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                >
                  {t('Bestätigung schreiben', 'Write the confirmation')}
                </Link>
              ) : canEdit && firstCourse ? (
                <Link href={`/admin/registrations/course/${firstCourse.id}/letter`} className="text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]">
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
            entity="registration"
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

/** „Intensive German A1", „telc Deutsch B2". */
const lineName = (line: Line) => [line.name, line.kind === 'course' ? levelWord(line.detail) : null].filter(Boolean).join(' ');

/** When a line runs: „4. Jan. – 26. Feb. 2027", an exam's day, or „Termin offen". */
function lineWhen(line: Line, t: T, lang: WsLang): string {
  const option = line.option;
  if (!option || option.toBeArranged || (line.kind === 'course' && !line.courseInstanceId && !option.start)) return t('Termin offen', 'No date yet');
  if (!option.start) return option.raw;
  return line.kind === 'exam' ? formatDay(option.start, lang, true) : formatRange(option.start, option.end, lang);
}

/** Under a line's name: free places at its level, a sitting's time and place, a name not yet confirmed for the certificate. */
function lineFacts(line: Line, t: T) {
  if (line.kind === 'exam') {
    return (
      <>
        {[line.option?.time, line.option?.location].filter(Boolean).join(' · ')}
        {!line.officialNameConfirmed && isOpen(line.outcome) ? <Badge tone="warning">{t('Name laut Ausweis nicht bestätigt', 'Name as on the ID not confirmed')}</Badge> : null}
      </>
    );
  }
  if (line.free === null || !isOpen(line.outcome)) return line.option?.location ?? null;
  return line.free === 0 ? (
    <Badge tone="warning">{t('Niveau voll', 'Level full')}</Badge>
  ) : (
    <span>{line.free === 1 ? t('1 Platz frei', '1 place free') : t(`${line.free} Plätze frei`, `${line.free} places free`)}</span>
  );
}

function Outcome({ outcome, t }: { outcome: LineOutcome; t: T }) {
  switch (outcome.kind) {
    case 'booked':
      return (
        <Link href={`/admin/bookings/${outcome.bookingId}`} className="hover:opacity-80">
          <Badge tone={outcome.cancelled ? 'quiet' : 'positive'}>
            {outcome.cancelled ? t('Storniert', 'Cancelled') : t('Gebucht', 'Booked')} · {outcome.number}
          </Badge>
        </Link>
      );
    case 'waiting':
      return <Badge tone="neutral">{outcome.offered ? t('Platz angeboten', 'Place offered') : t('Warteliste', 'Waiting list')}</Badge>;
    case 'later':
      return <Badge tone="neutral">{t('Späterer Kurs angeboten', 'Later course offered')}</Badge>;
    case 'declined':
      return <Badge tone="quiet">{t('Abgesagt', 'Declined')}</Badge>;
    default:
      return null;
  }
}

/** Behind „…" on a line: its queue, a later start by letter, declining it. */
function lineActions(line: Line, { here, canBook, canEdit, t }: { here: string; canBook: boolean; canEdit: boolean; t: T }): RowAction[] {
  if (!isOpen(line.outcome)) return [];
  const actions: RowAction[] = [];
  if (line.kind === 'course' && line.courseInstanceId && canBook && line.outcome.kind !== 'waiting') {
    actions.push({ label: t('Auf die Warteliste', 'Waiting list'), href: `${here}?queue=${line.id}#line-${line.id}`, icon: Icon.clock });
  }
  if (line.kind === 'course' && line.courseInstanceId && canEdit) {
    actions.push({ label: t('Späteren Kurs anbieten', 'Offer a later course'), href: `/admin/registrations/course/${line.id}/letter?kind=later`, icon: Icon.mail });
  }
  if (canEdit) actions.push({ label: t('Absagen', 'Decline'), href: `${here}?decline=${line.id}#line-${line.id}`, divide: actions.length > 0 });
  return actions;
}

const checkKey = (check: RegistrationCheck) =>
  check.kind === 'exam_before_course_end' ? `${check.kind}-${check.examId}` : check.kind === 'no_date' ? `${check.kind}-${check.courseId}` : `${check.kind}-${check.fromId}-${check.toId}`;

function checkText(check: RegistrationCheck, lines: readonly Line[], t: T, lang: WsLang): string {
  switch (check.kind) {
    case 'exam_before_course_end': {
      const exam = lines.find((l) => l.id === check.examId)?.name ?? check.level;
      const day = formatDay(check.examDay, lang, true);
      const end = formatDay(check.courseEnd, lang, true);
      return t(`${exam} am ${day} liegt vor dem Ende des ${check.level}-Kurses (${end}).`, `${exam} on ${day} is before the ${check.level} course ends (${end}).`);
    }
    case 'no_date':
      return check.level ? t(`${check.level} hat noch keinen Termin.`, `${check.level} has no date yet.`) : t('Ein Kurs hat noch keinen Termin.', 'A course has no date yet.');
    case 'gap':
      return t(`Zwischen ${check.fromLevel} und ${check.toLevel} liegen ${check.days} Tage ohne Kurs.`, `${check.days} days without a course between ${check.fromLevel} and ${check.toLevel}.`);
    case 'overlap':
      return t(`${check.fromLevel} und ${check.toLevel} überschneiden sich.`, `${check.fromLevel} and ${check.toLevel} overlap.`);
  }
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
function OriginalValues({ original, current, lang }: { original: Record<string, unknown>; current: Record<string, unknown>; lang: WsLang }) {
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
