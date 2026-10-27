import Link from 'next/link';
import { notFound } from 'next/navigation';

import { offerPlaceAction } from '../../actions';
import { cancelSittingAction, deleteSittingAction, fileCandidatesAction, findCandidatesAction, setSittingValueAction, unfileCandidateAction, updateSittingAction } from '../actions';
import { ExaminerForm } from '../examiner-form';
import { SittingForm } from '../sitting-form';
import { PersonForm } from '../../../people/person-form';
import { RecordFoot } from '../../../bookings/record-foot';
import { CancelledLine, CandidateRow, ClosedEntryLine, ExaminerRow, QueueRow } from './sitting-parts';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { LetterKindIcon } from '@/components/admin/letters/letter-kind';
import { LetterList, type LetterRow } from '@/components/admin/letters/letter-list';
import { MoreInPanel, SearchableRows } from '@/components/admin/more-in-panel';
import { PersonPicker } from '@/components/admin/person-picker';
import { Popover, PopoverChoice } from '@/components/admin/popover';
import { RecordLink } from '@/components/admin/record-link';
import { MetaItem, MetaLine, Stat, StatBar, Timeline } from '@/components/admin/record-parts';
import { RecordTabList, RecordTabPanel, RecordTabs, type RecordTab } from '@/components/admin/record-tabs';
import { Badge, Button, ButtonLink, Card, Input, RecordHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityFor } from '@/lib/admin/activity';
import { bookingOffer } from '@/lib/admin/booking-offer';
import { EXAM_PARTS_LABELS, SITTING_STATUS_LABELS, overallOutcome } from '@/lib/admin/exam-parts';
import { examinerChoices, sittingExaminers, staffSittings } from '@/lib/admin/examiners';
import {
  freeSeats,
  getSitting,
  sittingCandidates,
  sittingDefaults,
  sittingEntries,
  sittingForEdit,
  sittingMails,
  sittingPreparations,
  sittingRegistrations,
  type ExamSitting,
} from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { capitalise, num, pick, relativeDays, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { LETTER_KIND_LABELS } from '@/lib/admin/letters/booking-letters';
import { SITTING_LETTER_KINDS } from '@/lib/admin/letters/exam-bulk';
import { lettersForEntries } from '@/lib/admin/letters/repo';
import type { LetterKind } from '@/lib/admin/letters/types';
import { mailHref } from '@/lib/admin/mail/href';
import { listNotes } from '@/lib/admin/notes';
import { listCountries } from '@/lib/admin/people';
import { recordHrefFor } from '@/lib/admin/record-href';

const LETTER_KEYS: Record<(typeof SITTING_LETTER_KINDS)[number], string> = { exam_invitation: 'invitation', exam_results: 'results', exam_participation: 'participation' };

/**
 * One exam sitting (2026-10-17, migration 0036; a record in tabs since 2026-10-27, Rahman: „it doesn't look so
 * advanced … the email interface and other advanced sidebars"). docs/ADMIN_WORKSPACE.md §Exams.
 *
 * The head says what and when, the deadline with the days left and the preparation that leads to it; its bar
 * how the sitting stands — booked against the places (changed there), free, waiting, reported to telc or the
 * results, the parts, who examines, whether the website offers it (changed there). Then the tabs, the most
 * worked first: the candidates (each opens at the side: the booking's colour, the money, telc, the result,
 * the letters, how to reach them), the waiting list in order with „Platz anbieten", the examiners, the
 * letters and mails sent for the sitting — letters to all and a mail to everyone or to the examiners, all
 * through the mail screen —, and the notes and history.
 */
export default async function ExamSittingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; tab?: string }> }) {
  const [{ id }, { error, tab }, user] = await Promise.all([params, searchParams, requireModule('catalogue')]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sitting = await getSitting(id);
  if (!sitting) notFound();
  const { t, lang } = await getI18n();

  const seesBookings = canAccess(user, 'bookings');
  const handles = canAccess(user, 'bookings', 'edit');
  const plans = canAccess(user, 'catalogue', 'edit');
  const ends = canAccess(user, 'catalogue', 'full');
  const mailsExaminers = plans || canAccess(user, 'staff', 'edit');
  const [candidates, entries, registrations, exams, form, examiners, choices, preparations, notes, activity, mails] = await Promise.all([
    seesBookings ? sittingCandidates(id) : Promise.resolve([]),
    sittingEntries(id),
    canAccess(user, 'registrations') ? sittingRegistrations(id) : Promise.resolve([]),
    plans ? sittingDefaults() : Promise.resolve([]),
    plans ? sittingForEdit(id) : Promise.resolve(null),
    sittingExaminers(id),
    plans ? examinerChoices(id) : Promise.resolve([]),
    sittingPreparations(id),
    listNotes('exam_session', id),
    activityFor('exam_session', id),
    seesBookings ? sittingMails(id) : Promise.resolve([]),
  ]);
  // Each examiner's other sittings, for the panel at the side.
  const examinerSittings = new Map(await Promise.all(examiners.map(async (x) => [x.staffId, (await staffSittings(x.staffId)).filter((s) => s.sittingId !== id)] as const)));
  // „Buchen": a learner found by name, or a new one, then the booking wizard at this sitting.
  const today = new Date().setHours(0, 0, 0, 0);
  const past = new Date(sitting.startsAt).getTime() < today;
  // After the exam day: telc's results are entered, and the result is handed over.
  const sat = new Date(sitting.startsAt).setHours(0, 0, 0, 0) < today;
  const books = handles && canAccess(user, 'people') && sitting.status === 'scheduled' && !sat;
  const addsPeople = books && canAccess(user, 'people', 'edit');
  const countries = addsPeople ? await listCountries() : [];
  const letters = await lettersForEntries(entries.map((e) => e.id));
  const open = entries.filter((e) => e.status === 'waiting' || e.status === 'offered');
  const closed = entries.filter((e) => e.status !== 'waiting' && e.status !== 'offered');
  const offer = handles && open.length ? await bookingOffer() : null;

  const free = freeSeats(sitting);
  const next = free > 0 ? open.find((e) => e.status === 'waiting') : undefined;
  const withPlace = new Set(open.filter((e) => e.status === 'waiting').slice(0, free).map((e) => e.id));
  const standing = candidates.filter((c) => c.status !== 'cancelled');
  const cancelled = candidates.filter((c) => c.status === 'cancelled');
  const withResult = standing.filter((c) => c.result && overallOutcome(c.parts, c.result)).length;
  const parts = { full: 0, written: 0, oral: 0 };
  for (const c of standing) parts[c.parts] += 1;
  const back = `/admin/catalogue/exams/${id}`;
  const daysLeft = sitting.registrationDeadline ? Math.round((new Date(sitting.registrationDeadline).setHours(0, 0, 0, 0) - today) / 86_400_000) : null;
  const subject = `${sitting.examName} · ${new Date(sitting.startsAt).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' })}`;
  const changes = plans && sitting.status !== 'cancelled' && !past;

  // The exam letters the candidates have had, each kind once per booking that stands.
  const letterRows: LetterRow[] = standing
    .flatMap((c) =>
      c.letters.map((l) => ({
        id: l.id,
        kind: l.kind as LetterKind,
        kindLabel: pick(lang, LETTER_KIND_LABELS[l.kind as LetterKind] ?? { de: l.kind, en: l.kind }),
        subject: c.personName,
        sentAt: l.sentAt.toISOString(),
      }))
    )
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const had = (kind: string) => standing.filter((c) => c.letters.some((l) => l.kind === kind)).length;

  const tabs: RecordTab[] = [
    ...(seesBookings ? [{ id: 'candidates', label: t('Teilnehmende', 'Candidates'), icon: Icon.people, count: standing.length }] : []),
    { id: 'waiting', label: t('Warteliste', 'Waiting list'), icon: Icon.clock, count: open.length },
    { id: 'examiners', label: t('Prüfende', 'Examiners'), icon: Icon.award, count: examiners.length },
    ...(seesBookings ? [{ id: 'letters', label: t('Briefe & E-Mails', 'Letters & e-mails'), icon: Icon.mail, count: letterRows.length + mails.length }] : []),
    { id: 'history', label: t('Notizen und Verlauf', 'Notes and history'), icon: Icon.note, count: notes.length },
  ];

  return (
    <RecordTabs tabs={tabs} initial={tab}>
      <RecordHeader
        backHref="/admin/catalogue/exams"
        backLabel={t('Prüfungen', 'Exams')}
        title={sitting.examName}
        trailLabel={subject}
        status={
          <>
            {sitting.status === 'cancelled' ? <Badge tone="danger">{pick(lang, SITTING_STATUS_LABELS.cancelled)}</Badge> : null}
            {past ? <Badge tone="quiet">{t('Vorbei', 'Past')}</Badge> : null}
          </>
        }
        subtitle={
          <MetaLine>
            <MetaItem icon={Icon.calendar}>{sittingWhen(sitting, lang)}</MetaItem>
            {sitting.registrationDeadline ? (
              <MetaItem icon={Icon.clock}>
                <span className={!past && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? 'font-semibold text-[#9a5b00]' : undefined}>
                  {t('Anmeldeschluss', 'Entries close')}{' '}
                  {new Date(sitting.registrationDeadline).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })}
                  {daysLeft === null || past
                    ? ''
                    : daysLeft < 0
                      ? ` · ${t('vorbei', 'passed')}`
                      : daysLeft === 0
                        ? ` · ${t('heute', 'today')}`
                        : daysLeft <= 30
                          ? ` · ${daysLeft === 1 ? t('noch 1 Tag', '1 day left') : t(`noch ${daysLeft} Tage`, `${daysLeft} days left`)}`
                          : ''}
                </span>
              </MetaItem>
            ) : null}
            {/* The exam preparation that leads to it (SchoolMan, 0093). */}
            {preparations.length ? (
              <MetaItem icon={Icon.catalogue}>
                {preparations.map((c, i) => (
                  <span key={c.id}>
                    {i ? ', ' : ''}
                    <RecordLink href={recordHrefFor(user, 'course', c.id)}>
                      {t('Vorbereitung', 'Preparation')} {t('ab', 'from')}{' '}
                      {new Date(`${c.startDate}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })}
                    </RecordLink>
                  </span>
                ))}
              </MetaItem>
            ) : null}
          </MetaLine>
        }
        actions={
          <>
            {plans && form ? (
              <FormDialog icon={Icon.calendar} tint="red" trigger={t('Bearbeiten', 'Edit')} title={t('Prüfungstermin bearbeiten', 'Edit the sitting')} triggerVariant="secondary">
                <SittingForm action={updateSittingAction} exams={exams} sittingId={id} initial={form} examLocked={sitting.booked > 0} />
              </FormDialog>
            ) : null}
            {books ? (
              <FormDialog
                icon={Icon.bookings}
                tint="red"
                trigger={t('Buchen', 'Book')}
                title={t('Wen buchen?', 'Who to book?')}
                description={`${sitting.examName} · ${sittingWhen(sitting, lang)}`}
                triggerVariant={next ? 'secondary' : 'primary'}
              >
                <PersonPicker
                  search={findCandidatesAction.bind(null, id)}
                  bookQuery={`book=1&sitting=${id}`}
                  alreadyLabel={t('Schon gebucht', 'Already booked')}
                  newPerson={addsPeople ? <PersonForm countries={countries} hidden={{ then: 'book', sitting: id }} submitLabel={t('Weiter zur Buchung', 'On to the booking')} /> : null}
                />
              </FormDialog>
            ) : null}
          </>
        }
        bar={
          <StatBar>
            <Stat label={t('Gebucht', 'Booked')}>
              {changes ? (
                <Popover floating label={t('Plätze', 'Places')} width={260} trigger={<BookedFigure sitting={sitting} lang={lang} />}>
                  <form action={setSittingValueAction} className="flex items-end gap-2 p-1.5">
                    <input type="hidden" name="sittingId" value={id} />
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-[0.74rem] font-semibold text-[var(--casa-muted)]">{t(`Mindestens ${sitting.booked}`, `At least ${sitting.booked}`)}</span>
                      <Input type="number" name="capacity" min={Math.max(1, sitting.booked)} max={500} defaultValue={sitting.capacity} aria-label={t('Plätze', 'Places')} />
                    </label>
                    <Button type="submit" size="md">
                      {t('Speichern', 'Save')}
                    </Button>
                  </form>
                </Popover>
              ) : (
                <BookedFigure sitting={sitting} lang={lang} />
              )}
            </Stat>
            {/* Places and the queue matter until the day; after it, the results do. */}
            {!sat ? (
              <Stat label={t('Plätze frei', 'Free places')}>
                <span className={free ? 'text-[#17693a]' : 'text-[var(--casa-muted)]'}>{num(lang, free)}</span>
              </Stat>
            ) : null}
            {!sat || open.length ? (
              <Stat label={t('Warteliste', 'Waiting list')}>
                {open.length ? num(lang, open.length) : <span className="font-semibold text-[var(--casa-muted)]">{t('niemand', 'nobody')}</span>}
              </Stat>
            ) : null}
            {seesBookings && sat ? (
              <Stat label={t('Ergebnisse', 'Results')}>
                <span className={withResult < standing.length ? 'text-[#9a5b00]' : 'text-[#17693a]'}>{num(lang, withResult)}</span>
                <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, standing.length)}</span>
              </Stat>
            ) : seesBookings ? (
              <Stat label={t('Bei telc gemeldet', 'Reported to telc')}>
                <span className={sitting.filed < sitting.booked ? 'text-[#9a5b00]' : 'text-[#17693a]'}>{num(lang, sitting.filed)}</span>
              </Stat>
            ) : null}
            {seesBookings && (parts.written || parts.oral) ? (
              <Stat label={t('Teile', 'Parts')}>
                <span className="text-[0.92rem]">
                  {[
                    parts.full ? t(`${parts.full} ganz`, `${parts.full} whole`) : null,
                    parts.written ? t(`${parts.written} schriftl.`, `${parts.written} written`) : null,
                    parts.oral ? t(`${parts.oral} mündl.`, `${parts.oral} oral`) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </Stat>
            ) : null}
            <Stat label={t('Prüfende', 'Examiners')}>
              {examiners.length ? (
                <span className="text-[0.92rem]">
                  {examiners.map((x, i) => (
                    <span key={x.staffId}>
                      {i ? ', ' : ''}
                      <RecordLink href={recordHrefFor(user, 'staff', x.staffId)}>{x.name}</RecordLink>
                    </span>
                  ))}
                </span>
              ) : (
                <span className={!past && sitting.status !== 'cancelled' ? 'text-[0.92rem] text-[#9a5b00]' : 'text-[0.92rem] text-[var(--casa-muted)]'}>{t('Noch offen', 'Not yet')}</span>
              )}
            </Stat>
            {sitting.status !== 'cancelled' && !past ? (
              <Stat label={t('Website', 'Website')}>
                {changes ? (
                  <Popover floating label={t('Auf der Website', 'On the website')} width={260} trigger={<WebsiteWord status={sitting.status} t={t} />}>
                    <form action={setSittingValueAction}>
                      <input type="hidden" name="sittingId" value={id} />
                      <PopoverChoice name="published" value="on" current={sitting.status === 'scheduled'}>
                        {t('Zur Anmeldung angeboten', 'Open for registration')}
                      </PopoverChoice>
                      <PopoverChoice name="published" value="off" current={sitting.status === 'draft'}>
                        {pick(lang, SITTING_STATUS_LABELS.draft)}
                      </PopoverChoice>
                    </form>
                  </Popover>
                ) : (
                  <WebsiteWord status={sitting.status} t={t} />
                )}
              </Stat>
            ) : null}
          </StatBar>
        }
        tabs={<RecordTabList label={t(`${sitting.examName}: Bereiche`, `${sitting.examName}: sections`)} />}
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      {next ? (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e9f6ee] px-4 py-3 ring-1 ring-[#b7dfc6] ring-inset">
          <p className="text-[0.88rem] text-[#14532d]">
            <span className="font-extrabold">{free === 1 ? t('1 Platz frei', '1 place free') : t(`${free} Plätze frei`, `${free} places free`)}</span>
            {' · '}
            {t('als Nächste dran:', 'next in line:')}{' '}
            <Link href={`/admin/people/${next.personId}`} className="font-bold underline-offset-2 hover:underline">
              {next.personName}
            </Link>
          </p>
          {handles ? (
            <form action={offerPlaceAction}>
              <input type="hidden" name="entryId" value={next.id} />
              <input type="hidden" name="returnTo" value={back} />
              <Button type="submit" size="sm">
                {t('Platz anbieten', 'Offer the place')}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {seesBookings ? (
        <RecordTabPanel id="candidates">
          <div className="space-y-4">
            {registrations.length ? (
              <Card title={t('Neue Anmeldungen von der Website', 'New registrations from the website')} icon={Icon.registrations} tint="blue" bleed>
                <ul className="divide-y divide-ws-line-soft">
                  {registrations.map((r) => (
                    <li key={r.id}>
                      <Link href={`/admin/registrations/exam/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.86rem] hover:bg-[var(--ws-row-hover)]">
                        <span className="truncate font-semibold text-[var(--casa-ink)]">{r.name}</span>
                        <span className="shrink-0 text-xs text-[var(--casa-muted)]">
                          {r.parts !== 'full' && r.parts in EXAM_PARTS_LABELS ? `${pick(lang, EXAM_PARTS_LABELS[r.parts as keyof typeof EXAM_PARTS_LABELS])} · ` : ''}
                          {capitalise(relativeDays(r.submittedAt, lang))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card
              title={t('Teilnehmende', 'Candidates')}
              icon={Icon.people}
              tint="blue"
              bleed
              actions={
                standing.length ? (
                  <span className="flex flex-wrap items-center gap-1">
                    {handles ? (
                      <ButtonLink href={mailHref('exam_sitting', id, { back: `${back}` })} size="sm" variant="ghost">
                        {Icon.mail}
                        {t('E-Mail an alle', 'E-mail all')}
                      </ButtonLink>
                    ) : null}
                    {handles ? (
                      <ButtonLink href={`${back}/letters`} size="sm" variant="ghost">
                        {Icon.statement}
                        {t('Briefe an alle', 'Letters to all')}
                      </ButtonLink>
                    ) : null}
                    <ButtonLink href={`${back}/telc`} size="sm" variant="ghost">
                      {t('Liste für telc', 'List for telc')}
                    </ButtonLink>
                    {handles && sat ? (
                      <ButtonLink href={`${back}/results`} size="sm" variant="secondary">
                        {Icon.award}
                        {t('Ergebnisse eintragen', 'Enter results')}
                      </ButtonLink>
                    ) : null}
                  </span>
                ) : undefined
              }
            >
              {standing.length === 0 ? (
                <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch niemand gebucht.', 'Nobody booked yet.')}</p>
              ) : (
                <form action={fileCandidatesAction}>
                  <input type="hidden" name="sittingId" value={id} />
                  <SearchableRows
                    rows={standing.map((c) => ({
                      key: c.bookingId,
                      search: [c.personName, c.number, c.email].filter(Boolean).join(' '),
                      node: <CandidateRow candidate={c} sitting={sitting} user={user} handles={handles} files={handles && !sat} sat={sat} t={t} lang={lang} />,
                    }))}
                    placeholder={t('Name oder Buchungsnummer', 'Name or booking number')}
                    listClassName="divide-y divide-ws-line-soft"
                  />
                  {handles && !sat && standing.some((c) => !c.filedAt) ? (
                    <div className="flex justify-end border-t border-ws-line-soft px-5 py-3">
                      <Button type="submit" size="sm" variant="secondary">
                        {t('Ausgewählte als gemeldet markieren', 'Mark the ticked as reported')}
                      </Button>
                    </div>
                  ) : null}
                </form>
              )}
              {handles
                ? standing
                    .filter((c) => c.filedAt)
                    .map((c) => (
                      <form key={c.bookingId} id={`unfile-${c.bookingId}`} action={unfileCandidateAction} hidden>
                        <input type="hidden" name="sittingId" value={id} />
                        <input type="hidden" name="bookingId" value={c.bookingId} />
                      </form>
                    ))
                : null}
              {cancelled.length ? (
                <div className="border-t border-ws-line-soft px-4 py-3">
                  <MoreInPanel
                    title={t('Storniert', 'Cancelled')}
                    label={t('Storniert', 'Cancelled')}
                    icon={Icon.people}
                    tint="red"
                    rows={cancelled.map((c) => ({ key: c.bookingId, node: <CancelledLine candidate={c} t={t} />, search: [c.personName, c.number].join(' ') }))}
                  />
                </div>
              ) : null}
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}

      <RecordTabPanel id="waiting">
        <Card title={t('Warteliste', 'Waiting list')} icon={Icon.clock} tint="sun" bleed>
          {open.length ? (
            <ol>
              {open.map((entry) => (
                <QueueRow
                  key={entry.id}
                  entry={entry}
                  queueLength={open.length}
                  hasPlace={withPlace.has(entry.id)}
                  lastLetter={letters.find((l) => l.waitlistEntryId === entry.id) ?? null}
                  handles={handles}
                  offer={offer}
                  sitting={sitting}
                  t={t}
                  lang={lang}
                />
              ))}
            </ol>
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Niemand wartet.', 'Nobody is waiting.')}</p>
          )}
          {closed.length ? (
            <div className="border-t border-ws-line-soft px-4 py-3">
              <MoreInPanel
                title={t('Von der Warteliste', 'Off the waiting list')}
                label={t('Von der Warteliste', 'Off the waiting list')}
                icon={Icon.clock}
                tint="sun"
                rows={closed.map((entry) => ({
                  key: entry.id,
                  node: <ClosedEntryLine entry={entry} t={t} lang={lang} />,
                  search: entry.personName,
                  at: entry.closedAt ? new Date(entry.closedAt).toISOString() : undefined,
                }))}
              />
            </div>
          ) : null}
        </Card>
      </RecordTabPanel>

      <RecordTabPanel id="examiners">
        <Card
          title={t('Prüfende', 'Examiners')}
          icon={Icon.award}
          tint="green"
          bleed
          actions={
            <span className="flex flex-wrap items-center gap-1">
              {examiners.length && mailsExaminers ? (
                <ButtonLink href={mailHref('exam_examiners', id, { back: `${back}?tab=examiners` })} size="sm" variant="ghost">
                  {Icon.mail}
                  {t('E-Mail an die Prüfenden', 'E-mail the examiners')}
                </ButtonLink>
              ) : null}
              {plans && sitting.status !== 'cancelled' && choices.length ? (
                <FormDialog icon={Icon.people} tint="ink" trigger={t('Eintragen', 'Add')} title={t('Prüfende eintragen', 'Add an examiner')} triggerVariant="secondary" size="sm">
                  <ExaminerForm sittingId={id} choices={choices} />
                </FormDialog>
              ) : null}
            </span>
          }
        >
          {examiners.length ? (
            <ul className="divide-y divide-ws-line-soft">
              {examiners.map((x) => (
                <ExaminerRow key={x.staffId} examiner={x} sitting={sitting} others={examinerSittings.get(x.staffId) ?? []} user={user} plans={plans} t={t} lang={lang} />
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch niemand eingetragen.', 'Nobody yet.')}</p>
          )}
        </Card>
      </RecordTabPanel>

      {seesBookings ? (
        <RecordTabPanel id="letters">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-4">
              <Card title={t('Briefe an alle', 'Letters to all')} icon={Icon.statement} tint="blue" bleed>
                <ul className="divide-y divide-ws-line-soft">
                  {/* The confirmation goes from each booking when it is made; here only how many have it. */}
                  <li className="flex items-center gap-3 px-5 py-3">
                    <LetterKindIcon kind="exam_confirmation" size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.88rem] font-semibold text-[var(--casa-ink)]">{pick(lang, LETTER_KIND_LABELS.exam_confirmation)}</span>
                      <span className="block text-[0.78rem] text-[var(--casa-muted)] tabular-nums">
                        {standing.length ? t(`${had('exam_confirmation')} von ${standing.length} haben sie`, `${had('exam_confirmation')} of ${standing.length} have it`) : t('Noch niemand gebucht', 'Nobody booked yet')}
                      </span>
                    </span>
                  </li>
                  {SITTING_LETTER_KINDS.map((kind) => {
                    // The invitation before the day; the result and the participation after it.
                    const due = kind === 'exam_invitation' ? !sat : sat;
                    return (
                      <li key={kind} className="flex items-center gap-3 px-5 py-3">
                        <LetterKindIcon kind={kind} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.88rem] font-semibold text-[var(--casa-ink)]">{pick(lang, LETTER_KIND_LABELS[kind])}</span>
                          <span className="block text-[0.78rem] text-[var(--casa-muted)] tabular-nums">
                            {standing.length ? t(`${had(kind)} von ${standing.length} haben ihn`, `${had(kind)} of ${standing.length} have it`) : t('Noch niemand gebucht', 'Nobody booked yet')}
                          </span>
                        </span>
                        {handles && standing.length ? (
                          <ButtonLink href={`${back}/letters?kind=${LETTER_KEYS[kind]}`} size="sm" variant={due && had(kind) < standing.length ? 'secondary' : 'ghost'}>
                            {t('Schreiben', 'Write')}
                          </ButtonLink>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </Card>
              <Card
                title={t('E-Mails', 'E-mails')}
                icon={Icon.mail}
                tint="ink"
                bleed
                actions={
                  <span className="flex flex-wrap items-center gap-1">
                    {handles && standing.length ? (
                      <ButtonLink href={mailHref('exam_sitting', id, { back: `${back}?tab=letters` })} size="sm" variant="ghost">
                        {t('An alle Teilnehmenden', 'To every candidate')}
                      </ButtonLink>
                    ) : null}
                    {examiners.length && mailsExaminers ? (
                      <ButtonLink href={mailHref('exam_examiners', id, { back: `${back}?tab=letters` })} size="sm" variant="ghost">
                        {t('An die Prüfenden', 'To the examiners')}
                      </ButtonLink>
                    ) : null}
                  </span>
                }
              >
                {mails.length ? (
                  <ul className="divide-y divide-ws-line-soft">
                    {mails.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-ws-sunk text-[var(--casa-muted)] [&_svg]:size-4">
                          {Icon.mail}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{m.subject}</span>
                          <span className="block truncate text-[0.78rem] text-[var(--casa-muted)]">
                            {[
                              m.to === 'examiners' ? t('An die Prüfenden', 'To the examiners') : t(`An ${m.recipients} Teilnehmende`, `To ${m.recipients} candidates`),
                              m.byName,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        <span className="shrink-0 text-[0.76rem] text-[var(--casa-muted)] tabular-nums">{capitalise(relativeDays(m.sentAt, lang))}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch keine E-Mail gesendet.', 'No e-mail sent yet.')}</p>
                )}
              </Card>
            </div>
            <Card title={t('Gesendete Briefe', 'Letters sent')} icon={Icon.statement} tint="ink" bleed>
              {letterRows.length ? (
                <LetterList rows={letterRows} variant="tab" title={t('Briefe zu diesem Termin', 'Letters for this sitting')} />
              ) : (
                <p className="px-5 py-4 text-sm text-[var(--casa-muted)]">{t('Noch kein Brief.', 'No letter yet.')}</p>
              )}
            </Card>
          </div>
        </RecordTabPanel>
      ) : null}

      <RecordTabPanel id="history">
        <div className="max-w-3xl">
          <Timeline canWrite={plans} entity="exam_session" id={id} notes={notes} activity={activity} />
        </div>
      </RecordTabPanel>

      {ends && ((sitting.status !== 'cancelled' && !past) || (sitting.createdHere && candidates.length === 0 && entries.length === 0)) ? (
        <RecordFoot>
          {sitting.status !== 'cancelled' && !past ? (
            <form action={cancelSittingAction}>
              <input type="hidden" name="sittingId" value={id} />
              <ConfirmSubmit
                title={t('Diesen Prüfungstermin absagen?', 'Cancel this sitting?')}
                description={t('Er verschwindet von der Website und bleibt hier als abgesagt stehen.', 'It leaves the website and stays here as cancelled.')}
                confirmLabel={t('Termin absagen', 'Cancel sitting')}
              >
                {t('Termin absagen', 'Cancel sitting')}
              </ConfirmSubmit>
            </form>
          ) : null}
          {sitting.createdHere && candidates.length === 0 && entries.length === 0 ? (
            <form action={deleteSittingAction}>
              <input type="hidden" name="sittingId" value={id} />
              <ConfirmSubmit title={t('Diesen Prüfungstermin löschen?', 'Delete this sitting?')} description={t('Er verschwindet ganz.', 'It is gone for good.')}>
                {t('Termin löschen', 'Delete sitting')}
              </ConfirmSubmit>
            </form>
          ) : null}
        </RecordFoot>
      ) : null}
    </RecordTabs>
  );
}

/** "Fr, 13. Nov. 2026 · 09:00–17:00". */
function sittingWhen(sitting: ExamSitting, lang: WsLang): string {
  const from = new Date(sitting.startsAt);
  const to = new Date(sitting.endsAt);
  const time = (d: Date) => d.toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
  return `${from.toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' })} · ${time(from)}–${time(to)}`;
}

/** Booked against the places: „20 / 28". */
function BookedFigure({ sitting, lang }: { sitting: ExamSitting; lang: WsLang }) {
  return (
    <span className="tabular-nums">
      {num(lang, sitting.booked)}
      <span className="font-semibold text-[var(--casa-muted)]"> / {num(lang, sitting.capacity)}</span>
    </span>
  );
}

/** Whether the website's registration form offers the sitting. */
function WebsiteWord({ status, t }: { status: string; t: T }) {
  return status === 'scheduled' ? (
    <span className="text-[0.92rem] text-[#17693a]">{t('Angeboten', 'Offered')}</span>
  ) : (
    <span className="text-[0.92rem] text-[var(--casa-muted)]">{t('Entwurf', 'Draft')}</span>
  );
}
