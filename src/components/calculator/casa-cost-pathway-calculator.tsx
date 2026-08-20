'use client';

import { useMemo, useState, type ReactNode } from 'react';

import {
  CASA_CALCULATOR_PRICING,
  CASA_LEVEL_SEQUENCE,
  type CasaLevel,
} from '@/config/calculator/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  calculateCasaCostPathway,
  type AccommodationType,
  type CasaCalculatorInput,
  type ExamTarget,
  type ExamType,
  type StudyMode,
} from '@/lib/calculator/cost-calculator';
import type { ContentLocale } from '@/lib/content/types';

const SELECT_CLASS_NAME =
  'h-11 w-full rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-3 text-sm shadow-none outline-none transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-4 focus-visible:ring-[var(--casa-blue)]/10 focus-visible:ring-offset-0 focus-visible:outline-none';

const initialState: CasaCalculatorInput = {
  currentLevel: 'A1.1',
  targetLevel: 'B2.1',
  studyMode: 'intensive',
  includeEnrollmentFee: true,
  includeBooks: true,
  booksOverride: null,
  examTarget: 'none',
  includeExamPrep: false,
  examType: 'full',
  accommodationType: 'none',
  accommodationWeeks: 12,
  holidayWeeks: 0,
  includeDeposit: true,
  specialCourseCount: 0,
};

const calculatorCopy = {
  en: {
    pathTitle: 'Course path',
    pathDescription: 'Pick the level you are starting from and the goal you want to price.',
    currentLevel: 'Current level',
    targetLevel: 'Target level',
    studyMode: 'Study mode',
    intensive: 'Intensive',
    evening: 'Evening',
    intensiveMeta: 'Fast daytime route',
    eveningMeta: 'After-work rhythm',
    addOnsTitle: 'Add what applies',
    enrollment: 'Enrollment fee',
    enrollmentMeta: 'One-time registration',
    books: 'Books',
    booksMeta: 'Use the CASA book range unless you know the exact amount.',
    booksOverride: 'Exact book total',
    booksPlaceholder: 'Optional',
    examTarget: 'Exam target',
    examType: 'Exam type',
    none: 'None',
    full: 'Full exam',
    partial: 'Partial exam',
    examPrep: 'Add preparation course',
    stayTitle: 'Stay and extras',
    accommodationType: 'Accommodation',
    noAccommodation: 'No accommodation',
    hostFamily: 'Host family',
    sharedFlat: 'Shared flat',
    accommodationWeeks: 'Weeks',
    holidayWeeks: 'Holiday weeks',
    includeDeposit: 'Show refundable deposit',
    specialCourses: 'Extra special-course modules',
    estimateTitle: 'Your estimate',
    estimateRange: 'Estimated total range',
    estimateTotal: 'Estimated total',
    totalNote: 'Total excludes refundable deposit. CASA confirms the final invoice after registration review.',
    reset: 'Reset',
    duration: 'Duration',
    levelSteps: 'Level steps',
    path: 'Path',
    mode: 'Mode',
    lineItems: {
      tuition: 'Course tuition',
      enrollmentFee: 'Enrollment fee',
      books: 'Books',
      examPrep: 'Exam preparation',
      examFee: 'Exam fee',
      specialCourseFees: 'Special courses',
      accommodationRent: 'Accommodation rent',
      accommodationCommission: 'Placement fee',
      accommodationHolidaySurcharge: 'Holiday surcharge',
      refundableDeposit: 'Refundable deposit',
    },
    priceHints: {
      intensive: 'Intensive: 520 EUR / 4 weeks, 940 EUR / full level',
      evening: 'Evening: 476 EUR / trimester',
      accommodation: 'Housing: 580 EUR / 4 weeks, then 145 EUR / week',
    },
    validationError: 'Target level must be higher than current level.',
    weeks: 'weeks',
    months: 'months',
  },
  de: {
    pathTitle: 'Kursweg',
    pathDescription: 'Wählen Sie Startniveau und Zielniveau für eine schnelle Kostenschätzung.',
    currentLevel: 'Aktuelles Niveau',
    targetLevel: 'Zielniveau',
    studyMode: 'Kursrhythmus',
    intensive: 'Intensiv',
    evening: 'Abendkurs',
    intensiveMeta: 'Schneller Tageskurs',
    eveningMeta: 'Lernen nach der Arbeit',
    addOnsTitle: 'Was soll dazugerechnet werden?',
    enrollment: 'Einschreibegebühr',
    enrollmentMeta: 'Einmalig bei Anmeldung',
    books: 'Lehrmaterial',
    booksMeta: 'Ohne exakten Betrag nutzt der Rechner die CASA-Buchspanne.',
    booksOverride: 'Exakter Buchbetrag',
    booksPlaceholder: 'Optional',
    examTarget: 'Prüfungsziel',
    examType: 'Prüfungstyp',
    none: 'Keine',
    full: 'Gesamtprüfung',
    partial: 'Teilprüfung',
    examPrep: 'Vorbereitungskurs dazurechnen',
    stayTitle: 'Unterkunft und Extras',
    accommodationType: 'Unterkunft',
    noAccommodation: 'Keine Unterkunft',
    hostFamily: 'Gastfamilie',
    sharedFlat: 'WG',
    accommodationWeeks: 'Wochen',
    holidayWeeks: 'Ferienwochen',
    includeDeposit: 'Rückerstattbare Kaution anzeigen',
    specialCourses: 'Zusätzliche Spezialkurs-Module',
    estimateTitle: 'Ihre Schätzung',
    estimateRange: 'Gesamtschätzung als Spanne',
    estimateTotal: 'Gesamtschätzung',
    totalNote: 'Die Summe enthält keine rückerstattbare Kaution. CASA bestätigt die finale Rechnung nach Prüfung der Anmeldung.',
    reset: 'Zurücksetzen',
    duration: 'Dauer',
    levelSteps: 'Niveauschritte',
    path: 'Weg',
    mode: 'Rhythmus',
    lineItems: {
      tuition: 'Kursgebühr',
      enrollmentFee: 'Einschreibegebühr',
      books: 'Lehrmaterial',
      examPrep: 'Prüfungsvorbereitung',
      examFee: 'Prüfungsgebühr',
      specialCourseFees: 'Spezialkurse',
      accommodationRent: 'Unterkunft',
      accommodationCommission: 'Vermittlungsgebühr',
      accommodationHolidaySurcharge: 'Ferienzuschlag',
      refundableDeposit: 'Rückerstattbare Kaution',
    },
    priceHints: {
      intensive: 'Intensiv: 520 EUR / 4 Wochen, 940 EUR / ganzes Niveau',
      evening: 'Abendkurs: 476 EUR / Trimester',
      accommodation: 'Wohnen: 580 EUR / 4 Wochen, danach 145 EUR / Woche',
    },
    validationError: 'Das Zielniveau muss höher sein als das aktuelle Niveau.',
    weeks: 'Wochen',
    months: 'Monate',
  },
} as const;

type CalculatorCopy = (typeof calculatorCopy)[ContentLocale];

type FieldCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type SegmentOption<T extends string> = {
  value: T;
  label: string;
  meta?: string;
};

function FieldCard({ title, description, children }: FieldCardProps) {
  return (
    <section className="space-y-4 rounded-lg border border-[var(--casa-sand)] bg-[var(--casa-bg)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--casa-ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--casa-muted)]">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function parseNullableNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number, locale: ContentLocale) {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency',
    currency: CASA_CALCULATOR_PRICING.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMoneyRange(min: number, max: number, locale: ContentLocale) {
  if (min === max) {
    return formatCurrency(max, locale);
  }

  return `${formatCurrency(min, locale)} - ${formatCurrency(max, locale)}`;
}

function durationLabel(
  duration: { unit: 'weeks' | 'months'; value: number },
  copy: CalculatorCopy
) {
  return `${duration.value} ${duration.unit === 'weeks' ? copy.weeks : copy.months}`;
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-semibold text-[var(--casa-ink)]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`min-h-14 rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] disabled:cursor-not-allowed disabled:opacity-55 ${
                selected
                  ? 'border-[var(--casa-blue)] bg-[color-mix(in_srgb,var(--casa-blue)_10%,var(--casa-bg))] text-[var(--casa-ink)] shadow-xs'
                  : 'border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] text-[var(--casa-ink)] hover:border-[color:var(--casa-muted)] hover:text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)]'
              }`}
            >
              <span className="block font-bold">{option.label}</span>
              {option.meta ? <span className="mt-0.5 block text-xs">{option.meta}</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ToggleLine({
  id,
  checked,
  onCheckedChange,
  label,
  meta,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  meta?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] p-3 transition-colors hover:bg-[var(--casa-canvas)]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 rounded-sm border-[color:var(--casa-sand)] text-[var(--casa-accent-text)] accent-[var(--casa-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {meta ? <p className="text-sm text-[var(--casa-muted)]">{meta}</p> : null}
      </div>
    </div>
  );
}

export function CasaCostPathwayCalculator({ locale = 'en' }: { locale?: ContentLocale }) {
  const copy = calculatorCopy[locale];
  const [formState, setFormState] = useState<CasaCalculatorInput>(initialState);
  const [booksOverrideInput, setBooksOverrideInput] = useState('');

  const derivedInput = useMemo<CasaCalculatorInput>(
    () => ({
      ...formState,
      booksOverride: parseNullableNumber(booksOverrideInput),
      accommodationWeeks: Math.max(0, Math.floor(formState.accommodationWeeks)),
      holidayWeeks: Math.max(0, Math.floor(formState.holidayWeeks)),
      specialCourseCount: Math.max(0, Math.floor(formState.specialCourseCount)),
    }),
    [booksOverrideInput, formState]
  );

  const result = useMemo(() => calculateCasaCostPathway(derivedInput), [derivedInput]);

  function updateField<K extends keyof CasaCalculatorInput>(
    key: K,
    value: CasaCalculatorInput[K]
  ) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function updateNumericField<K extends keyof CasaCalculatorInput>(key: K, rawValue: string) {
    const parsed = Number(rawValue);
    updateField(key, (Number.isFinite(parsed) ? parsed : 0) as CasaCalculatorInput[K]);
  }

  function resetDefaults() {
    setFormState(initialState);
    setBooksOverrideInput('');
  }

  const studyModeOptions: SegmentOption<StudyMode>[] = [
    { value: 'intensive', label: copy.intensive, meta: copy.intensiveMeta },
    { value: 'evening', label: copy.evening, meta: copy.eveningMeta },
  ];

  const examTargetOptions: SegmentOption<ExamTarget>[] = [
    { value: 'none', label: copy.none },
    { value: 'telcB2', label: 'telc B2' },
    { value: 'telcC1', label: 'telc C1 Hochschule' },
  ];

  const examTypeOptions: SegmentOption<ExamType>[] = [
    { value: 'full', label: copy.full },
    { value: 'partial', label: copy.partial },
  ];

  const accommodationOptions: SegmentOption<AccommodationType>[] = [
    { value: 'none', label: copy.noAccommodation },
    { value: 'hostFamily', label: copy.hostFamily },
    { value: 'sharedFlat', label: copy.sharedFlat },
  ];

  const showBooksRange =
    derivedInput.includeBooks &&
    derivedInput.booksOverride === null &&
    result.breakdown.books.isRange;

  const lineItems = useMemo(
    () =>
      [
        {
          key: copy.lineItems.tuition,
          value: formatCurrency(result.breakdown.tuition, locale),
          show: result.isValid,
        },
        {
          key: copy.lineItems.enrollmentFee,
          value: formatCurrency(result.breakdown.enrollmentFee, locale),
          show: result.breakdown.enrollmentFee > 0,
        },
        {
          key: copy.lineItems.books,
          value: result.breakdown.books.isRange
            ? formatMoneyRange(result.breakdown.books.min, result.breakdown.books.max, locale)
            : formatCurrency(result.breakdown.books.exact ?? 0, locale),
          show: result.breakdown.books.max > 0,
        },
        {
          key: copy.lineItems.examPrep,
          value: formatCurrency(result.breakdown.examPrep, locale),
          show: result.breakdown.examPrep > 0,
        },
        {
          key: copy.lineItems.examFee,
          value: formatCurrency(result.breakdown.examFee, locale),
          show: result.breakdown.examFee > 0,
        },
        {
          key: copy.lineItems.accommodationRent,
          value: formatCurrency(result.breakdown.accommodationRent, locale),
          show: result.breakdown.accommodationRent > 0,
        },
        {
          key: copy.lineItems.accommodationCommission,
          value: formatCurrency(result.breakdown.accommodationCommission, locale),
          show: result.breakdown.accommodationCommission > 0,
        },
        {
          key: copy.lineItems.accommodationHolidaySurcharge,
          value: formatCurrency(result.breakdown.accommodationHolidaySurcharge, locale),
          show: result.breakdown.accommodationHolidaySurcharge > 0,
        },
        {
          key: copy.lineItems.specialCourseFees,
          value: formatCurrency(result.breakdown.specialCourseFees, locale),
          show: result.breakdown.specialCourseFees > 0,
        },
      ].filter((item) => item.show),
    [copy.lineItems, locale, result]
  );

  const totalLabel = showBooksRange ? copy.estimateRange : copy.estimateTotal;
  const totalValue = showBooksRange
    ? formatMoneyRange(result.breakdown.totalMin, result.breakdown.totalMax, locale)
    : formatCurrency(result.breakdown.totalMax, locale);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <div className="space-y-5">
        <FieldCard title={copy.pathTitle} description={copy.pathDescription}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current-level">{copy.currentLevel}</Label>
              <select
                id="current-level"
                className={SELECT_CLASS_NAME}
                value={formState.currentLevel}
                onChange={(event) => updateField('currentLevel', event.target.value as CasaLevel)}
              >
                {CASA_LEVEL_SEQUENCE.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-level">{copy.targetLevel}</Label>
              <select
                id="target-level"
                className={SELECT_CLASS_NAME}
                value={formState.targetLevel}
                onChange={(event) => updateField('targetLevel', event.target.value as CasaLevel)}
              >
                {CASA_LEVEL_SEQUENCE.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SegmentedControl
            label={copy.studyMode}
            value={formState.studyMode}
            options={studyModeOptions}
            onChange={(value) => updateField('studyMode', value)}
          />

          <div className="grid gap-2 text-xs font-semibold text-[var(--casa-muted)] md:grid-cols-3">
            <p className="rounded-xl bg-[var(--casa-warm-soft)]/35 px-3 py-2">{copy.priceHints.intensive}</p>
            <p className="rounded-xl bg-[var(--casa-warm-soft)]/35 px-3 py-2">{copy.priceHints.evening}</p>
            <p className="rounded-xl bg-[var(--casa-warm-soft)]/35 px-3 py-2">{copy.priceHints.accommodation}</p>
          </div>
        </FieldCard>

        <FieldCard title={copy.addOnsTitle}>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleLine
              id="include-enrollment-fee"
              checked={formState.includeEnrollmentFee}
              onCheckedChange={(checked) => updateField('includeEnrollmentFee', checked)}
              label={`${copy.enrollment} (${formatCurrency(CASA_CALCULATOR_PRICING.enrollmentFee, locale)})`}
              meta={copy.enrollmentMeta}
            />
            <ToggleLine
              id="include-books"
              checked={formState.includeBooks}
              onCheckedChange={(checked) => updateField('includeBooks', checked)}
              label={copy.books}
              meta={copy.booksMeta}
            />
          </div>

          {formState.includeBooks ? (
            <div className="max-w-sm space-y-2">
              <Label htmlFor="books-override">{copy.booksOverride}</Label>
              <Input
                id="books-override"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={booksOverrideInput}
                onChange={(event) => setBooksOverrideInput(event.target.value)}
                placeholder={copy.booksPlaceholder}
                className="h-11 bg-[var(--casa-surface-wash)] border-[color:var(--casa-sand)] focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-[var(--casa-blue)]/20"
              />
            </div>
          ) : null}

          <SegmentedControl
            label={copy.examTarget}
            value={formState.examTarget}
            options={examTargetOptions}
            onChange={(value) => updateField('examTarget', value)}
          />

          {formState.examTarget !== 'none' ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <SegmentedControl
                label={copy.examType}
                value={formState.examType}
                options={examTypeOptions}
                onChange={(value) => updateField('examType', value)}
              />
              <ToggleLine
                id="include-exam-prep"
                checked={formState.includeExamPrep}
                onCheckedChange={(checked) => updateField('includeExamPrep', checked)}
                label={copy.examPrep}
              />
            </div>
          ) : null}
        </FieldCard>

        <FieldCard title={copy.stayTitle}>
          <SegmentedControl
            label={copy.accommodationType}
            value={formState.accommodationType}
            options={accommodationOptions}
            onChange={(value) => updateField('accommodationType', value)}
          />

          {formState.accommodationType !== 'none' ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="accommodation-weeks">{copy.accommodationWeeks}</Label>
                <Input
                  id="accommodation-weeks"
                  type="number"
                  min={0}
                  value={formState.accommodationWeeks}
                  onChange={(event) => updateNumericField('accommodationWeeks', event.target.value)}
                  className="h-11 bg-[var(--casa-surface-wash)] border-[color:var(--casa-sand)] focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-[var(--casa-blue)]/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday-weeks">{copy.holidayWeeks}</Label>
                <Input
                  id="holiday-weeks"
                  type="number"
                  min={0}
                  value={formState.holidayWeeks}
                  onChange={(event) => updateNumericField('holidayWeeks', event.target.value)}
                  className="h-11 bg-[var(--casa-surface-wash)] border-[color:var(--casa-sand)] focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-[var(--casa-blue)]/20"
                />
              </div>
              <ToggleLine
                id="include-deposit"
                checked={formState.includeDeposit}
                onCheckedChange={(checked) => updateField('includeDeposit', checked)}
                label={copy.includeDeposit}
              />
            </div>
          ) : null}

          <div className="max-w-sm space-y-2">
            <Label htmlFor="special-course-count">{copy.specialCourses}</Label>
            <Input
              id="special-course-count"
              type="number"
              min={0}
              value={formState.specialCourseCount}
              onChange={(event) => updateNumericField('specialCourseCount', event.target.value)}
              className="h-11 bg-[var(--casa-surface-wash)] border-[color:var(--casa-sand)] focus-visible:bg-white focus-visible:border-[var(--casa-blue)] focus-visible:ring-[var(--casa-blue)]/20"
            />
          </div>
        </FieldCard>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-28">
        <section className="space-y-4 rounded-lg border border-[var(--casa-sand)] bg-[var(--casa-bg)] p-5 shadow-[var(--shadow-card)]">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--casa-ink)]">{copy.estimateTitle}</h2>
            {result.isValid ? (
              <div className="rounded-lg bg-[var(--casa-ink-deep)] px-4 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-white/70">{totalLabel}</p>
                <p className="mt-1 text-2xl font-black tracking-tight">{totalValue}</p>
              </div>
            ) : (
              <p className="rounded-lg border border-[color:var(--casa-danger-surface)]/30 bg-[var(--casa-danger-surface)]/5 px-3 py-2 text-sm text-[var(--casa-danger-text)]">
                {copy.validationError}
              </p>
            )}
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-lg border border-[color:var(--casa-sand)] bg-white px-3 py-2 shadow-xs">
              <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.path}</dt>
              <dd className="font-semibold text-[var(--casa-ink)]">
                {derivedInput.currentLevel} - {derivedInput.targetLevel}
              </dd>
            </div>
            <div className="rounded-lg border border-[color:var(--casa-sand)] bg-white px-3 py-2 shadow-xs">
              <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.duration}</dt>
              <dd className="font-semibold text-[var(--casa-ink)]">{durationLabel(result.duration, copy)}</dd>
            </div>
            <div className="rounded-lg border border-[color:var(--casa-sand)] bg-white px-3 py-2 shadow-xs">
              <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.mode}</dt>
              <dd className="font-semibold text-[var(--casa-ink)]">
                {derivedInput.studyMode === 'intensive' ? copy.intensive : copy.evening}
              </dd>
            </div>
          </dl>

          {lineItems.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-[color:var(--casa-sand)] bg-white">
              <dl className="divide-y divide-[color:var(--casa-sand)]/70 text-sm">
                {lineItems.map((item, index) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-4 px-3 py-2.5 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[var(--casa-surface-wash)]'
                    }`}
                  >
                    <dt className="min-w-0 text-[var(--casa-muted)]">{item.key}</dt>
                    <dd className="shrink-0 font-semibold text-[var(--casa-ink)]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {result.breakdown.refundableDeposit > 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--casa-sand)] bg-white px-3 py-2.5 text-sm">
              <span className="text-[var(--casa-muted)]">{copy.lineItems.refundableDeposit}</span>
              <span className="font-semibold text-[var(--casa-accent-text)]">
                {formatCurrency(result.breakdown.refundableDeposit, locale)}
              </span>
            </div>
          ) : null}

          <p className="text-xs leading-relaxed text-[var(--casa-muted)]">{copy.totalNote}</p>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-lg border-[color:var(--casa-sand)] bg-white hover:bg-[var(--casa-canvas)] text-[var(--casa-ink)]"
            onClick={resetDefaults}
          >
            {copy.reset}
          </Button>
        </section>
      </aside>
    </div>
  );
}
