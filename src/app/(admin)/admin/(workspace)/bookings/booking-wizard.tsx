'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { Button, Field, Input, Select, Textarea, TINTS } from '@/components/admin/ui';
import {
  levelBand,
  levelFree,
  levelPlaces,
  levelSiblings,
  waitingAhead,
  type BookingOffer,
  type CohortOffer,
} from '@/lib/admin/booking-offer-types';
import { cn } from '@/lib/utils';
import { toDateInputValue } from '@/lib/dates';
import { OptionalSection } from '@/components/admin/optional-section';
import { DateField } from '@/components/admin/date-picker';
import { useWsLang } from '@/components/admin/lang';
import type { T } from '@/lib/admin/i18n';

/**
 * The booking wizard.
 *
 * One question at a time, each answer narrowing the next: what kind of course,
 * which one of those, which level, books, accommodation, then a review. The
 * shape follows how a colleague actually asks a learner — "what do you want to
 * do?" before "which dates?" — rather than presenting a form with every field
 * on it, which is the FileMaker layout this replaces.
 *
 * NO PRICES ON THIS SCREEN, DELIBERATELY. A colleague booking a learner is
 * choosing what they get, not quoting them: the cohort's fee, the enrolment
 * fee and each book are already set in Settings, so showing them here is both
 * noise and a chance to disagree with the record. The cost appears once the
 * booking exists — per line and as a total — on the booking itself and on the
 * student's page. `priceSelection()` on the server is the only thing that
 * decides an amount.
 */

type Step = 'what' | 'course' | 'level' | 'accommodation' | 'review';

const steps = (t: T): readonly { key: Step; label: string }[] => [
  { key: 'what', label: t('Was', 'What') },
  { key: 'course', label: t('Auswahl', 'Which') },
  { key: 'level', label: t('Niveau & Bücher', 'Level & books') },
  { key: 'accommodation', label: t('Unterkunft', 'Accommodation') },
  { key: 'review', label: t('Prüfen', 'Review') },
];

/** A cohort's session as stored ('morning'), in words; anything else as stored. */
const sessionLabel = (t: T, session: string): string =>
  session === 'morning'
    ? t('Vormittag', 'morning')
    : session === 'afternoon'
      ? t('Nachmittag', 'afternoon')
      : session === 'evening'
        ? t('Abend', 'evening')
        : session;

const weeksLabel = (t: T, weeks: number) => (weeks === 1 ? t('1 Woche', '1 week') : t(`${weeks} Wochen`, `${weeks} weeks`));

export function BookingWizard({
  personId,
  personName,
  offer,
  preselectedCohortId,
  preselectedLevelCode,
  sourceRegistrationId,
  returnTo,
  action,
  waitlistAction,
}: {
  personId: string;
  personName: string;
  offer: BookingOffer;
  preselectedCohortId?: string | null;
  /** From a waiting list: the level the learner waited for. */
  preselectedLevelCode?: string | null;
  sourceRegistrationId?: string | null;
  returnTo: string;
  action: (formData: FormData) => void | Promise<void>;
  /** The other ending when the level is full: the learner goes into its queue (`waitlistFromWizardAction`). */
  waitlistAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { t } = useWsLang();
  const preselected = useMemo(
    () =>
      preselectedCohortId
        ? (offer.courseTypes.flatMap((t) => t.cohorts).find((c) => c.id === preselectedCohortId) ??
          null)
        : null,
    [offer.courseTypes, preselectedCohortId]
  );

  const [step, setStep] = useState<Step>(preselected ? 'level' : 'what');
  const [kind, setKind] = useState<'course' | 'exam'>('course');
  const [courseTypeId, setCourseTypeId] = useState<string | null>(
    preselected?.courseTypeId ?? null
  );
  const [cohort, setCohort] = useState<CohortOffer | null>(preselected);
  const [examTypeId, setExamTypeId] = useState<string | null>(null);
  const [examParts, setExamParts] = useState<1 | 2>(2);

  const [levelCode, setLevelCode] = useState<string | null>(preselectedLevelCode ?? preselected?.levelCode ?? null);
  const [levelScope, setLevelScope] = useState<'half' | 'whole'>('whole');
  const [wantsBooks, setWantsBooks] = useState<boolean | null>(null);
  const [excludedBooks, setExcludedBooks] = useState<Set<string>>(new Set());

  const [wantsAccommodation, setWantsAccommodation] = useState<boolean | null>(null);
  const [accType, setAccType] = useState<string>('');
  const [roomType, setRoomType] = useState<string>('');
  const [catering, setCatering] = useState<string>('');
  const [accFrom, setAccFrom] = useState<string>('');
  const [accTo, setAccTo] = useState<string>('');
  const [includeFee, setIncludeFee] = useState(true);

  const exam = offer.exams.find((e) => e.id === examTypeId) ?? null;

  /** The books for the chosen level: both halves, or just this one. */
  const books = useMemo(() => {
    if (!levelCode) return [];
    const codes = levelScope === 'whole' ? levelSiblings(levelCode) : [levelCode];
    return offer.materials.filter((m) => m.levelCode && codes.includes(m.levelCode));
  }, [levelCode, levelScope, offer.materials]);

  const chosenBooks = books.filter((b) => !excludedBooks.has(b.id));

  // The chosen level in the chosen start: its places and who already waits for them.
  const group = kind === 'course' && cohort && levelCode ? levelPlaces(cohort, levelCode) : null;
  const free = group ? levelFree(group, personId) : null;
  const ahead = group ? waitingAhead(group, personId) : 0;
  const full = group !== null && free === 0;
  const queueFirst = Boolean(waitlistAction) && group !== null && (full || ahead > 0);

  const chosenAccommodation = wantsAccommodation
    ? (offer.accommodation.find((a) => a.code === accType) ?? null)
    : null;

  const visible = steps(t).filter((s) => (kind === 'exam' ? s.key !== 'level' : true));
  const index = visible.findIndex((s) => s.key === step);
  const canAdvance =
    (step === 'what' && (kind === 'course' || (kind === 'exam' && Boolean(examTypeId)))) ||
    (step === 'course' && Boolean(cohort)) ||
    (step === 'level' && wantsBooks !== null) ||
    (step === 'accommodation' && wantsAccommodation !== null) ||
    step === 'review';

  const go = (delta: number) => {
    const next = visible[index + delta];
    if (next) setStep(next.key);
  };

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap items-center gap-1 border-b border-ws-line-soft pb-3">
        {visible.map((s, i) => {
          const current = s.key === step;
          const done = i < index;
          return (
            <li key={s.key} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden="true" className="h-px w-3 bg-ws-line-firm" /> : null}
              <button
                type="button"
                onClick={() => (i <= index ? setStep(s.key) : undefined)}
                disabled={i > index}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-lg px-1.5 text-xs font-bold transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                  current
                    ? 'text-[var(--casa-ink)]'
                    : done
                      ? 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
                      : 'text-[var(--casa-text-subtle)]'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded-full text-[0.68rem] font-extrabold [&_svg]:h-3 [&_svg]:w-3',
                    current
                      ? 'bg-[var(--casa-ink-deep)] text-white'
                      : done
                        ? TINTS.green
                        : 'bg-white text-[var(--casa-muted)] ring-[1.5px] ring-ws-line-firm ring-inset'
                  )}
                >
                  {done ? Icon.check : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      {step === 'what' ? (
        <section className="space-y-3">
          <Question>
            {t(`Was bucht ${personName.split(' ')[0]}?`, `What is ${personName.split(' ')[0]} booking?`)}
          </Question>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice
              selected={kind === 'course'}
              onSelect={() => setKind('course')}
              title={t('Einen Kurs', 'A course')}
            >
              {t('Intensiv, abends, Spezialkurs oder Prüfungsvorbereitung', 'Intensive, evening, special or exam preparation')}
            </Choice>
            <Choice selected={kind === 'exam'} onSelect={() => setKind('exam')} title={t('Eine Prüfung', 'An exam')}>
              {t('Ein einzelner telc-Prüfungstermin', 'A telc sitting on its own')}
            </Choice>
          </div>

          {kind === 'exam' ? (
            <div className="space-y-3 border-t border-ws-line-soft pt-4">
              <Question small>{t('Welche Prüfung?', 'Which exam?')}</Question>
              <div className="grid gap-2">
                {offer.exams.map((e) => (
                  <Choice
                    key={e.id}
                    selected={examTypeId === e.id}
                    onSelect={() => setExamTypeId(e.id)}
                    title={e.name}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {([2, 1] as const).map((parts) => (
                  <button
                    key={parts}
                    type="button"
                    onClick={() => setExamParts(parts)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                      examParts === parts
                        ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                        : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45'
                    )}
                  >
                    {parts === 2 ? t('Beide Teile', 'Both parts') : t('Nur ein Teil', 'One part only')}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 'course' ? (
        <section className="space-y-3">
          <Question>{t('Welche Kursart?', 'Which kind of course?')}</Question>
          <div className="flex flex-wrap gap-2">
            {offer.courseTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setCourseTypeId(type.id);
                  setCohort(null);
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                  courseTypeId === type.id
                    ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                    : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45'
                )}
              >
                {type.name}
                <span
                  className={cn(
                    'ml-2 text-xs font-normal',
                    courseTypeId === type.id ? 'text-white/60' : 'text-[var(--casa-text-subtle)]'
                  )}
                >
                  {type.cohorts.length}
                </span>
              </button>
            ))}
          </div>

          {courseTypeId ? (
            <div className="space-y-2 border-t border-ws-line-soft pt-4">
              <Question small>{t('Welcher Termin?', 'Which one?')}</Question>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {(offer.courseTypes.find((type) => type.id === courseTypeId)?.cohorts ?? []).map((c) => {
                  return (
                    <Choice
                      key={c.id}
                      selected={cohort?.id === c.id}
                      onSelect={() => {
                        setCohort(c);
                        if (c.levelCode) setLevelCode(c.levelCode);
                      }}
                      title={c.label}
                    >
                      {[
                        weeksLabel(t, c.weeks),
                        c.session ? sessionLabel(t, c.session) : null,
                        // Places are per level and show on the next step; here, how many are booked in all.
                        c.seatsTaken > 0 ? t(`${c.seatsTaken} gebucht`, `${c.seatsTaken} booked`) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Choice>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 'level' ? (
        <section className="space-y-3">
          <Question>{t('Mit welchem Niveau beginnt die Person?', 'Which level are they starting at?')}</Question>
          <div className="flex flex-wrap gap-1.5">
            {offer.levels.map((l) => {
              const isFull = cohort ? levelFree(levelPlaces(cohort, l.code), personId) === 0 : false;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLevelCode(l.code)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-sm font-semibold tabular-nums transition-colors',
                    levelCode === l.code
                      ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                      : isFull
                        ? 'border-[#efdca4] bg-[#fff8e6] text-[#7a4a00] hover:border-[#d9b65c]'
                        : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45'
                  )}
                >
                  {l.code}
                  {isFull ? <span className="ml-1 text-[0.72rem] font-bold opacity-80">{t('voll', 'full')}</span> : null}
                </button>
              );
            })}
          </div>
          {group ? (
            // The chosen level's places in this start, before the rest is asked.
            <p className={cn('text-[0.82rem]', full ? 'font-semibold text-[#9a5b00]' : 'text-[var(--casa-muted)]')}>
              {full
                ? t(`${levelCode} ist voll: ${group.booked} von ${group.places} Plätzen gebucht`, `${levelCode} is full: ${group.booked} of ${group.places} places booked`)
                : t(`${levelCode}: ${free} von ${group.places} Plätzen frei`, `${levelCode}: ${free} of ${group.places} places free`)}
              {group.offeredTo.includes(personId)
                ? t(' · der Platz ist für diese Person reserviert', ' · the place is held for this person')
                : group.queue.length
                  ? t(` · ${group.queue.length} auf der Warteliste`, ` · ${group.queue.length} on the waiting list`)
                  : ''}
            </p>
          ) : null}

          {levelCode ? (
            <>
              {levelSiblings(levelCode).length > 1 ? (
                <div className="flex flex-wrap gap-2 border-t border-ws-line-soft pt-4">
                  <Question small>{t(`Wie viel von ${levelBand(levelCode)}?`, `How much of ${levelBand(levelCode)}?`)}</Question>
                  <div className="flex w-full gap-2">
                    <Toggle
                      selected={levelScope === 'whole'}
                      onSelect={() => setLevelScope('whole')}
                      label={t(`Das ganze ${levelBand(levelCode)}`, `The whole ${levelBand(levelCode)}`)}
                    />
                    <Toggle
                      selected={levelScope === 'half'}
                      onSelect={() => setLevelScope('half')}
                      label={t(`Nur ${levelCode}`, `${levelCode} only`)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 border-t border-ws-line-soft pt-4">
                <Question small>{t('Möchte die Person das Buch?', 'Do they want the book?')}</Question>
                <div className="flex gap-2">
                  <Toggle
                    selected={wantsBooks === true}
                    onSelect={() => setWantsBooks(true)}
                    label={t('Ja', 'Yes')}
                  />
                  <Toggle
                    selected={wantsBooks === false}
                    onSelect={() => setWantsBooks(false)}
                    label={t('Nein', 'No')}
                  />
                </div>

                {wantsBooks && books.length > 0 ? (
                  <ul className="mt-2 divide-y divide-ws-line-soft rounded-xl border border-ws-line">
                    {books.map((b) => (
                      <li key={b.id} className="px-3 py-2">
                        <label className="flex min-w-0 items-center gap-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={!excludedBooks.has(b.id)}
                            onChange={(e) => {
                              const next = new Set(excludedBooks);
                              if (e.target.checked) next.delete(b.id);
                              else next.add(b.id);
                              setExcludedBooks(next);
                            }}
                            className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
                          />
                          <span className="min-w-0 truncate">{b.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {wantsBooks && books.length === 0 ? (
                  <p className="text-xs text-[var(--casa-text-subtle)]">
                    {t(`Für ${levelCode} ist kein Buch hinterlegt.`, `No book is listed for ${levelCode}.`)}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {step === 'accommodation' ? (
        <section className="space-y-3">
          <Question>{t('Braucht die Person eine Unterkunft?', 'Do they need accommodation?')}</Question>
          <div className="flex gap-2">
            <Toggle
              selected={wantsAccommodation === true}
              onSelect={() => {
                setWantsAccommodation(true);
                if (cohort && !accFrom) {
                  setAccFrom(toDateInputValue(cohort.startDate));
                  setAccTo(toDateInputValue(cohort.endDate));
                }
              }}
              label={t('Ja', 'Yes')}
            />
            <Toggle
              selected={wantsAccommodation === false}
              onSelect={() => setWantsAccommodation(false)}
              label={t('Nein', 'No')}
            />
          </div>

          {wantsAccommodation ? (
            <div className="space-y-3 border-t border-ws-line-soft pt-4">
              <Question small>{t('Welche Art?', 'Which kind?')}</Question>
              <div className="grid gap-2 sm:grid-cols-2">
                {offer.accommodation.map((a) => (
                  <Choice
                    key={a.code}
                    selected={accType === a.code}
                    onSelect={() => setAccType(a.code)}
                    title={a.name}
                  >
                    {a.isCasaManaged ? t('Von CASA betreut', 'CASA managed') : undefined}
                  </Choice>
                ))}
              </div>

              {accType ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('Zimmer', 'Room')} htmlFor="acc-room">
                    <Select
                      id="acc-room"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                    >
                      <option value="">{t('Nicht angegeben', 'Not specified')}</option>
                      {offer.roomTypes.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('Verpflegung', 'Catering')} htmlFor="acc-catering">
                    <Select
                      id="acc-catering"
                      value={catering}
                      onChange={(e) => setCatering(e.target.value)}
                    >
                      <option value="">{t('Nicht angegeben', 'Not specified')}</option>
                      {offer.catering.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('Von', 'From')} htmlFor="acc-from">
                    <DateField
                      id="acc-from"
                      value={accFrom || null}
                      onChange={(v) => setAccFrom(v ?? '')}
                    />
                  </Field>
                  <Field label={t('Bis', 'Until')} htmlFor="acc-to">
                    <DateField
                      id="acc-to"
                      value={accTo || null}
                      min={accFrom || null}
                      onChange={(v) => setAccTo(v ?? '')}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 'review' ? (
        <form action={action} className="space-y-4">
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          {sourceRegistrationId ? (
            <input type="hidden" name="sourceRegistrationId" value={sourceRegistrationId} />
          ) : null}
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="courseInstanceId" value={cohort?.id ?? ''} />
          <input
            type="hidden"
            name="courseTypeId"
            value={cohort?.courseTypeId ?? courseTypeId ?? ''}
          />
          <input
            type="hidden"
            name="examTypeId"
            value={kind === 'exam' ? (examTypeId ?? '') : ''}
          />
          <input type="hidden" name="examParts" value={String(examParts)} />
          <input
            type="hidden"
            name="startDate"
            value={cohort ? toDateInputValue(cohort.startDate) : accFrom}
          />
          <input
            type="hidden"
            name="endDate"
            value={cohort ? toDateInputValue(cohort.endDate) : accTo}
          />
          <input type="hidden" name="levelCode" value={levelCode ?? ''} />
          <input type="hidden" name="includeEnrolmentFee" value={includeFee ? '1' : ''} />
          {wantsBooks
            ? chosenBooks.map((b) => (
                <input key={b.id} type="hidden" name="materialIds" value={b.id} />
              ))
            : null}
          <input
            type="hidden"
            name="accommodationTypeCode"
            value={wantsAccommodation ? accType : ''}
          />
          <input type="hidden" name="roomTypeCode" value={wantsAccommodation ? roomType : ''} />
          <input type="hidden" name="cateringCode" value={wantsAccommodation ? catering : ''} />
          <input type="hidden" name="accommodationFrom" value={wantsAccommodation ? accFrom : ''} />
          <input type="hidden" name="accommodationTo" value={wantsAccommodation ? accTo : ''} />
          <dl className="divide-y divide-ws-line-soft rounded-xl border border-ws-line">
            {summaryRows(t, {
              kind,
              cohort,
              exam,
              examParts,
              levelCode,
              levelScope,
              books: wantsBooks ? chosenBooks : [],
              accommodation: chosenAccommodation,
              accFrom,
              accTo,
            }).map((row) => (
              <div key={row.label} className="flex items-baseline gap-4 px-3 py-2.5">
                <dt className="w-28 shrink-0 text-xs font-medium text-[var(--casa-muted)]">
                  {row.label}
                </dt>
                <dd className="min-w-0 flex-1 text-sm text-[var(--casa-ink)]">{row.value}</dd>
              </div>
            ))}
          </dl>

          <OptionalSection
            requires={['personId']}
            heading={t('Status, wer zahlt und Notizen', 'Status, payer and notes')}
            alwaysOpen
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Status', 'Status')} htmlFor="review-status">
                <Select id="review-status" name="status" defaultValue="reserved">
                  <option value="reserved">{t('Reserviert', 'Reserved')}</option>
                  <option value="confirmed">{t('Bestätigt', 'Confirmed')}</option>
                </Select>
              </Field>
              <Field label={t('Wer zahlt', 'Who pays')} htmlFor="review-payer">
                <Select id="review-payer" name="payer" defaultValue="self">
                  <option value="self">{t('Lernende(r)', 'Learner')}</option>
                  <option value="agency">{t('Agentur', 'Agency')}</option>
                  <option value="company">{t('Firma', 'Company')}</option>
                  <option value="other">{t('Sonstige', 'Other')}</option>
                </Select>
              </Field>
            </div>
            <Field label={t('Name der Zahlenden', 'Payer name')} htmlFor="review-payer-name">
              <Input id="review-payer-name" name="payerName" maxLength={120} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={includeFee}
                onChange={(e) => setIncludeFee(e.target.checked)}
                className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
              />
              {t('Anmeldegebühr berechnen', 'Charge the enrolment fee')}
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="visaRequired"
                className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
              />
              {t('Visum nötig', 'Visa required')}
            </label>
            <Field label={t('Notizen', 'Notes')} htmlFor="review-notes">
              <Textarea id="review-notes" name="notes" rows={2} />
            </Field>
          </OptionalSection>

          {queueFirst && group ? (
            // A full level, or learners waiting in front: the queue is offered first, and booking anyway stays possible.
            <p role="status" className="rounded-xl bg-[#fff8e6] px-3.5 py-3 text-[0.86rem] leading-relaxed text-[#5c3d00] ring-1 ring-[#efdca4] ring-inset">
              {full
                ? t(
                    `${levelCode} ist in diesem Termin voll (${group.booked} von ${group.places} Plätzen). Auf der Warteliste wäre ${personName} Nr. ${ahead + 1}.`,
                    `${levelCode} is full in this start (${group.booked} of ${group.places} places). On the waiting list ${personName} would be no. ${ahead + 1}.`
                  )
                : t(
                    `${ahead === 1 ? '1 Person wartet' : `${ahead} Personen warten`} schon auf ${levelCode} in diesem Termin. Ein freier Platz geht zuerst an die Warteliste.`,
                    `${ahead === 1 ? '1 person is' : `${ahead} people are`} already waiting for ${levelCode} in this start. A free place goes to the waiting list first.`
                  )}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ws-line-soft pt-4">
            <Button type="button" variant="ghost" onClick={() => go(-1)}>
              {t('Zurück', 'Back')}
            </Button>
            {queueFirst && full ? (
              <span className="flex flex-wrap gap-2">
                <Button type="submit" variant="secondary">
                  {t('Trotzdem buchen', 'Book anyway')}
                </Button>
                <Button type="submit" formAction={waitlistAction}>
                  {t('Auf die Warteliste', 'Add to waiting list')}
                </Button>
              </span>
            ) : queueFirst ? (
              <span className="flex flex-wrap gap-2">
                <Button type="submit" variant="secondary" formAction={waitlistAction}>
                  {t('Auf die Warteliste', 'Add to waiting list')}
                </Button>
                <Button type="submit">{t('Buchung anlegen', 'Create booking')}</Button>
              </span>
            ) : (
              <Button type="submit">{t('Buchung anlegen', 'Create booking')}</Button>
            )}
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-ws-line-soft pt-4">
          <Button type="button" variant="ghost" onClick={() => go(-1)} disabled={index === 0}>
            {t('Zurück', 'Back')}
          </Button>
          <Button type="button" onClick={() => go(1)} disabled={!canAdvance}>
            {t('Weiter', 'Continue')}
          </Button>
        </div>
      )}
    </div>
  );
}

function Question({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return small ? (
    <h4 className="text-xs font-bold text-[var(--casa-muted)]">{children}</h4>
  ) : (
    <h3 className="text-lg leading-snug font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">
      {children}
    </h3>
  );
}

/** A choice card, the offers wizard's: a tile that takes an ink edge when chosen. */
function Choice({
  selected,
  onSelect,
  title,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
        selected
          ? 'border-[var(--casa-ink)] bg-[#edf0f5] shadow-[0_0_0_1px_var(--casa-ink)]'
          : 'border-ws-line bg-white hover:border-ws-line-firm'
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--casa-ink)]">{title}</span>
        {children ? (
          <span className="mt-0.5 block text-xs font-medium text-[var(--casa-text-subtle)]">
            {children}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function Toggle({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
        selected
          ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
          : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45'
      )}
    >
      {label}
    </button>
  );
}

/**
 * What the booking will say, in the order it was chosen. Words, not amounts:
 * the cost is resolved on the server and shown on the booking afterwards.
 */
function summaryRows(
  t: T,
  {
    kind,
    cohort,
    exam,
    examParts,
    levelCode,
    levelScope,
    books,
    accommodation,
    accFrom,
    accTo,
  }: {
    kind: 'course' | 'exam';
    cohort: CohortOffer | null;
    exam: { name: string } | null;
    examParts: 1 | 2;
    levelCode: string | null;
    levelScope: 'half' | 'whole';
    books: readonly { id: string; title: string }[];
    accommodation: { name: string } | null;
    accFrom: string;
    accTo: string;
  }
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (kind === 'course' && cohort) {
    rows.push({ label: t('Kurs', 'Course'), value: cohort.label });
    rows.push({
      label: t('Dauer', 'Runs for'),
      value: weeksLabel(t, cohort.weeks),
    });
  }
  if (kind === 'exam' && exam) {
    rows.push({ label: t('Prüfung', 'Exam'), value: exam.name });
    rows.push({
      label: t('Prüfungsteile', 'Sitting'),
      value: examParts === 1 ? t('Ein Teil', 'One part') : t('Beide Teile', 'Both parts'),
    });
  }
  if (levelCode) {
    rows.push({
      label: t('Niveau', 'Level'),
      value:
        levelScope === 'whole' && levelSiblings(levelCode).length > 1
          ? t(`Das ganze ${levelBand(levelCode)}`, `The whole ${levelBand(levelCode)}`)
          : levelCode,
    });
  }
  rows.push({
    label: t('Bücher', 'Books'),
    value: books.length === 0 ? t('Keine', 'None') : books.map((b) => b.title).join(', '),
  });
  rows.push({
    label: t('Unterkunft', 'Accommodation'),
    value: accommodation
      ? [accommodation.name, accFrom && accTo ? `${german(accFrom)} – ${german(accTo)}` : null]
          .filter(Boolean)
          .join(' · ')
      : t('Keine', 'None'),
  });

  return rows;
}

const german = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
