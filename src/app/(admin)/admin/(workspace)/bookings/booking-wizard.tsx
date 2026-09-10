'use client';

import { useMemo, useState } from 'react';

import { Badge, Button, Field, Input, Select, Textarea } from '@/components/admin/ui';
import {
  levelBand,
  levelSiblings,
  type BookingOffer,
  type CohortOffer,
} from '@/lib/admin/booking-offer-types';
import { cn } from '@/lib/utils';
import { toDateInputValue } from '@/lib/dates';

/**
 * The booking wizard.
 *
 * One question at a time, each answer narrowing the next: what kind of course,
 * which one of those, which level, books, accommodation, then a review. The
 * shape follows how a colleague actually asks a learner — "what do you want to
 * do?" before "which dates?" — rather than presenting a form with every field
 * on it, which is the FileMaker layout this replaces.
 *
 * PRICES COME FROM THE SETUP, NOT FROM TYPING. Choosing a cohort brings its
 * price; choosing a level and answering yes to books adds the right books for
 * that level, one per half. The totals here are a PREVIEW — the server
 * re-resolves every rate-backed line when the booking is created, so nothing a
 * browser sends can invent a price. Where CASA has published no rate yet
 * (tuition, accommodation) the amount is a staff-agreed figure and stays
 * editable on the review step.
 */

type Step = 'what' | 'course' | 'level' | 'accommodation' | 'review';

const STEPS: readonly { key: Step; label: string }[] = [
  { key: 'what', label: 'What' },
  { key: 'course', label: 'Which' },
  { key: 'level', label: 'Level & books' },
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'review', label: 'Review' },
];

type Line = { key: string; label: string; detail?: string; amount: number | null };

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
  const [accAmount, setAccAmount] = useState<string>('');

  const [tuition, setTuition] = useState<string>('');
  const [includeFee, setIncludeFee] = useState(true);

  const exam = offer.exams.find((e) => e.id === examTypeId) ?? null;

  /** The books for the chosen level: both halves, or just this one. */
  const books = useMemo(() => {
    if (!levelCode) return [];
    const codes = levelScope === 'whole' ? levelSiblings(levelCode) : [levelCode];
    return offer.materials.filter((m) => m.levelCode && codes.includes(m.levelCode));
  }, [levelCode, levelScope, offer.materials]);

  const chosenBooks = books.filter((b) => !excludedBooks.has(b.id));

  const lines = useMemo<Line[]>(() => {
    const out: Line[] = [];
    if (includeFee && offer.enrolmentFee !== null) {
      out.push({ key: 'fee', label: 'Enrolment fee', amount: offer.enrolmentFee });
    }
    if (kind === 'course' && cohort) {
      const typed = tuition.trim() === '' ? cohort.tuition : Number(tuition.replace(',', '.'));
      out.push({
        key: 'tuition',
        label: cohort.label,
        detail: `${cohort.weeks} ${cohort.weeks === 1 ? 'week' : 'weeks'}`,
        amount: Number.isFinite(typed as number) ? (typed as number) : null,
      });
    }
    if (kind === 'exam' && exam) {
      out.push({
        key: 'exam',
        label: exam.name,
        detail: examParts === 1 ? 'one part' : 'both parts',
        amount: examParts === 1 ? exam.feeOnePart : exam.feeBothParts,
      });
    }
    if (wantsBooks) {
      for (const book of chosenBooks) {
        out.push({ key: `book-${book.id}`, label: book.title, amount: book.price });
      }
    }
    if (wantsAccommodation && accType) {
      const name = offer.accommodation.find((a) => a.code === accType)?.name ?? 'Accommodation';
      const amount = accAmount.trim() === '' ? null : Number(accAmount.replace(',', '.'));
      out.push({
        key: 'accommodation',
        label: name,
        detail: [
          offer.roomTypes.find((r) => r.code === roomType)?.name,
          offer.catering.find((c) => c.code === catering)?.name,
        ]
          .filter(Boolean)
          .join(', '),
        amount: Number.isFinite(amount as number) ? (amount as number) : null,
      });
    }
    return out;
  }, [
    includeFee,
    offer,
    kind,
    cohort,
    tuition,
    exam,
    examParts,
    wantsBooks,
    chosenBooks,
    wantsAccommodation,
    accType,
    roomType,
    catering,
    accAmount,
  ]);

  const total = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const unpriced = lines.filter((line) => line.amount === null);

  const money = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: offer.currency }).format(n);

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
                    trailing={e.feeBothParts !== null ? money(e.feeBothParts) : undefined}
                  >
                    {e.feeOnePart !== null ? `${money(e.feeOnePart)} for a single part` : undefined}
                  </Choice>
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
                        setTuition('');
                        if (c.levelCode) setLevelCode(c.levelCode);
                      }}
                      title={c.label}
                      trailing={c.tuition !== null ? money(c.tuition) : 'price not set'}
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
                      <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
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
                        <span className="shrink-0 text-sm tabular-nums">
                          {b.price !== null ? money(b.price) : '—'}
                        </span>
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
                  <Field
                    label="Amount"
                    hint="no published rate yet"
                    htmlFor="acc-amount"
                    className="sm:col-span-2"
                  >
                    <Input
                      id="acc-amount"
                      inputMode="decimal"
                      value={accAmount}
                      onChange={(e) => setAccAmount(e.target.value)}
                      className="text-right"
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
          <input
            type="hidden"
            name="accommodationAmount"
            value={wantsAccommodation ? accAmount : ''}
          />

          <ul className="divide-y divide-ws-line-soft rounded-lg border border-ws-line">
            {lines.map((line) => (
              <li key={line.key} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{line.label}</span>
                  {line.detail ? (
                    <span className="block text-xs text-[var(--casa-text-subtle)]">
                      {line.detail}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {line.amount !== null ? (
                    money(line.amount)
                  ) : (
                    <Badge tone="warning">no price</Badge>
                  )}
                </span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 bg-ws-sunk px-3 py-2.5">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-semibold tabular-nums">{money(total)}</span>
            </li>
          </ul>

          {kind === 'course' && cohort ? (
            <Field
              label="Course fee"
              hint={cohort.tuition !== null ? 'from the catalogue' : 'no published rate'}
              htmlFor="review-tuition"
            >
              <Input
                id="review-tuition"
                name="tuitionAmount"
                inputMode="decimal"
                value={tuition === '' ? (cohort.tuition?.toFixed(2) ?? '') : tuition}
                onChange={(e) => setTuition(e.target.value)}
                className="text-right"
              />
            </Field>
          ) : null}

          {unpriced.length > 0 ? (
            <p className="text-xs text-[var(--casa-warning-text)]">
              {unpriced.length} {unpriced.length === 1 ? 'line has' : 'lines have'} no price. Set it
              here, or add the rate under Settings.
            </p>
          ) : null}

          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]">
              <span className="group-open:hidden">More</span>
              <span className="hidden group-open:inline">Less</span>
            </summary>
            <div className="mt-3 space-y-3">
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
            </div>
          </details>

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
          <span className="flex items-center gap-3">
            {total > 0 ? (
              <span className="text-sm text-[var(--casa-text-subtle)]">
                Running total{' '}
                <span className="font-semibold text-[var(--casa-ink)] tabular-nums">
                  {money(total)}
                </span>
              </span>
            ) : null}
            <Button type="button" onClick={() => go(1)} disabled={!canAdvance}>
              Continue
            </Button>
          </span>
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
