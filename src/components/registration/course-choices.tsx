'use client';

import { Fragment } from 'react';
import { PlacementAppointmentDialog } from '@/components/appointments/placement-appointment-dialog';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CalendarDays,
  Clock,
  FileCheck2,
  GraduationCap,
  MessageCircle,
  Moon,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';

import {
  formControlClassName,
  formErrorClassName,
  formFieldGroupClassName,
  formHintClassName,
  formLabelClassName,
  formTileClassName,
  RequiredMark,
} from '@/components/forms/form-styles';
import {
  ChoiceChip,
  choiceLook,
  TermField,
  PillChoices,
  REGISTRATION_TYPES,
  registrationTypeLabels,
  sittingFacts,
  type DateTile,
  type DateTileGroup,
} from '@/components/registration/choice-controls';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import type {
  ContentLocale,
  CourseRegistrationOption,
  RegistrationCourseCatalog,
  RegistrationExamCatalog,
  TermDaytime,
  TermSchedule,
} from '@/lib/content/types';
import { isSecondHalf } from '@/lib/registration/halves';
import { buildLevelPath, continuationLevels, pathWeeks } from '@/lib/registration/level-path';
import { levelChoiceGroups, soldByLevel } from '@/lib/registration/levels';
import { daytimeLabel, formatDay, scheduleLine, termRange, weeksLabel } from '@/lib/registration/term-format';
import { cn } from '@/lib/utils';
import { courseTypeIcons3d, examTypeIcons3d } from '@/config/icons-3d';
import { requiresLevelField } from '@/lib/validation/registration-submissions';

import type { CourseForm } from './course-form-types';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

/*
 * THE COURSE STEP, CALMER (2026-10-05).
 *
 * The step printed each fact two or three times: every date in the start list
 * carried its full day list and time, and a summary card under the fields
 * repeated the start, the schedule and a "4 oder 8 Wochen" that the level had
 * already settled. Now each fact appears once, where it is decided: the level
 * first (it sets the length), a ladder for the levels after it, the start
 * dates as tiles under the one schedule they share, and a single line with
 * what the choices add up to, the end date and the weeks.
 */

const courseIcons: Record<string, LucideIcon> = {
  'intensive-german': Clock,
  'evening-german': Moon,
  'special-courses': MessageCircle,
  'medical-german': Stethoscope,
  bildungszeit: Calendar,
  'german-for-groups': Users,
  'in-company': Briefcase,
  'exam-preparation': FileCheck2,
};

/** Formats whose terms are a whole level: their length comes from the level booked. */
const TERMS_ARE_LEVELS = new Set(['intensive-german']);

/** "Pflege und Medizin, Unterricht für Gruppen und Firmenunterricht". */
function joinNames(names: string[], locale: ContentLocale) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${locale === 'de' ? 'und' : 'and'} ${names[names.length - 1]}`;
}

type LevelLadderProps = {
  name: string;
  /** The level chosen, the ladder's first rung. */
  start: string;
  /** The whole levels after it. */
  targets: string[];
  value: string;
  onChange: (value: string) => void;
  locale: ContentLocale;
};

/** "Bis zu welchem Niveau?": the levels in a row, filled from the chosen one to the one picked. */
function LevelLadder({ name, start, targets, value, onChange, locale }: LevelLadderProps) {
  const { say } = useSiteCopy();
  const rungs = [{ value: '', label: start }, ...targets.map((target) => ({ value: target, label: target }))];
  const reach = Math.max(0, rungs.findIndex((rung) => rung.value === value));

  return (
    <fieldset className={formFieldGroupClassName}>
      <legend className={cn(formLabelClassName, 'mb-2')}>{say(locale, 'Bis zu welchem Niveau?', 'Up to which level?')}</legend>
      <div className="flex flex-wrap items-center gap-y-2">
        {rungs.map((rung, index) => {
          const inPath = index <= reach;
          return (
            <Fragment key={rung.value || 'start'}>
              {index > 0 ? (
                <span aria-hidden="true" className={cn('h-0.5 w-3 sm:w-5', inPath ? 'bg-[var(--casa-accent-surface)]' : 'bg-[color:var(--casa-sand)]')} />
              ) : null}
              <label
                className={cn(
                  'flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-full border px-3.5 text-sm font-bold tabular-nums transition-colors duration-150',
                  choiceLook.focus,
                  inPath
                    ? 'border-[var(--casa-accent-surface)] bg-[var(--casa-accent-surface)] text-white'
                    : 'border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] shadow-[var(--shadow-soft)] hover:border-[color:var(--casa-field-edge-hover)]'
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={rung.value}
                  checked={index === reach}
                  onChange={() => onChange(rung.value)}
                  className="sr-only"
                />
                {index === 0 ? (
                  <>
                    <span className="sr-only">{say(locale, 'Nur ', 'Only ')}</span>
                    {rung.label}
                  </>
                ) : (
                  <>
                    <span className="sr-only">{say(locale, 'bis ', 'up to ')}</span>
                    {rung.label}
                  </>
                )}
              </label>
            </Fragment>
          );
        })}
      </div>
    </fieldset>
  );
}

export type PlanRow = {
  key: string;
  /** "A2 komplett" alone, "A2" or "A2.2" on a path. */
  level: string | null;
  start: string | null;
  end: string | null;
  schedule: TermSchedule | null | undefined;
  scheduleLabel: string | null;
};

export type CoursePlan = { rows: PlanRow[]; weeks: number | null; isPath: boolean };

/**
 * What a course choice adds up to: one row, or one per level of a learning
 * path, each with its dates. Null until there is enough to say when it ends.
 * The summary under the fields and the review step both read it.
 */
export function coursePlan(input: {
  slug: string | undefined;
  options: readonly CourseRegistrationOption[];
  option: CourseRegistrationOption | null;
  level: string;
  pathTo: string;
  locale: ContentLocale;
}): CoursePlan | null {
  const { slug, options, option, level, pathTo, locale } = input;
  if (!option) return null;

  if (slug && TERMS_ARE_LEVELS.has(slug)) {
    if (!level) return null;
    const steps = buildLevelPath({ slug, value: level, option, options, availableLevels: option.availableLevels, pathTo, locale });
    if (steps.length === 0) return null;
    const isPath = steps.length > 1;
    return {
      isPath,
      weeks: pathWeeks(steps),
      rows: steps.map((step, index) => ({
        key: `${step.level}-${index}`,
        level: isPath ? step.level : step.label.split(' · ')[0],
        start: step.start,
        end: step.end,
        schedule: step.option?.schedule,
        scheduleLabel: step.option?.scheduleLabel ?? null,
      })),
    };
  }

  return {
    isPath: false,
    weeks: null,
    // An exam preparation's exam stands where a level would.
    rows: [{ key: option.id, level: level || option.title || null, start: option.startDate, end: option.endDate, schedule: option.schedule, scheduleLabel: option.scheduleLabel }],
  };
}

/** A plan row's dates, or that CASA plans them. */
export function planRowDates(row: PlanRow, locale: ContentLocale) {
  if (!row.start) return locale === 'de' ? 'Den Termin planen wir gemeinsam mit dir' : 'We’ll plan the date together with you';
  return row.end ? termRange(row.start, row.end, locale) : formatDay(row.start, locale);
}

/** A plan row's schedule on one line. */
export const planRowSchedule = (row: PlanRow, locale: ContentLocale) =>
  row.schedule ? scheduleLine(row.schedule, locale) : row.scheduleLabel;

const sameSchedule = (a: TermSchedule | null | undefined, b: TermSchedule | null | undefined) =>
  Boolean(a && b && a.days === b.days && a.time === b.time);

/** The plan under the fields: the end date and the weeks, or a learning path as a short timeline. */
function PlanSummary({ plan, locale }: { plan: CoursePlan; locale: ContentLocale }) {
  const { say } = useSiteCopy();
  const [first] = plan.rows;
  const last = plan.rows[plan.rows.length - 1];
  const weeks = plan.weeks ? weeksLabel(plan.weeks, locale) : null;

  if (!plan.isPath) {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-[var(--casa-canvas)] px-4 py-3 text-sm" aria-live="polite">
        <CalendarDays className="size-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden />
        <span className="font-semibold text-[var(--casa-ink)]">{planRowDates(first, locale)}</span>
        {weeks ? <span className="ml-auto shrink-0 text-[var(--casa-muted)]">{weeks}</span> : null}
      </p>
    );
  }

  const span = first.start && last.end ? termRange(first.start, last.end, locale) : first.start ? `${say(locale, 'ab', 'from')} ${formatDay(first.start, locale)}` : null;

  return (
    <div className="rounded-xl bg-[var(--casa-canvas)] px-4 py-4 sm:px-5" aria-live="polite">
      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-[var(--casa-ink)]">{say(locale, 'Dein Lernweg', 'Your learning path')}</span>
        <span className="text-[var(--casa-muted)]">{[span, weeks].filter(Boolean).join(' · ')}</span>
      </p>
      <ol className="mt-3 space-y-2">
        {plan.rows.map((row) => {
          const otherTime = row.start && !sameSchedule(row.schedule, first.schedule) && row.schedule?.daytime;
          return (
            <li key={row.key} className="flex items-center gap-3 text-sm">
              <span className="flex h-7 min-w-11 shrink-0 items-center justify-center rounded-full bg-white px-2 text-xs font-bold tabular-nums text-[var(--casa-accent-text)] ring-1 ring-[color:var(--casa-sand)]">
                {row.level}
              </span>
              <span className={row.start ? 'text-[var(--casa-ink)]' : 'text-[var(--casa-muted)]'}>
                {row.start ? planRowDates(row, locale) : say(locale, 'Termin folgt', 'Date to follow')}
              </span>
              {otherTime ? <span className="text-[var(--casa-muted)]">· {daytimeLabel(otherTime as TermDaytime, locale)}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const DAYTIME_ORDER: Record<TermDaytime, number> = { morning: 0, fullDay: 1, afternoon: 2, evening: 3 };

/**
 * The terms a level can start in: a term under way only at a second half (`secondHalfOnly`), and a
 * second half on its own first day, or „ab der 5. Kurswoche" where the term does not say it
 * (lib/registration/halves).
 */
export function termsForLevel(options: readonly CourseRegistrationOption[], level: string) {
  const half = isSecondHalf(level);
  return options.filter((option) => half || !option.secondHalfOnly);
}

/**
 * A format's terms for a level, one group per schedule, mornings first. The intensive course's are one
 * group (Rahman, 2026-10-20: „don't define morning and afternoon so we can balance our number of
 * students"): every start in one list, its times said once, and CASA assigns the group.
 */
function termGroups(options: readonly CourseRegistrationOption[], locale: ContentLocale, level: string, slug: string | undefined): DateTileGroup[] {
  const groups = new Map<string, { title?: string; schedule: TermSchedule | null | undefined; label: string; tiles: DateTile[] }>();
  const half = isSecondHalf(level);
  const oneList = soldByLevel(slug);

  if (oneList) {
    const tiles = termsForLevel(options, level)
      .map((option) => ({
        id: option.id,
        date: half ? option.secondHalfStart ?? option.startDate : option.startDate,
        note: half && !option.secondHalfStart ? (locale === 'de' ? 'ab der 5. Kurswoche' : 'from the fifth week') : undefined,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const slots = [...new Map(options.filter((option) => option.schedule).map((option) => [scheduleLine(option.schedule!, locale), option.schedule!])).values()]
      .sort((a, b) => (a.daytime ? DAYTIME_ORDER[a.daytime] : 4) - (b.daytime ? DAYTIME_ORDER[b.daytime] : 4))
      .map((schedule) => (schedule.daytime ? `${daytimeLabel(schedule.daytime, locale)} (${scheduleLine(schedule, locale)})` : scheduleLine(schedule, locale)));
    const meta = slots.length > 1
      ? `${slots.map((slot, i) => (i > 0 ? slot.charAt(0).toLowerCase() + slot.slice(1) : slot)).join(locale === 'de' ? ' oder ' : ' or ')}${locale === 'de' ? ': die Gruppe teilen wir dir zu' : ': we assign your group'}`
      : slots[0];
    return tiles.length > 0 ? [{ key: 'all', meta, tiles }] : [];
  }

  // An exam preparation's terms go under their exam, each with its schedule.
  for (const option of termsForLevel(options, level)) {
    const key = `${option.title ?? ''}|${option.schedule ? `${option.schedule.days}|${option.schedule.time}` : option.scheduleLabel}`;
    const group = groups.get(key) ?? { title: option.title, schedule: option.schedule, label: option.scheduleLabel, tiles: [] };
    const note = half
      ? option.secondHalfStart ? undefined : locale === 'de' ? 'ab der 5. Kurswoche' : 'from the fifth week'
      : option.underway ? (locale === 'de' ? 'läuft bereits' : 'under way') : undefined;
    group.tiles.push({ id: option.id, date: half ? option.secondHalfStart ?? option.startDate : option.startDate, note });
    groups.set(key, group);
  }

  const rank = (schedule: TermSchedule | null | undefined) => (schedule?.daytime ? DAYTIME_ORDER[schedule.daytime] : 4);
  return [...groups.entries()]
    .sort(([, a], [, b]) => rank(a.schedule) - rank(b.schedule) || a.tiles[0].date.localeCompare(b.tiles[0].date))
    .map(([key, group]) => ({
      key,
      title: group.title ?? (group.schedule?.daytime ? daytimeLabel(group.schedule.daytime, locale) : undefined),
      meta: group.schedule ? scheduleLine(group.schedule, locale) : group.label,
      tiles: [...group.tiles].sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

const linkClassName =
  'font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text-hover)] hover:decoration-current';

type CourseItemFieldsProps = {
  form: CourseForm;
  catalog: RegistrationCourseCatalog;
  index: number;
};

/** One course of the registration: which course, at which level, and when it starts. */
export function CourseItemFields({ form, catalog, index }: CourseItemFieldsProps) {
  const locale = catalog.locale;
  const de = locale === 'de';
  const t = (en: string, deText: string) => (de ? deText : en);
  const { watch, setValue, clearErrors, formState } = form;

  const typeId = watch(`courses.${index}.courseTypeId`);
  const instanceId = watch(`courses.${index}.courseInstanceId`);
  const level = watch(`courses.${index}.level`) ?? '';
  const pathTo = watch(`courses.${index}.pathTo`) ?? '';
  const errors = formState.errors.courses?.[index];

  const courseType = catalog.courseTypes.find((candidate) => candidate.id === typeId) ?? null;
  const options = catalog.optionsByCourseTypeId[typeId] ?? [];
  const option = options.find((candidate) => candidate.id === instanceId) ?? null;
  const levels = option?.availableLevels ?? options[0]?.availableLevels ?? [];
  const showLevel = requiresLevelField(courseType?.slug) && levels.length > 0;
  const levelGroups = levelChoiceGroups(courseType?.slug, levels, locale);
  const termIsLevel = Boolean(courseType && TERMS_ARE_LEVELS.has(courseType.slug));
  // The levels to continue to, and what the choices add up to (lib/registration/level-path).
  const continuation = termIsLevel && level ? continuationLevels(courseType?.slug, level, levels) : [];
  const plan = courseType ? coursePlan({ slug: courseType.slug, options, option, level, pathTo, locale }) : null;

  const chooseType = (id: string) => {
    const nextOptions = catalog.optionsByCourseTypeId[id] ?? [];
    const slug = catalog.courseTypes.find((candidate) => candidate.id === id)?.slug;
    setValue(`courses.${index}.courseTypeId`, id, { shouldDirty: true });
    setValue(`courses.${index}.courseInstanceId`, termsForLevel(nextOptions, '')[0]?.id ?? '', { shouldDirty: true });
    setValue(`courses.${index}.level`, '', { shouldDirty: true });
    setValue(`courses.${index}.pathTo`, '', { shouldDirty: true });
    setValue(`courses.${index}.levelRequired`, requiresLevelField(slug) && (nextOptions[0]?.availableLevels.length ?? 0) > 0);
    clearErrors(`courses.${index}`);
  };

  const unavailable = index === 0 ? (catalog.unavailableCourseTypes ?? []).map((item) => item.name) : [];

  return (
    <div className="space-y-6">
      <fieldset id={`course-${index}-type`} tabIndex={-1} className={cn(formFieldGroupClassName, '@container outline-none')}>
        <legend className={cn(formLabelClassName, 'mb-2')}>
          {index === 0 ? t('Which course?', 'Welcher Kurs?') : t('Which other course?', 'Welcher weitere Kurs?')}
          <RequiredMark />
        </legend>
        {/* By the form column's width: three options in two screen-based columns left Bildungszeit alone. */}
        <div className="grid gap-2.5 @[36rem]:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
          {catalog.courseTypes.map((type) => (
            <ChoiceChip
              key={type.id}
              name={`course-${index}-type`}
              value={type.id}
              checked={type.id === typeId}
              icon={courseIcons[type.slug] ?? GraduationCap}
              icon3d={courseTypeIcons3d[type.slug]}
              meaning="courses"
              title={type.name}
              meta={type.lessons_per_week > 0 ? t(`${type.lessons_per_week} lessons a week`, `${type.lessons_per_week} Unterrichtseinheiten pro Woche`) : undefined}
              onSelect={() => chooseType(type.id)}
            />
          ))}
        </div>
        {errors?.courseTypeId ? (
          <p id={`course-${index}-courseTypeId-error`} className={formErrorClassName}>{errors.courseTypeId.message}</p>
        ) : null}
        {unavailable.length > 0 ? (
          <p className={cn(formHintClassName, 'pt-1')}>
            {t(`We offer ${joinNames(unavailable, locale)} on request.`, `${joinNames(unavailable, locale)} bieten wir auf Anfrage an.`)}{' '}
            <Link href="/contact?topic=course-advice" className={linkClassName}>
              {t('Write to us', 'Schreib uns')}
            </Link>
          </p>
        ) : null}
      </fieldset>

      {courseType && showLevel ? (
        <div className={formFieldGroupClassName}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Label htmlFor={`course-${index}-level`} className={formLabelClassName}>
              {t('Level', 'Niveau')}
              <RequiredMark />
            </Label>
            {/*
              The level is the learner's own call, so the field hands them the way
              to find out: the placement page with the Klett online tests (CASA's
              own test is in development, see src/lib/placement/availability.ts).
              A new tab, because the wizard keeps no draft.
            */}
            <Link href="/placement-test" target="_blank" rel="noopener" className={cn(linkClassName, 'tap-target text-sm')}>
              {t('Free placement test', 'Kostenloser Einstufungstest')}
              {/* An icon, not the ↗ character: Firefox drew it from another font, smaller and heavier. */}
              <ArrowRight aria-hidden="true" className="ml-1 inline size-3.5 -rotate-45 align-[-0.1em]" />
              <span className="sr-only">{t(' (opens in a new tab)', ' (öffnet in einem neuen Tab)')}</span>
            </Link>
          </div>
          <Select
            value={level || ''}
            onValueChange={(value) => {
              setValue(`courses.${index}.level`, value, { shouldDirty: true });
              // A term under way is open only at a second half: off a `.2`, the start moves to one that is not.
              const open = termsForLevel(options, value);
              if (!open.some((candidate) => candidate.id === instanceId)) {
                setValue(`courses.${index}.courseInstanceId`, open[0]?.id ?? '', { shouldDirty: true });
              }
              // A path ends where it ended, if the new level can still reach it.
              if (pathTo && !continuationLevels(courseType?.slug, value, levels).includes(pathTo)) {
                setValue(`courses.${index}.pathTo`, '', { shouldDirty: true });
              }
              clearErrors(`courses.${index}.level`);
            }}
          >
            <SelectTrigger
              id={`course-${index}-level`}
              aria-required
              aria-invalid={Boolean(errors?.level)}
              aria-describedby={`course-${index}-level-help${errors?.level ? ` course-${index}-level-error` : ''}`}
              className={formControlClassName}
            >
              <SelectValue placeholder={t('Choose a level…', 'Niveau auswählen…')} />
            </SelectTrigger>
            <SelectContent>
              {levelGroups.map((group, groupIndex) => (
                <Fragment key={group.level}>
                  {groupIndex > 0 ? <SelectSeparator /> : null}
                  <SelectGroup>
                    {group.choices.map((choice) => {
                      const [name, length] = choice.label.split(' · ');
                      return (
                        <SelectItem key={choice.value} value={choice.value}>
                          <span>{name}</span>
                          {length ? <span className="text-[var(--casa-muted)]"> · {length}</span> : null}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </Fragment>
              ))}
            </SelectContent>
          </Select>
          <p id={`course-${index}-level-help`} className={formHintClassName}>
            {t(
              'New to German? Start with an A1 course; you don’t need a test. Otherwise, take the test and email your result to online@casa-bremen.de. Then return to this form; we’ll check your level.',
              'Noch keine Deutschkenntnisse? Starte mit einem A1-Kurs; du brauchst keinen Test. Mach sonst den Test und schick dein Ergebnis an online@casa-bremen.de. Komm danach zu diesem Formular zurück; wir prüfen dein Niveau.'
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-[var(--casa-muted)]">
            <span>{t('Prefer to visit CASA?', 'Lieber bei CASA vor Ort?')}</span>
            <PlacementAppointmentDialog locale={locale} compact className="h-auto min-h-11 px-0 font-semibold text-[var(--casa-accent-text)] underline underline-offset-4" />
          </div>
          {errors?.level ? <p id={`course-${index}-level-error`} className={formErrorClassName}>{errors.level.message}</p> : null}
        </div>
      ) : null}

      {continuation.length > 0 ? (
        <LevelLadder
          name={`course-${index}-path`}
          start={level}
          targets={continuation}
          value={pathTo}
          onChange={(value) => setValue(`courses.${index}.pathTo`, value, { shouldDirty: true })}
          locale={locale}
        />
      ) : null}

      {courseType ? (
        <TermField
          id={`course-${index}-option`}
          name={`course-${index}-option`}
          legend={termIsLevel ? t('Start', 'Beginn') : t('Dates', 'Termin')}
          groups={termGroups(options, locale, level, courseType?.slug)}
          value={instanceId}
          onChange={(value) => {
            setValue(`courses.${index}.courseInstanceId`, value, { shouldDirty: true });
            clearErrors(`courses.${index}.courseInstanceId`);
          }}
          locale={locale}
          error={errors?.courseInstanceId?.message}
          errorId={`course-${index}-courseInstanceId-error`}
          emptyText={t('There are no dates here that you can book online at the moment.', 'Im Moment gibt es hier keine Termine, die du online buchen kannst.')}
        />
      ) : null}

      {plan ? <PlanSummary plan={plan} locale={locale} /> : null}
    </div>
  );
}

type ExamAddOnProps = {
  form: CourseForm;
  examCatalog: RegistrationExamCatalog;
};

/** An exam booked with the courses (2026-10-05): off until the learner asks for it. */
export function ExamAddOn({ form, examCatalog }: ExamAddOnProps) {
  const locale = examCatalog.locale;
  const de = locale === 'de';
  const t = (en: string, deText: string) => (de ? deText : en);
  const { watch, setValue, clearErrors, formState } = form;

  const examTypes = examCatalog.examTypes.filter((type) => (examCatalog.optionsByExamTypeId[type.id] ?? []).length > 0);
  const enabled = watch('examEnabled');
  const examTypeId = watch('exam.examTypeId') ?? '';
  const sessionId = watch('exam.examSessionId') ?? '';
  const registrationType = watch('exam.registrationType');
  const errors = formState.errors.exam;

  if (examTypes.length === 0) {
    return null;
  }

  const sessions = examCatalog.optionsByExamTypeId[examTypeId] ?? [];
  const session = sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const typeLabels = registrationTypeLabels(locale);

  const chooseExam = (id: string) => {
    setValue('exam.examTypeId', id, { shouldDirty: true });
    setValue('exam.examSessionId', examCatalog.optionsByExamTypeId[id]?.[0]?.id ?? '', { shouldDirty: true });
    clearErrors('exam');
  };

  const toggle = (checked: boolean) => {
    setValue('examEnabled', checked, { shouldDirty: true });
    if (checked && !examTypeId) {
      chooseExam(examTypes[0].id);
    }
    // The full exam, as the exam form starts: a part on its own is the exception.
    if (checked && !registrationType) {
      setValue('exam.registrationType', 'full', { shouldDirty: true });
    }
    if (!checked) {
      clearErrors(['exam', 'officialNameConfirmed', 'examPolicyAccepted']);
    }
  };

  return (
    <div className={formTileClassName}>
      <div className="flex items-start gap-3">
        <Checkbox id="exam-enabled" checked={enabled} onCheckedChange={(checked) => toggle(Boolean(checked))} className="mt-0.5" />
        <Label htmlFor="exam-enabled" className="block cursor-pointer leading-relaxed">
          <span className="block text-sm font-semibold text-[var(--casa-ink)]">{t('Add an exam', 'Prüfung dazubuchen')}</span>
          <span className="mt-0.5 block text-sm font-normal text-[var(--casa-muted)]">{examTypes.map((type) => type.name).join(' · ')}</span>
        </Label>
      </div>

      {enabled ? (
        <div className="mt-5 space-y-6 border-t border-[color:var(--casa-sand)] pt-5">
          <fieldset id="exam-type" tabIndex={-1} className={cn(formFieldGroupClassName, 'outline-none')}>
            <legend className={cn(formLabelClassName, 'mb-2')}>
              {t('Which exam?', 'Welche Prüfung?')}
              <RequiredMark />
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {examTypes.map((type) => (
                <ChoiceChip
                  key={type.id}
                  name="exam-type"
                  value={type.id}
                  checked={type.id === examTypeId}
                  icon={FileCheck2}
                  icon3d={examTypeIcons3d[type.code]}
                  meaning="exams"
                  title={type.name}
                  onSelect={() => chooseExam(type.id)}
                />
              ))}
            </div>
            {errors?.examTypeId ? <p id="exam-type-error" className={formErrorClassName}>{errors.examTypeId.message}</p> : null}
          </fieldset>

          <div className="space-y-2">
            <TermField
              id="exam-session"
              name="exam-session"
              legend={t('Exam date', 'Prüfungstermin')}
              groups={sessions.length > 0 ? [{ key: examTypeId, tiles: sessions.map((item) => ({ id: item.id, date: item.startsAt })) }] : []}
              value={sessionId}
              onChange={(value) => {
                setValue('exam.examSessionId', value, { shouldDirty: true });
                clearErrors('exam.examSessionId');
              }}
              locale={locale}
              error={errors?.examSessionId?.message}
              errorId="exam-session-error"
            />
            {session ? <p className={formHintClassName}>{sittingFacts(session, locale)}</p> : null}
          </div>

          <PillChoices
            id="exam-registration-type"
            name="exam-registration-type"
            legend={t('Type of entry', 'Anmeldeart')}
            options={REGISTRATION_TYPES.map((value) => ({ value, label: typeLabels[value] }))}
            value={registrationType ?? ''}
            onChange={(value) => {
              setValue('exam.registrationType', value as (typeof REGISTRATION_TYPES)[number], { shouldDirty: true });
              clearErrors('exam.registrationType');
            }}
            error={errors?.registrationType?.message}
            errorId="exam-registration-type-error"
          />
        </div>
      ) : null}
    </div>
  );
}
