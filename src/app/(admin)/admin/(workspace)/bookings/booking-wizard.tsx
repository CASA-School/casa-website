'use client';

import { useMemo, useState } from 'react';

import { Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import {
  levelBand,
  levelSiblings,
  type BookingOffer,
  type CohortOffer,
} from '@/lib/admin/booking-offer-types';
import { cn } from '@/lib/utils';
import { toDateInputValue } from '@/lib/dates';
import { OptionalSection } from '@/components/admin/optional-section';

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

const STEPS: readonly { key: Step; label: string }[] = [
  { key: 'what', label: 'What' },
  { key: 'course', label: 'Which' },
  { key: 'level', label: 'Level & books' },
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'review', label: 'Review' },
];

export function BookingWizard({
  personId,
  personName,
  offer,
  preselectedCohortId,
  sourceRegistrationId,
  returnTo,
  action,
}: {
  personId: string;
  personName: string;
  offer: BookingOffer;
  preselectedCohortId?: string | null;
  sourceRegistrationId?: string | null;
  returnTo: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
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

  const [levelCode, setLevelCode] = useState<string | null>(preselected?.levelCode ?? null);
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

  const chosenAccommodation = wantsAccommodation
    ? (offer.accommodation.find((a) => a.code === accType) ?? null)
    : null;

  const visible = STEPS.filter((s) => (kind === 'exam' ? s.key !== 'level' : true));
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
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {visible.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden="true" className="text-ws-line-firm">
                /
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => (i <= index ? setStep(s.key) : undefined)}
              disabled={i > index}
              className={cn(
                'rounded-md px-1.5 py-0.5 font-semibold transition-colors',
                s.key === step
                  ? 'bg-[var(--casa-ink-deep)] text-white'
                  : i < index
                    ? 'text-[var(--casa-accent-text)] hover:bg-ws-sunk'
                    : 'text-[var(--casa-text-subtle)]'
              )}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {step === 'what' ? (
        <section className="space-y-3">
          <Question>What is {personName.split(' ')[0]} booking?</Question>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice
              selected={kind === 'course'}
              onSelect={() => setKind('course')}
              title="A course"
            >
              Intensive, evening, special or exam preparation
            </Choice>
            <Choice selected={kind === 'exam'} onSelect={() => setKind('exam')} title="An exam">
              A telc sitting on its own
            </Choice>
          </div>

          {kind === 'exam' ? (
            <div className="space-y-3 border-t border-ws-line-soft pt-4">
              <Question small>Which exam?</Question>
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
                    {parts === 2 ? 'Both parts' : 'One part only'}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 'course' ? (
        <section className="space-y-3">
          <Question>Which kind of course?</Question>
          <div className="flex flex-wrap gap-2">
            {offer.courseTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setCourseTypeId(t.id);
                  setCohort(null);
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                  courseTypeId === t.id
                    ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                    : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45'
                )}
              >
                {t.name}
                <span
                  className={cn(
                    'ml-2 text-xs font-normal',
                    courseTypeId === t.id ? 'text-white/60' : 'text-[var(--casa-text-subtle)]'
                  )}
                >
                  {t.cohorts.length}
                </span>
              </button>
            ))}
          </div>

          {courseTypeId ? (
            <div className="space-y-2 border-t border-ws-line-soft pt-4">
              <Question small>Which one?</Question>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {(offer.courseTypes.find((t) => t.id === courseTypeId)?.cohorts ?? []).map((c) => {
                  const left = c.capacity > 0 ? c.capacity - c.seatsTaken : null;
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
                        `${c.weeks} ${c.weeks === 1 ? 'week' : 'weeks'}`,
                        c.session,
                        left !== null ? `${left} of ${c.capacity} seats free` : null,
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
          <Question>Which level are they starting at?</Question>
          <div className="flex flex-wrap gap-1.5">
            {offer.levels.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLevelCode(l.code)}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-sm font-semibold tabular-nums transition-colors',
                  levelCode === l.code
                    ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                    : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45'
                )}
              >
                {l.code}
              </button>
            ))}
          </div>

          {levelCode ? (
            <>
              {levelSiblings(levelCode).length > 1 ? (
                <div className="flex flex-wrap gap-2 border-t border-ws-line-soft pt-4">
                  <Question small>How much of {levelBand(levelCode)}?</Question>
                  <div className="flex w-full gap-2">
                    <Toggle
                      selected={levelScope === 'whole'}
                      onSelect={() => setLevelScope('whole')}
                      label={`The whole ${levelBand(levelCode)}`}
                    />
                    <Toggle
                      selected={levelScope === 'half'}
                      onSelect={() => setLevelScope('half')}
                      label={`${levelCode} only`}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 border-t border-ws-line-soft pt-4">
                <Question small>Do they want the book?</Question>
                <div className="flex gap-2">
                  <Toggle
                    selected={wantsBooks === true}
                    onSelect={() => setWantsBooks(true)}
                    label="Yes"
                  />
                  <Toggle
                    selected={wantsBooks === false}
                    onSelect={() => setWantsBooks(false)}
                    label="No"
                  />
                </div>

                {wantsBooks && books.length > 0 ? (
                  <ul className="mt-2 divide-y divide-ws-line-soft rounded-lg border border-ws-line">
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
                            className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
                          />
                          <span className="min-w-0 truncate">{b.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {wantsBooks && books.length === 0 ? (
                  <p className="text-xs text-[var(--casa-text-subtle)]">
                    No book is listed for {levelCode}.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {step === 'accommodation' ? (
        <section className="space-y-3">
          <Question>Do they need accommodation?</Question>
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
              label="Yes"
            />
            <Toggle
              selected={wantsAccommodation === false}
              onSelect={() => setWantsAccommodation(false)}
              label="No"
            />
          </div>

          {wantsAccommodation ? (
            <div className="space-y-3 border-t border-ws-line-soft pt-4">
              <Question small>Which kind?</Question>
              <div className="grid gap-2 sm:grid-cols-2">
                {offer.accommodation.map((a) => (
                  <Choice
                    key={a.code}
                    selected={accType === a.code}
                    onSelect={() => setAccType(a.code)}
                    title={a.name}
                  >
                    {a.isCasaManaged ? 'CASA managed' : undefined}
                  </Choice>
                ))}
              </div>

              {accType ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Room" htmlFor="acc-room">
                    <Select
                      id="acc-room"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                    >
                      <option value="">Not specified</option>
                      {offer.roomTypes.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Catering" htmlFor="acc-catering">
                    <Select
                      id="acc-catering"
                      value={catering}
                      onChange={(e) => setCatering(e.target.value)}
                    >
                      <option value="">Not specified</option>
                      {offer.catering.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="From" htmlFor="acc-from">
                    <Input
                      id="acc-from"
                      type="date"
                      value={accFrom}
                      onChange={(e) => setAccFrom(e.target.value)}
                    />
                  </Field>
                  <Field label="Until" htmlFor="acc-to">
                    <Input
                      id="acc-to"
                      type="date"
                      value={accTo}
                      onChange={(e) => setAccTo(e.target.value)}
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
          <dl className="divide-y divide-ws-line-soft rounded-lg border border-ws-line">
            {summaryRows({
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

          <OptionalSection requires={['personId']} heading="Status, payer and notes" alwaysOpen>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" htmlFor="review-status">
                <Select id="review-status" name="status" defaultValue="reserved">
                  <option value="reserved">Reserved</option>
                  <option value="confirmed">Confirmed</option>
                </Select>
              </Field>
              <Field label="Who pays" htmlFor="review-payer">
                <Select id="review-payer" name="payer" defaultValue="self">
                  <option value="self">Learner</option>
                  <option value="agency">Agency</option>
                  <option value="company">Company</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </div>
            <Field label="Payer name" htmlFor="review-payer-name">
              <Input id="review-payer-name" name="payerName" maxLength={120} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={includeFee}
                onChange={(e) => setIncludeFee(e.target.checked)}
                className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
              />
              Charge the enrolment fee
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="visaRequired"
                className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
              />
              Visa required
            </label>
            <Field label="Notes" htmlFor="review-notes">
              <Textarea id="review-notes" name="notes" rows={2} />
            </Field>
          </OptionalSection>

          <div className="flex items-center justify-between gap-3 border-t border-ws-line-soft pt-4">
            <Button type="button" variant="ghost" onClick={() => go(-1)}>
              Back
            </Button>
            <Button type="submit">Create booking</Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-ws-line-soft pt-4">
          <Button type="button" variant="ghost" onClick={() => go(-1)} disabled={index === 0}>
            Back
          </Button>
          <Button type="button" onClick={() => go(1)} disabled={!canAdvance}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

function Question({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return small ? (
    <h4 className="text-xs font-semibold text-[var(--casa-muted)]">{children}</h4>
  ) : (
    <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug">{children}</h3>
  );
}

function Choice({
  selected,
  onSelect,
  title,
  trailing,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  trailing?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
        selected
          ? 'border-[var(--casa-blue)] bg-[var(--casa-blue)]/6'
          : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45 hover:bg-ws-sunk/60'
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--casa-ink)]">{title}</span>
        {children ? (
          <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">{children}</span>
        ) : null}
      </span>
      {trailing ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--casa-ink)]">
          {trailing}
        </span>
      ) : null}
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
function summaryRows({
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
}): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (kind === 'course' && cohort) {
    rows.push({ label: 'Course', value: cohort.label });
    rows.push({
      label: 'Runs for',
      value: `${cohort.weeks} ${cohort.weeks === 1 ? 'week' : 'weeks'}`,
    });
  }
  if (kind === 'exam' && exam) {
    rows.push({ label: 'Exam', value: exam.name });
    rows.push({ label: 'Sitting', value: examParts === 1 ? 'One part' : 'Both parts' });
  }
  if (levelCode) {
    rows.push({
      label: 'Level',
      value:
        levelScope === 'whole' && levelSiblings(levelCode).length > 1
          ? `The whole ${levelBand(levelCode)}`
          : levelCode,
    });
  }
  rows.push({
    label: 'Books',
    value: books.length === 0 ? 'None' : books.map((b) => b.title).join(', '),
  });
  rows.push({
    label: 'Accommodation',
    value: accommodation
      ? [accommodation.name, accFrom && accTo ? `${german(accFrom)} – ${german(accTo)}` : null]
          .filter(Boolean)
          .join(' · ')
      : 'None',
  });

  return rows;
}

const german = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
