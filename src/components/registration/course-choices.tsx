'use client';

import {
  Briefcase,
  Calendar,
  CheckCircle2,
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
  formMetaLabelClassName,
  formTileClassName,
  RequiredMark,
} from '@/components/forms/form-styles';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { meaningClasses, type Meaning } from '@/config/brand/meaning';
import { Link } from '@/i18n/navigation';
import type { ContentLocale, RegistrationCourseCatalog, RegistrationExamCatalog } from '@/lib/content/types';
import { levelChoiceGroups } from '@/lib/registration/levels';
import { cn } from '@/lib/utils';
import { requiresLevelField } from '@/lib/validation/registration-submissions';

import type { CourseForm } from './course-form-types';

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

/** Formats whose terms are a whole level: their dates read as a start and a length. */
const TERMS_ARE_LEVELS = new Set(['intensive-german']);

const formatStart = (iso: string, locale: ContentLocale) =>
  new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' })
    .format(new Date(`${iso}T12:00:00Z`));

/**
 * A course's dates in one line: a start and a length for a format whose terms
 * are a whole level ("Beginn 26. Okt. 2026 · 8 Wochen"), else its date range.
 */
export function courseDatesLine(
  slug: string | undefined,
  option: { startDate: string; dateRangeLabel: string },
  level: { complete: boolean } | null,
  locale: ContentLocale
) {
  if (!slug || !TERMS_ARE_LEVELS.has(slug)) return option.dateRangeLabel;
  const start = `${locale === 'de' ? 'Beginn' : 'Starts'} ${formatStart(option.startDate, locale)}`;
  if (!level) return start;
  return `${start} · ${level.complete ? (locale === 'de' ? '8 Wochen' : '8 weeks') : (locale === 'de' ? '4 Wochen' : '4 weeks')}`;
}

/** "Pflege und Medizin, Unterricht für Gruppen und Firmenunterricht". */
function joinNames(names: string[], locale: ContentLocale) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${locale === 'de' ? 'und' : 'and'} ${names[names.length - 1]}`;
}

type ChoiceChipProps = {
  name: string;
  value: string;
  checked: boolean;
  icon: LucideIcon;
  meaning: Meaning;
  title: string;
  meta?: string;
  onSelect: () => void;
};

/** One choice as a chip, the contact form's "Worum geht es?": a native radio, so arrow keys move between them. */
function ChoiceChip({ name, value, checked, icon: Icon, meaning, title, meta, onSelect }: ChoiceChipProps) {
  return (
    <label
      className={cn(
        'relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-150',
        'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--casa-blue)]/20',
        checked
          ? 'border-[var(--casa-accent-text)] bg-[var(--casa-blue-tint)]/45 shadow-[inset_0_0_0_1px_var(--casa-accent-text)]'
          : 'border-[color:var(--casa-sand)] shadow-[var(--shadow-soft)] hover:border-[color:var(--casa-field-edge-hover)]'
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', meaningClasses[meaning].circle)}>
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>
      <span className="min-w-0 leading-snug">
        <span className="block text-sm font-semibold text-[var(--casa-ink)]">{title}</span>
        {meta ? <span className="block text-xs text-[var(--casa-muted)]">{meta}</span> : null}
      </span>
      {checked ? <CheckCircle2 className="ml-auto size-4 shrink-0 text-[var(--casa-accent-text)]" aria-hidden /> : null}
    </label>
  );
}

type CourseItemFieldsProps = {
  form: CourseForm;
  catalog: RegistrationCourseCatalog;
  index: number;
};

/** One course of the registration: which course, when it starts, and at which level. */
export function CourseItemFields({ form, catalog, index }: CourseItemFieldsProps) {
  const locale = catalog.locale;
  const de = locale === 'de';
  const t = (en: string, deText: string) => (de ? deText : en);
  const { watch, setValue, clearErrors, formState } = form;

  const typeId = watch(`courses.${index}.courseTypeId`);
  const instanceId = watch(`courses.${index}.courseInstanceId`);
  const level = watch(`courses.${index}.level`);
  const errors = formState.errors.courses?.[index];

  const courseType = catalog.courseTypes.find((candidate) => candidate.id === typeId) ?? null;
  const options = catalog.optionsByCourseTypeId[typeId] ?? [];
  const option = options.find((candidate) => candidate.id === instanceId) ?? null;
  const levels = option?.availableLevels ?? options[0]?.availableLevels ?? [];
  const showLevel = requiresLevelField(courseType?.slug) && levels.length > 0;
  const levelGroups = levelChoiceGroups(courseType?.slug, levels, locale);
  const termIsLevel = Boolean(courseType && TERMS_ARE_LEVELS.has(courseType.slug));
  const chosenLevel = levelGroups.flatMap((group) => group.choices.map((choice) => ({ ...choice, whole: choice.value === group.level })))
    .find((choice) => choice.value === level);

  const errorProps = (field: 'courseTypeId' | 'courseInstanceId' | 'level') => ({
    'aria-invalid': Boolean(errors?.[field]),
    'aria-describedby': errors?.[field] ? `course-${index}-${field}-error` : undefined,
  });

  const chooseType = (id: string) => {
    const nextOptions = catalog.optionsByCourseTypeId[id] ?? [];
    const slug = catalog.courseTypes.find((candidate) => candidate.id === id)?.slug;
    setValue(`courses.${index}.courseTypeId`, id, { shouldDirty: true });
    setValue(`courses.${index}.courseInstanceId`, nextOptions[0]?.id ?? '', { shouldDirty: true });
    setValue(`courses.${index}.level`, '', { shouldDirty: true });
    setValue(`courses.${index}.levelRequired`, requiresLevelField(slug) && (nextOptions[0]?.availableLevels.length ?? 0) > 0);
    clearErrors(`courses.${index}`);
  };

  const unavailable = index === 0 ? (catalog.unavailableCourseTypes ?? []).map((item) => item.name) : [];

  return (
    <div className="space-y-5">
      <fieldset id={`course-${index}-type`} tabIndex={-1} className={cn(formFieldGroupClassName, 'min-w-0')}>
        <legend className={cn(formLabelClassName, 'mb-2')}>
          {index === 0 ? t('Which course?', 'Welcher Kurs?') : t('Which other course?', 'Welcher weitere Kurs?')}
          <RequiredMark />
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {catalog.courseTypes.map((type) => (
            <ChoiceChip
              key={type.id}
              name={`course-${index}-type`}
              value={type.id}
              checked={type.id === typeId}
              icon={courseIcons[type.slug] ?? GraduationCap}
              meaning="courses"
              title={type.name}
              meta={type.lessons_per_week > 0 ? t(`${type.lessons_per_week} lessons a week`, `${type.lessons_per_week} Lektionen pro Woche`) : undefined}
              onSelect={() => chooseType(type.id)}
            />
          ))}
        </div>
        {errors?.courseTypeId ? (
          <p id={`course-${index}-courseTypeId-error`} className={formErrorClassName}>{errors.courseTypeId.message}</p>
        ) : null}
        {unavailable.length > 0 ? (
          <p className={cn(formHintClassName, 'pt-1')}>
            {t(
              `${joinNames(unavailable, locale)}: no dates to book online right now. `,
              `${joinNames(unavailable, locale)}: derzeit keine Termine zum Online-Buchen. `
            )}
            <Link
              href="/contact"
              className="font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 hover:decoration-current"
            >
              {t('Ask us about it', 'Fragen Sie uns gern')}
            </Link>
          </p>
        ) : null}
      </fieldset>

      {courseType ? (
        <div className={cn('grid gap-5', showLevel && 'sm:grid-cols-2')}>
          <div className={formFieldGroupClassName}>
            <Label htmlFor={`course-${index}-option`} className={formLabelClassName}>
              {termIsLevel ? t('Start', 'Beginn') : t('Dates', 'Termin')}
              <RequiredMark />
            </Label>
            <Select
              value={instanceId || ''}
              onValueChange={(value) => setValue(`courses.${index}.courseInstanceId`, value, { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger id={`course-${index}-option`} aria-required {...errorProps('courseInstanceId')} className={formControlClassName}>
                <SelectValue placeholder={t('Choose a date…', 'Termin auswählen…')} />
              </SelectTrigger>
              <SelectContent>
                {options.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {termIsLevel ? `${formatStart(item.startDate, locale)} · ${item.scheduleLabel}` : item.dateRangeLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.courseInstanceId ? (
              <p id={`course-${index}-courseInstanceId-error`} className={formErrorClassName}>{errors.courseInstanceId.message}</p>
            ) : null}
          </div>

          {showLevel ? (
            <div className={formFieldGroupClassName}>
              <Label htmlFor={`course-${index}-level`} className={formLabelClassName}>
                {t('Level', 'Niveau')}
                <RequiredMark />
              </Label>
              <Select
                value={level || ''}
                onValueChange={(value) => {
                  setValue(`courses.${index}.level`, value, { shouldDirty: true });
                  clearErrors(`courses.${index}.level`);
                }}
              >
                <SelectTrigger id={`course-${index}-level`} aria-required {...errorProps('level')} className={formControlClassName}>
                  <SelectValue placeholder={t('Choose a level…', 'Niveau auswählen…')} />
                </SelectTrigger>
                <SelectContent>
                  {levelGroups.map((group) => (
                    <SelectGroup key={group.level}>
                      {levelGroups.length > 1 ? <SelectLabel>{group.level}</SelectLabel> : null}
                      {group.choices.map((choice) => (
                        <SelectItem key={choice.value} value={choice.value}>
                          {choice.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {errors?.level ? <p id={`course-${index}-level-error`} className={formErrorClassName}>{errors.level.message}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showLevel ? (
        /*
          The level is the learner's own call, so the field hands them the way
          to find out: the placement page with the Klett online tests (CASA's
          own test is in development, see src/lib/placement/availability.ts).
          A new tab, because the wizard keeps no draft.
        */
        <p className={formHintClassName}>
          {t('Not sure which level you are?', 'Unsicher, welches Niveau Sie haben?')}{' '}
          <Link
            href="/placement-test"
            target="_blank"
            rel="noopener"
            className="casa-cta-link font-semibold text-[var(--casa-accent-text)] underline underline-offset-4 decoration-[color:var(--casa-sand)] transition-colors hover:text-[var(--casa-accent-text-hover)] hover:decoration-current"
          >
            {t('Take a free placement test', 'Kostenlosen Einstufungstest machen')}
          </Link>
          {t(' — opens in a new tab, so your details here stay.', ' – öffnet sich in einem neuen Tab, Ihre Angaben hier bleiben erhalten.')}
        </p>
      ) : null}

      {courseType && option ? (
        <div className="relative overflow-hidden rounded-2xl border border-[color:var(--casa-sand)] bg-[var(--casa-canvas)] p-5 sm:p-6">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--casa-red)]" />
          <p className={formMetaLabelClassName}>{t('Your choice', 'Ihre Auswahl')}</p>
          <h3 className="mt-1 text-lg font-bold text-[var(--casa-ink)]">
            {courseType.name}
            {chosenLevel ? <span className="font-normal text-[var(--casa-muted)]"> · {chosenLevel.label.split(' · ')[0]}</span> : null}
          </h3>
          <dl className="mt-4 grid gap-4 border-t border-[color:var(--casa-sand)] pt-4 text-sm sm:grid-cols-2">
            {termIsLevel ? (
              <>
                <div>
                  <dt className={formMetaLabelClassName}>{t('Start', 'Beginn')}</dt>
                  <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{formatStart(option.startDate, locale)}</dd>
                </div>
                <div>
                  <dt className={formMetaLabelClassName}>{t('Length', 'Dauer')}</dt>
                  <dd className="mt-1 font-semibold text-[var(--casa-ink)]">
                    {chosenLevel
                      ? chosenLevel.whole
                        ? t('8 weeks (whole level)', '8 Wochen (komplettes Niveau)')
                        : t('4 weeks (half level)', '4 Wochen (Teilniveau)')
                      : t('4 or 8 weeks, by level', '4 oder 8 Wochen, je nach Niveau')}
                  </dd>
                </div>
              </>
            ) : (
              <div>
                <dt className={formMetaLabelClassName}>{t('Dates', 'Daten')}</dt>
                <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{option.dateRangeLabel}</dd>
              </div>
            )}
            <div className={termIsLevel ? 'sm:col-span-2' : undefined}>
              <dt className={formMetaLabelClassName}>{t('Schedule', 'Zeitplan')}</dt>
              <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{option.scheduleLabel}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

type ExamAddOnProps = {
  form: CourseForm;
  examCatalog: RegistrationExamCatalog;
};

const REGISTRATION_TYPES = ['full', 'written', 'oral'] as const;

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
  const typeLabels: Record<(typeof REGISTRATION_TYPES)[number], string> = {
    full: t('Full exam', 'Vollprüfung'),
    written: t('Written only', 'Nur schriftlich'),
    oral: t('Oral only', 'Nur mündlich'),
  };

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
    if (!checked) {
      clearErrors(['exam', 'officialNameConfirmed', 'examPolicyAccepted']);
    }
  };

  return (
    <div className={formTileClassName}>
      <div className="flex items-start gap-3">
        <Checkbox id="exam-enabled" checked={enabled} onCheckedChange={(checked) => toggle(Boolean(checked))} className="mt-0.5" />
        <Label htmlFor="exam-enabled" className="block cursor-pointer leading-relaxed">
          <span className="block text-sm font-semibold text-[var(--casa-ink)]">{t('Add an exam (optional)', 'Prüfung dazubuchen (optional)')}</span>
          <span className="mt-0.5 block text-sm font-normal text-[var(--casa-muted)]">
            {t(
              `${joinNames(examTypes.map((type) => type.name), locale)} at CASA’s exam centre.`,
              `${joinNames(examTypes.map((type) => type.name), locale)} im Prüfungszentrum von CASA.`
            )}
          </span>
        </Label>
      </div>

      {enabled ? (
        <div className="mt-5 space-y-5 border-t border-[color:var(--casa-sand)] pt-5">
          <fieldset id="exam-type" tabIndex={-1} className={cn(formFieldGroupClassName, 'min-w-0')}>
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
                  meaning="exams"
                  title={type.name}
                  onSelect={() => chooseExam(type.id)}
                />
              ))}
            </div>
            {errors?.examTypeId ? <p id="exam-type-error" className={formErrorClassName}>{errors.examTypeId.message}</p> : null}
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className={formFieldGroupClassName}>
              <Label htmlFor="exam-session" className={formLabelClassName}>
                {t('Exam date', 'Prüfungstermin')}
                <RequiredMark />
              </Label>
              <Select
                value={sessionId}
                onValueChange={(value) => {
                  setValue('exam.examSessionId', value, { shouldDirty: true });
                  clearErrors('exam.examSessionId');
                }}
              >
                <SelectTrigger
                  id="exam-session"
                  aria-required
                  aria-invalid={Boolean(errors?.examSessionId)}
                  aria-describedby={errors?.examSessionId ? 'exam-session-error' : undefined}
                  className={formControlClassName}
                >
                  <SelectValue placeholder={t('Choose a date…', 'Termin auswählen…')} />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.startsAtLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors?.examSessionId ? <p id="exam-session-error" className={formErrorClassName}>{errors.examSessionId.message}</p> : null}
            </div>

            <div className={formFieldGroupClassName}>
              <Label htmlFor="exam-registration-type" className={formLabelClassName}>
                {t('Type of entry', 'Anmeldeart')}
                <RequiredMark />
              </Label>
              <Select
                value={registrationType ?? ''}
                onValueChange={(value) => {
                  setValue('exam.registrationType', value as (typeof REGISTRATION_TYPES)[number], { shouldDirty: true });
                  clearErrors('exam.registrationType');
                }}
              >
                <SelectTrigger
                  id="exam-registration-type"
                  aria-required
                  aria-invalid={Boolean(errors?.registrationType)}
                  aria-describedby={errors?.registrationType ? 'exam-registration-type-error' : undefined}
                  className={formControlClassName}
                >
                  <SelectValue placeholder={t('Choose…', 'Auswählen…')} />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRATION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {typeLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors?.registrationType ? (
                <p id="exam-registration-type-error" className={formErrorClassName}>{errors.registrationType.message}</p>
              ) : null}
            </div>
          </div>

          {session ? (
            <div className="relative overflow-hidden rounded-2xl border border-[color:var(--casa-sand)] bg-[var(--casa-canvas)] p-5 sm:p-6">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--casa-ink-deep)]" />
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className={formMetaLabelClassName}>{t('Date', 'Datum')}</dt>
                  <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{session.startsAtLabel}</dd>
                </div>
                <div>
                  <dt className={formMetaLabelClassName}>{t('Location', 'Ort')}</dt>
                  <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{session.locationLabel}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className={formMetaLabelClassName}>{t('Deadline', 'Frist')}</dt>
                  <dd className="mt-1 font-semibold text-[var(--casa-ink)]">{session.deadlineLabel}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
