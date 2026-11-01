import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createBookingFromWizardAction, waitlistFromWizardAction } from '../../bookings/actions';
import { BookingWizard } from '../../bookings/booking-wizard';
import { WaitlistForm } from '../../catalogue/waitlist-forms';
import { bookRegistrationAction, editRegistrationAction, setLineDeclinedAction, unlinkSchoolmanBookingAction } from '../actions';
import { courseNameResolver } from '../course-names';
import { formatDay, formatRange, parseOptionLabel, type ParsedOption } from '../option-label';
import { StayCard, VisaCard } from './needs';
import { RegistrationPersonCard } from './person-card';
import { examLevel, levelWord, registrationChecks, registrationTitle, type RegistrationCheck } from '../summary';
import { DateFormField } from '@/components/admin/date-picker';
import { DialogFooter, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { LetterList } from '@/components/admin/letters/letter-list';
import { FactGrid, MetaItem, MetaLine, OwnerControl, StatusBar, SubmissionCard, Timeline } from '@/components/admin/record-parts';
import { RowActions, type RowAction } from '@/components/admin/row-actions';
import { Badge, BirthDate, Button, ButtonLink, Card, DetailList, Field, Input, RecordHeader, Select, Textarea } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingOffer, stayVocabulary } from '@/lib/admin/booking-offer';
import { levelFree, levelPlaces } from '@/lib/admin/booking-offer-types';
import { REGISTRATION_ACCOMMODATION, stayFor, wishesWholeLevel } from '@/lib/admin/booking-levels';
import { BOOKING_STATUS_LABELS, PAYER_LABELS } from '@/lib/admin/bookings';
import { isExamParts } from '@/lib/admin/exam-parts';
import { listFlags } from '@/lib/admin/flags';
import { requireModule } from '@/lib/admin/guard';
import { pick, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { lettersForRegistration } from '@/lib/admin/letters/repo';
import { mailHref } from '@/lib/admin/mail/href';
import { listNotes } from '@/lib/admin/notes';
import { learnerHistory } from '@/lib/admin/offers/course-catalogue';
import { getPersonSummary, latestConfirmedLevel } from '@/lib/admin/people';
import { describePeople, personCandidates } from '@/lib/admin/person-match';
import { getRegistration, registrationTypeLabel, type LineOutcome, type RegistrationCourseLine, type RegistrationExamLine } from '@/lib/admin/registrations';
import { bookedStays, visaProgress } from '@/lib/admin/registration-needs';
import { registrationFacts } from '@/lib/admin/registration-person';
import { schoolmanCandidates } from '@/lib/admin/registration-schoolman';
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
  /** That course's places, booked and waiting, for the meter. */
  group: { places: number; booked: number; waiting: number; closed: boolean } | null;
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
  searchParams: Promise<{ error?: string; notice?: string; book?: string; queue?: string; decline?: string; unlink?: string; person?: string }>;
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
      const level = places && c.declaredLevelCode ? levelPlaces({ levels: places }, c.declaredLevelCode) : null;
      return {
        ...c,
        name: courseName(c.courseTypeLabel, c.courseTypeId) ?? t('Kurs', 'Course'),
        detail: c.declaredLevelRaw?.trim() || c.declaredLevelCode,
        option: parseOptionLabel(c.courseInstanceLabel),
        free: level ? levelFree(level, personId ?? undefined) : null,
        group: level ? { places: level.places, booked: level.booked + level.offered, waiting: level.queue.length, closed: Boolean(level.closed) } : null,
      };
    }),
    ...registration.exams.map((e) => ({
      ...e,
      name: e.examTypeLabel ?? t('Prüfung', 'Exam'),
      detail: registrationTypeLabel(e.registrationType, lang),
      option: parseOptionLabel(e.examSessionLabel),
      free: null,
      group: null,
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
  const [notes, activity, staff, flags, person, letters, offer, vocabulary, history, inSchoolman] = await Promise.all([
    Promise.all([listNotes('registration', registration.id), ...lineIds.map(([entity, lineId]) => listNotes(entity, lineId))]).then((all) => all.flat()),
    Promise.all([activityFor('registration', registration.id), ...lineIds.map(([entity, lineId]) => activityFor(entity, lineId))]).then((all) => all.flat()),
    listAssignableStaff(),
    Promise.all(lineIds.map(([entity, lineId]) => listFlags(entity, lineId))).then((all) => all.flat()),
    personId ? getPersonSummary(personId) : null,
    Promise.all(registration.courses.map((c) => lettersForRegistration(c.id))).then((all) => all.flat().sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt))),
    canBook && (query.book || query.queue) ? bookingOffer() : null,
    canBook && registration.stay?.accommodationRequired && bookable.length ? stayVocabulary() : null,
    canBook && personId && bookable.length ? learnerHistory(personId).catch(() => null) : null,
    // The SchoolMan bookings that may have been made from an open line (0113), while SchoolMan still books.
    open.length ? schoolmanCandidates(registration.id) : [],
  ]);
  // Who sent it (2026-10-31): the people at CASA it may be, found in the background, and the one it is once decided.
  const facts = registrationFacts(registration.contact);
  const [suggestions, linked, confirmed, stays, visa] = await Promise.all([
    personId ? personCandidates(facts, { excludeId: personId, include: inSchoolman.map((c) => c.personId) }) : [],
    person && person.canonicalId !== person.id ? describePeople([person.canonicalId], facts).then((found) => found[0] ?? null) : null,
    person ? latestConfirmedLevel(person.canonicalId) : null,
    // A room and a visa, each how far it has come: booked and placed; the letter for the embassy sent.
    registration.stay?.accommodationRequired ? bookedStays(booked) : [],
    registration.stay?.visaRequired ? visaProgress(booked) : null,
  ]);

  const { contact, stay } = registration;
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const title = registrationTitle(lines.map((l) => ({ kind: l.kind, name: l.name, level: l.kind === 'course' ? l.detail : null }))) || t('Anmeldung', 'Registration');
  const reply = mailHref('registration', registration.id, { subject: inTheirLanguage(registration.locale, `Deine Anmeldung: ${title}`, `Your registration: ${title}`) });
  const firstCourse = registration.courses.find((c) => c.courseInstanceId && isOpen(c.outcome)) ?? registration.courses[0];
  const dated = lines.filter((l) => l.kind === 'course' && l.option?.start);
  const stayFrom = dated[0]?.option?.start ?? null;
  const stayTo = dated.reduce<Date | null>((end, l) => (l.option?.end && (!end || l.option.end > end) ? l.option.end : end), null);
  // The stay around the courses asked for: the day before the first, the Saturday after the last.
  const stayDates = stayFor(toDateInputValue(stayFrom) || null, toDateInputValue(stayTo) || null);

  // Person first (2026-11-01, Rahman): nothing is booked or queued until the sender is decided — someone
  // already at CASA, or put on the register as new — so every booking lands on the one person's page.
  const personDecided = Boolean(person && (person.listed || person.canonicalId !== person.id));
  const bookNow = canBook && personDecided;
  const decideFirst = `${here}?person=1`;

  // The line whose wizard, queue or confirmation the address asks for.
  const bookingLine = bookNow && offer ? lines.find((l) => l.id === query.book && isOpen(l.outcome)) : undefined;
  const queueLine = bookNow && offer ? lines.find((l): l is Line & RegistrationCourseLine => l.id === query.queue && l.kind === 'course' && Boolean(l.courseInstanceId)) : undefined;
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
            {stay?.accommodationRequired || stay?.visaRequired ? (
              // What the stay asks besides the course, in its own colour, where the eye starts.
              <span className="mt-2 flex flex-wrap gap-1.5">
                {stay.accommodationRequired ? (
                  <a href="#unterkunft" className="hover:opacity-80">
                    <Badge tone="stay">
                      <span aria-hidden="true" className="[&_svg]:size-3.5">{Icon.home}</span>
                      {stay.accommodationType && ACCOMMODATION[stay.accommodationType] ? t(`Unterkunft · ${ACCOMMODATION[stay.accommodationType].de}`, `Accommodation · ${ACCOMMODATION[stay.accommodationType].en}`) : t('Unterkunft', 'Accommodation')}
                    </Badge>
                  </a>
                ) : null}
                {stay.visaRequired ? (
                  <a href="#visum" className="hover:opacity-80">
                    <Badge tone="visa">
                      <span aria-hidden="true" className="[&_svg]:size-3.5">{Icon.globe}</span>
                      {t('Visumshilfe', 'Visa support')}
                    </Badge>
                  </a>
                ) : null}
              </span>
            ) : null}
          </>
        }
        actions={
          bookNow && bookable.length ? (
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
          ) : canBook && bookable.length ? (
            <ButtonLink href={decideFirst} variant="primary">
              <span aria-hidden="true" className="[&_svg]:size-4">{Icon.person}</span>
              {t('Person klären', 'Confirm the person')}
            </ButtonLink>
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
                        {isOpen(line.outcome) && inSchoolman.some((c) => c.lineId === line.id) ? (
                          // A booking in SchoolMan that may be this line's: compared in the person panel.
                          <Link href={`${here}?person=1`} className="hover:opacity-80">
                            <Badge tone="accent">{t('In SchoolMan gebucht?', 'Booked in SchoolMan?')}</Badge>
                          </Link>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Outcome outcome={line.outcome} t={t} />
                      {canBook && isOpen(line.outcome) && !personDecided ? (
                        <span title={t('Erst die Person klären', 'Confirm the person first')}>
                          <ButtonLink href={decideFirst} size="sm" className="text-[var(--casa-text-subtle)]">
                            <span aria-hidden="true" className="[&_svg]:size-3.5">{Icon.lock}</span>
                            {t('Buchen', 'Book')}
                          </ButtonLink>
                        </span>
                      ) : canBook && isOpen(line.outcome) ? (
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
                      <RowActions label={t('Weitere Aktionen', 'More actions')} actions={lineActions(line, { here, canBook: bookNow, canEdit, t })} />
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
                  {canEdit && query.unlink === line.id && line.outcome.kind === 'booked' && line.outcome.schoolman ? (
                    <form action={unlinkSchoolmanBookingAction} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#fdecec]/60 px-3.5 py-2.5 ring-1 ring-[#f5cfcd] ring-inset">
                      <input type="hidden" name="id" value={registration.id} />
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="kind" value={line.kind} />
                      <input type="hidden" name="confirmed" value="1" />
                      <span className="text-[0.84rem] font-semibold text-[var(--casa-ink)]">
                        {t(`${lineName(line)} von ${line.outcome.number} lösen?`, `Unlink ${lineName(line)} from ${line.outcome.number}?`)}
                      </span>
                      <span className="ml-auto flex gap-2">
                        <ButtonLink href={`${here}#line-${line.id}`} variant="ghost" size="sm">
                          {t('Abbrechen', 'Cancel')}
                        </ButtonLink>
                        <Button type="submit" variant="danger" size="sm">
                          {t('Lösen', 'Unlink')}
                        </Button>
                      </span>
                    </form>
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

            {stay && (!stay.accommodationRequired || !stay.visaRequired || confirmed || stay.allergies) ? (
              <div className="mt-4">
                {/* What is needed has its own section below; here what is not, and the placement. */}
                <FactGrid
                  facts={[
                    ...(stay.accommodationRequired ? [] : [{ label: t('Unterkunft', 'Accommodation'), value: t('Nicht nötig', 'Not needed'), tone: 'plain' as const }]),
                    ...(stay.visaRequired ? [] : [{ label: t('Visumshilfe', 'Visa support'), value: t('Nicht nötig', 'Not needed'), tone: 'plain' as const }]),
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
                    ...(stay.allergies && !stay.accommodationRequired ? [{ label: t('Allergien', 'Allergies'), value: stay.allergies, tone: 'attention' as const }] : []),
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

          {stay?.accommodationRequired || stay?.visaRequired ? (
            <div className={cn('grid gap-4', stay.accommodationRequired && stay.visaRequired && 'xl:grid-cols-2')}>
              {stay.accommodationRequired ? (
                <div id="unterkunft" className="scroll-mt-24">
                  <StayCard
                    wish={stay.accommodationType && ACCOMMODATION[stay.accommodationType] ? ACCOMMODATION[stay.accommodationType] : null}
                    from={stayDates?.from ?? null}
                    to={stayDates?.to ?? null}
                    allergies={stay.allergies}
                    stays={stays}
                    canPlace={canAccess(user, 'accommodation', 'edit')}
                    t={t}
                    lang={lang}
                  />
                </div>
              ) : null}
              {stay.visaRequired ? (
                <div id="visum" className="scroll-mt-24">
                  <VisaCard
                    nationality={contact.nationalityName ?? (contact.nationalityRaw || null)}
                    steps={visaSteps({ letters, booked: lines.filter((l) => l.outcome.kind === 'booked' && !l.outcome.cancelled), embassyLetterAt: visa?.embassyLetterAt ?? null, t, lang })}
                    action={
                      booked.length && visa?.bookingId && !visa.embassyLetterAt && canAccess(user, 'bookings', 'edit')
                        ? { href: `/admin/bookings/${visa.bookingId}/letter?kind=visa`, label: t('Brief für die Botschaft schreiben', 'Write the embassy letter') }
                        : !booked.length && canEdit && firstCourse && !letters.some((l) => l.kind === 'registration_deposit_request')
                          ? { href: `/admin/registrations/course/${firstCourse.id}/letter`, label: t(`${LETTER_KIND_LABELS.registration_deposit_request.de} schreiben`, `Write the ${LETTER_KIND_LABELS.registration_deposit_request.en.toLowerCase()}`) }
                          : null
                    }
                    t={t}
                  />
                </div>
              ) : null}
            </div>
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
          <RegistrationPersonCard
            registrationId={registration.id}
            firstName={contact.firstName}
            sent={{ name: fullName, birthDate: toDateInputValue(contact.birthDate) || null, email: contact.email, phone: contact.phone, nationality: contact.nationalityName ?? (contact.nationalityRaw || null) }}
            person={person}
            suggestions={suggestions}
            linked={linked}
            schoolman={inSchoolman.map((c) => {
              const line = lines.find((l) => l.id === c.lineId);
              const from = c.from ? new Date(`${c.from}T00:00:00Z`) : null;
              return {
                personId: c.personId,
                bookingId: c.bookingId,
                number: c.bookingNumber,
                what: c.what,
                when: from ? (c.lineKind === 'exam' ? formatDay(from, lang, true) : formatRange(from, c.to ? new Date(`${c.to}T00:00:00Z`) : null, lang)) : null,
                line: line ? lineName(line) : t('eine Position', 'a line'),
                lineId: c.lineId,
                lineKind: c.lineKind,
                exact: c.exact,
                bookedAfter: c.bookedAfter,
              };
            })}
            flags={flags.filter((flag) => flag.code !== 'registration_staff_notice_unconfirmed' && flag.code !== 'registration_receipt_unconfirmed')}
            canEdit={canEdit}
            openPanel={query.person === '1'}
          />
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
  if (line.free === null || !line.group || !isOpen(line.outcome)) return line.option?.location ?? null;
  const { places, booked, waiting, closed } = line.group;
  // The level's course in that start, as the team checks it before booking: how full, and who waits.
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="relative h-1.5 w-14 overflow-hidden rounded-full bg-[#e6ebf2]">
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full', line.free === 0 ? 'bg-[#d99a00]' : line.free <= 2 ? 'bg-[#e0b24a]' : 'bg-[#2f9e5b]')}
          style={{ width: `${Math.min(100, Math.round((booked / Math.max(places, 1)) * 100))}%` }}
        />
      </span>
      {closed ? (
        <Badge tone="warning">{t('Niveau geschlossen', 'Level closed')}</Badge>
      ) : line.free === 0 ? (
        <Badge tone="warning">{t('Niveau voll', 'Level full')}</Badge>
      ) : (
        <span className="tabular-nums">{t(`${line.free} von ${places} Plätzen frei`, `${line.free} of ${places} places free`)}</span>
      )}
      {waiting ? <span>{t(`· ${waiting} auf der Warteliste`, `· ${waiting} waiting`)}</span> : null}
    </span>
  );
}

function Outcome({ outcome, t }: { outcome: LineOutcome; t: T }) {
  switch (outcome.kind) {
    case 'booked':
      return (
        <Link href={`/admin/bookings/${outcome.bookingId}`} className="hover:opacity-80">
          <Badge tone={outcome.cancelled ? 'quiet' : 'positive'}>
            {outcome.cancelled ? t('Storniert', 'Cancelled') : outcome.schoolman ? t('In SchoolMan gebucht', 'Booked in SchoolMan') : t('Gebucht', 'Booked')} · {outcome.number}
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
  // A line linked to a booking made in SchoolMan (0113) can be unlinked, should the link be wrong.
  if (canEdit && line.outcome.kind === 'booked' && line.outcome.schoolman) {
    return [{ label: t('Verknüpfung lösen', 'Unlink'), href: `${here}?unlink=${line.id}#line-${line.id}` }];
  }
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

/**
 * A visa case's way to the embassy (2026-10-31): the down payment asked for (a learner abroad pays the whole
 * first course, docs/LETTERS.md), the booking, the letter for the embassy.
 */
function visaSteps({
  letters,
  booked,
  embassyLetterAt,
  t,
  lang,
}: {
  letters: readonly { kind: string; sentAt: Date }[];
  booked: readonly Line[];
  embassyLetterAt: Date | null;
  t: T;
  lang: WsLang;
}) {
  const asked = letters.find((l) => l.kind === 'registration_deposit_request');
  const sentOn = (at: Date) => t(`verschickt am ${shortDate(at, lang)}`, `sent on ${shortDate(at, lang)}`);
  return [
    {
      label: pick(lang, LETTER_KIND_LABELS.registration_deposit_request),
      done: Boolean(asked),
      detail: asked ? sentOn(asked.sentAt) : t('noch nicht verschickt', 'not sent yet'),
    },
    {
      label: t('Gebucht', 'Booked'),
      done: booked.length > 0,
      detail: booked.length ? booked.map((l) => (l.outcome.kind === 'booked' ? l.outcome.number : '')).join(', ') : t('noch nicht gebucht', 'not booked yet'),
    },
    {
      label: pick(lang, LETTER_KIND_LABELS.visa_letter),
      done: Boolean(embassyLetterAt),
      detail: embassyLetterAt ? sentOn(embassyLetterAt) : t('noch nicht verschickt', 'not sent yet'),
    },
  ];
}

const shortDate = (at: Date, lang: WsLang) => new Date(at).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
