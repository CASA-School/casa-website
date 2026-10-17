'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { DialogFooter } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Button, Field, Input, Select, Textarea, TINTS } from '@/components/admin/ui';
import {
  levelBand,
  levelFree,
  levelPlaces,
  levelSiblings,
  startFree,
  waitingAhead,
  type BookingOffer,
  type CohortOffer,
  type SittingOffer,
} from '@/lib/admin/booking-offer-types';
import {
  bookedSpan,
  defaultJoin,
  inSecondHalf,
  joinStart,
  joinWeeks,
  offersWholeLevel,
  stayFor,
  type JoinWeek,
  type StartSpan,
} from '@/lib/admin/booking-levels';
import { isoWeek } from '@/lib/admin/kursplanung/weeks';
import { bremenDate } from '@/lib/appointments/schedule';
import { daysLabel, sessionOf, teachingWeeks } from '@/lib/admin/offers/course';
import { bzFree, bzPeak, bzRun, bzSegments, type BzShift, type BzWeek } from '@/lib/admin/bildungszeit-rules';
import { EXAM_PARTS, EXAM_PARTS_LABELS, type ExamParts } from '@/lib/admin/exam-parts';
import { cn } from '@/lib/utils';
import { toDateInputValue } from '@/lib/dates';
import { OptionalSection } from '@/components/admin/optional-section';
import { DateField } from '@/components/admin/date-picker';
import { useWsLang } from '@/components/admin/lang';
import { pick, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';

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

type Step = 'what' | 'course' | 'sitting' | 'level' | 'accommodation' | 'review';

/** A course: what, which, level and books, accommodation. An exam: what (and its parts), the sitting. */
const COURSE_STEPS: readonly Step[] = ['what', 'course', 'level', 'accommodation', 'review'];
const EXAM_STEPS: readonly Step[] = ['what', 'sitting', 'review'];

const steps = (t: T): readonly { key: Step; label: string }[] => [
  { key: 'what', label: t('Was', 'What') },
  { key: 'course', label: t('Auswahl', 'Which') },
  { key: 'sitting', label: t('Termin', 'Sitting') },
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

export type BookingWizardProps = {
  personId: string;
  personName: string;
  offer: BookingOffer;
  /** The learner studied at CASA before: the enrolment fee, charged once, starts unticked. */
  studiedBefore: boolean;
  preselectedCohortId?: string | null;
  /** From a waiting list or a registration: the level the learner waited for or asked for. */
  preselectedLevelCode?: string | null;
  /** From a registration: the whole level („A2 komplett") or the half. */
  preselectedLevelScope?: 'whole' | 'half' | null;
  /** From a registration: the accommodation type asked for (`with_germans` for a host family). */
  preselectedAccommodation?: string | null;
  /** From a link (`from=`): the Monday a learner joins the preselected start from, when it is under way. */
  preselectedJoinFrom?: string | null;
  sourceRegistrationId?: string | null;
  /** From an exam registration or an exam waiting list (0036): the exam, its sitting and the parts. */
  preselectedExam?: { examTypeId: string; sittingId: string | null; parts: ExamParts } | null;
  sourceExamRegistrationId?: string | null;
  returnTo: string;
  action: (formData: FormData) => void | Promise<void>;
  /** The other ending when the level is full: the learner goes into its queue (`waitlistFromWizardAction`). */
  waitlistAction?: (formData: FormData) => void | Promise<void>;
};

export function BookingWizardClient({
  personId,
  personName,
  offer,
  studiedBefore,
  preselectedCohortId,
  preselectedLevelCode,
  preselectedLevelScope,
  preselectedAccommodation,
  preselectedJoinFrom,
  sourceRegistrationId,
  preselectedExam,
  sourceExamRegistrationId,
  returnTo,
  action,
  waitlistAction,
}: BookingWizardProps) {
  const { t, lang } = useWsLang();
  const codes = useMemo(() => offer.levels.map((l) => l.code), [offer.levels]);
  const preselected = useMemo(
    () =>
      preselectedCohortId
        ? (offer.courseTypes.flatMap((t) => t.cohorts).find((c) => c.id === preselectedCohortId) ??
          null)
        : null,
    [offer.courseTypes, preselectedCohortId]
  );

  const presetExam = preselectedExam ? (offer.exams.find((e) => e.id === preselectedExam.examTypeId) ?? null) : null;
  // Bildungszeit (2026-10-17): booked into a week's two intensive classes, not on a start of its own.
  const bz = offer.bildungszeit ?? null;
  const presetBz = Boolean(bz && preselected && preselected.courseTypeId === bz.courseTypeId);
  // A start under way (2026-10-17): the learner joins it from a Monday — the link's, else the next one.
  // Without the link's week the wizard opens on the start, so the week is asked.
  const [today] = useState(() => bremenDate());
  const presetWeeks = presetBz ? [] : joinableWeeks(preselected, today);
  const presetJoinGiven = presetWeeks.some((w) => w.monday === preselectedJoinFrom);
  const presetJoin = presetJoinGiven ? (preselectedJoinFrom ?? null) : defaultJoin(presetWeeks, today);
  const [step, setStep] = useState<Step>(
    presetBz ? 'course' : preselected ? (presetWeeks.length && !presetJoinGiven ? 'course' : 'level') : presetExam ? 'sitting' : 'what'
  );
  const [kind, setKind] = useState<'course' | 'exam'>(presetExam ? 'exam' : 'course');
  const [courseTypeId, setCourseTypeId] = useState<string | null>(
    preselected?.courseTypeId ?? null
  );
  const [cohort, setCohort] = useState<CohortOffer | null>(presetBz ? null : preselected);
  const [bzMonday, setBzMonday] = useState<string | null>(
    presetBz && preselected ? (bz?.weeks.find((w) => w.monday === toDateInputValue(preselected.startDate))?.monday ?? null) : null
  );
  const [bzWeeks, setBzWeeks] = useState<1 | 2>(1);
  const [bzFirst, setBzFirst] = useState<string | null>(null);
  const [bzSecond, setBzSecond] = useState<string | null>(null);
  const isBz = Boolean(bz && courseTypeId === bz.courseTypeId);
  const bzWeeksList = bz?.weeks ?? [];
  const run = isBz && bzMonday ? bzRun(bzWeeksList, bzMonday, bzWeeks) : null;
  const [examTypeId, setExamTypeId] = useState<string | null>(presetExam?.id ?? null);
  const [examParts, setExamParts] = useState<ExamParts>(preselectedExam?.parts ?? 'full');
  const [sittingId, setSittingId] = useState<string | null>(
    presetExam?.sittings.some((s) => s.id === preselectedExam?.sittingId) ? (preselectedExam?.sittingId ?? null) : null
  );

  const [joinFrom, setJoinFrom] = useState<string | null>(presetJoin);
  const presetLevel = preselectedLevelCode ?? preselected?.levelCode ?? null;
  const [levelCode, setLevelCode] = useState<string | null>(() => stepForJoin(presetLevel, presetBz ? null : preselected, presetJoin, offer.levels));
  // The step was moved to `.2` by the week chosen, not by a colleague: a week back in the first half moves it back.
  const [autoSecond, setAutoSecond] = useState(() => stepForJoin(presetLevel, presetBz ? null : preselected, presetJoin, offer.levels) !== presetLevel);
  // The whole level where the start sells one from this step (an intensive start at a first half), else the half.
  const [levelScope, setLevelScope] = useState<'half' | 'whole'>(preselectedLevelScope ?? 'whole');
  const [wantsBooks, setWantsBooks] = useState<boolean | null>(null);
  const [excludedBooks, setExcludedBooks] = useState<Set<string>>(new Set());

  const presetStay = preselectedAccommodation && offer.accommodation.some((a) => a.code === preselectedAccommodation) ? preselectedAccommodation : null;
  const [wantsAccommodation, setWantsAccommodation] = useState<boolean | null>(presetStay ? true : null);
  const [accType, setAccType] = useState<string>(presetStay ?? '');
  const [roomType, setRoomType] = useState<string>('');
  const [catering, setCatering] = useState<string>('');
  const [accFrom, setAccFrom] = useState<string>('');
  const [accTo, setAccTo] = useState<string>('');
  // Dates a colleague typed are theirs; until then they follow the course (`stayFor`).
  const [accTouched, setAccTouched] = useState(false);
  const [includeFee, setIncludeFee] = useState(!studiedBefore);

  // How much of the level, and so the dates booked: the whole start; an intensive start's first half
  // alone, to the end of its fourth teaching week; a second half joined here, to the end of the running
  // course; a start under way, from the Monday the learner joins. The server works the same dates out
  // again (`bookedPeriod`, both by `bookedSpan`).
  const cohortStart = cohort ? toDateInputValue(cohort.startDate) : null;
  const weeksToJoin = useMemo(() => joinableWeeks(cohort, today), [cohort, today]);
  const join = joinFrom && weeksToJoin.some((w) => w.monday === joinFrom) ? joinFrom : null;
  const joining = kind === 'course' && Boolean(join && cohortStart && join > cohortStart);
  // From the fifth teaching week an intensive course teaches its `.2` step: a `.2` learner joining then
  // sits in this start's own course of the level (`resolveCourse`), not in the start before's.
  const secondHalf = Boolean(cohort && cohortStart && cohort.format === 'intensive' && inSecondHalf(spanOf(cohort), joinStart(cohortStart, join)));
  const coursePlaces = (on: CohortOffer, code: string) => levelPlaces(on, secondHalf && /\.2$/.test(code) ? `${code.slice(0, -2)}.1` : code);
  const joinedUntil = cohort && levelCode && !(secondHalf && /\.2$/.test(levelCode)) ? (cohort.levels[levelCode]?.until ?? null) : null;
  const wholeOffered = offersWholeLevel(cohort?.format ?? null, levelCode, codes);
  // „Nur A2.1" is no choice once its four weeks are past.
  const halfOffered = wholeOffered && !secondHalf;
  const scope: 'half' | 'whole' = wholeOffered ? (halfOffered ? levelScope : 'whole') : 'half';
  const spanFor = (how: 'half' | 'whole') => (cohort ? bookedSpan(spanOf(cohort, joinedUntil), levelCode, how, join) : null);
  const span = spanFor(scope);
  const chooseLevel = (code: string, on: CohortOffer | null = cohort) => {
    setLevelCode(code);
    setLevelScope(offersWholeLevel(on?.format ?? null, code, codes) ? 'whole' : 'half');
  };
  /** The week a learner joins from; in an intensive course the step follows it into the second half and back. */
  const chooseJoin = (monday: string) => {
    setJoinFrom(monday);
    if (!cohort || !levelCode) return;
    const base = (autoSecond && sibling(levelCode, '1', offer.levels)) || levelCode;
    const moved = stepForJoin(base, cohort, monday, offer.levels) ?? base;
    if (moved !== levelCode) chooseLevel(moved);
    setAutoSecond(moved !== base);
  };

  const exam = offer.exams.find((e) => e.id === examTypeId) ?? null;
  const sitting = exam?.sittings.find((s) => s.id === sittingId) ?? null;

  /** The books for the chosen level: both halves, or just this one. */
  const books = useMemo(() => {
    // Bildungszeit: the books of the two classes.
    const steps = isBz ? [bzFirst, bzSecond].filter((c): c is string => Boolean(c)) : !levelCode ? [] : scope === 'whole' ? levelSiblings(levelCode) : [levelCode];
    return offer.materials.filter((m) => m.levelCode && steps.includes(m.levelCode));
  }, [isBz, bzFirst, bzSecond, levelCode, scope, offer.materials]);

  const chosenBooks = books.filter((b) => !excludedBooks.has(b.id));

  // The chosen level in the chosen start — or the chosen sitting: its places and who already waits for them.
  const group = isBz ? null : kind === 'course' && cohort && levelCode ? coursePlaces(cohort, levelCode) : kind === 'exam' && sitting ? sitting.places : null;
  // A Bildungszeit class with no place left in one of its weeks.
  const bzFull = run ? ([['first', bzFirst], ['second', bzSecond]] as const).filter(([half, code]) => code && bzFree(run, half, code) === 0).map(([half, code]) => ({ code: code!, ...bzPeak(run, half, code!) })) : [];
  const free = group ? levelFree(group, personId) : null;
  const ahead = group ? waitingAhead(group, personId) : 0;
  const full = group !== null && free === 0;
  // A course under way has no queue to join: a full one is said, and booking it anyway stays possible.
  const queueFirst = Boolean(waitlistAction) && !joining && group !== null && (full || ahead > 0);
  const fullJoin = joining && full;

  const chosenAccommodation = wantsAccommodation
    ? (offer.accommodation.find((a) => a.code === accType) ?? null)
    : null;
  // What is booked, from the first day to the last: the stay is around it.
  const period = run ? { start: run[0].monday, end: run[run.length - 1].friday } : span ? { start: span.startDate, end: span.endDate } : null;
  const defaultStay = () => {
    const stay = period ? stayFor(period.start, period.end) : null;
    if (stay) {
      setAccFrom(stay.from);
      setAccTo(stay.to);
    }
  };

  const visible = steps(t).filter((s) => (kind === 'exam' ? EXAM_STEPS : COURSE_STEPS).includes(s.key));
  const index = visible.findIndex((s) => s.key === step);
  const canAdvance =
    (step === 'what' && (kind === 'course' || (kind === 'exam' && Boolean(examTypeId)))) ||
    (step === 'course' && (isBz ? Boolean(run) : Boolean(cohort) && (weeksToJoin.length === 0 || Boolean(join)))) ||
    (step === 'sitting' && Boolean(sitting)) ||
    (step === 'level' && wantsBooks !== null && (!isBz || Boolean(bzFirst && bzSecond))) ||
    (step === 'accommodation' && wantsAccommodation !== null) ||
    step === 'review';

  const go = (delta: number) => {
    const next = visible[index + delta];
    if (!next) return;
    // Into the stay: its dates follow what was chosen, until a colleague types their own.
    if (next.key === 'accommodation' && wantsAccommodation && !accTouched) defaultStay();
    setStep(next.key);
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
                    onSelect={() => {
                      setExamTypeId(e.id);
                      if (e.id !== examTypeId) setSittingId(null);
                    }}
                    title={e.name}
                  >
                    {e.sittings.length === 0
                      ? t('Kein Termin geplant', 'No sitting planned')
                      : e.sittings.length === 1
                        ? t('1 Termin', '1 sitting')
                        : t(`${e.sittings.length} Termine`, `${e.sittings.length} sittings`)}
                  </Choice>
                ))}
              </div>
              <Question small>{t('Welche Teile?', 'Which parts?')}</Question>
              <div className="flex flex-wrap gap-2">
                {EXAM_PARTS.map((parts) => (
                  <Toggle key={parts} selected={examParts === parts} onSelect={() => setExamParts(parts)} label={pick(lang, EXAM_PARTS_LABELS[parts])} />
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
                  setBzFirst(null);
                  setBzSecond(null);
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
                  {bz && type.id === bz.courseTypeId ? bz.weeks.length : type.cohorts.length}
                </span>
              </button>
            ))}
          </div>

          {isBz && bz ? (
            <div className="space-y-3 border-t border-ws-line-soft pt-4">
              <Question small>{t('Ab welcher Woche?', 'From which week?')}</Question>
              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {bz.weeks.map((w) => (
                  <Choice
                    key={w.monday}
                    selected={bzMonday === w.monday}
                    onSelect={() => {
                      setBzMonday(w.monday);
                      if (!bzRun(bz.weeks, w.monday, bzWeeks)) setBzWeeks(1);
                    }}
                    title={`${t('KW', 'Week')} ${w.kw} · ${shortDay(new Date(`${w.monday}T12:00:00`), lang)} – ${shortDay(new Date(`${w.friday}T12:00:00`), lang)}`}
                  >
                    {t(
                      `Intensivkurse ab ${shortDay(new Date(`${w.start.startDate}T12:00:00`), lang)} und ${shortDay(new Date(`${w.previous.startDate}T12:00:00`), lang)}`,
                      `Intensive courses from ${shortDay(new Date(`${w.start.startDate}T12:00:00`), lang)} and ${shortDay(new Date(`${w.previous.startDate}T12:00:00`), lang)}`
                    )}
                  </Choice>
                ))}
              </div>
              {bzMonday ? (
                <>
                  <Question small>{t('Wie lange?', 'How long?')}</Question>
                  <div className="flex gap-2">
                    <Toggle selected={bzWeeks === 1} onSelect={() => setBzWeeks(1)} label={weeksLabel(t, 1)} />
                    {bzRun(bz.weeks, bzMonday, 2) ? <Toggle selected={bzWeeks === 2} onSelect={() => setBzWeeks(2)} label={weeksLabel(t, 2)} /> : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : courseTypeId ? (
            <div className="space-y-2 border-t border-ws-line-soft pt-4">
              <Question small>{t('Welcher Termin?', 'Which one?')}</Question>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {(offer.courseTypes.find((type) => type.id === courseTypeId)?.cohorts ?? []).map((c) => (
                  <Choice
                    key={c.id}
                    selected={cohort?.id === c.id}
                    onSelect={() => {
                      // A start under way is joined from the next Monday; the step follows the week.
                      const monday = defaultJoin(joinableWeeks(c, today), today);
                      const base = c.levelCode ?? ((levelCode && autoSecond && sibling(levelCode, '1', offer.levels)) || levelCode);
                      const moved = stepForJoin(base, c, monday, offer.levels);
                      setCohort(c);
                      setJoinFrom(monday);
                      setAutoSecond(moved !== base);
                      if (moved) chooseLevel(moved, c);
                    }}
                    title={c.label}
                  >
                    {startFacts(c, levelCode, personId, today, t, lang)}
                  </Choice>
                ))}
              </div>
              {cohort && weeksToJoin.length ? (
                <div className="space-y-2 border-t border-ws-line-soft pt-4">
                  <Question small>{t('Einstieg ab', 'Joining from')}</Question>
                  <div className="grid max-h-60 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {weeksToJoin.map((w) => (
                      <Choice
                        key={w.monday}
                        selected={join === w.monday}
                        onSelect={() => chooseJoin(w.monday)}
                        title={`${t('KW', 'Week')} ${isoWeek(w.monday)} · ${mondayLabel(w.monday, lang)} · ${
                          w.left === 1 ? t('noch 1 Woche', '1 week left') : t(`noch ${w.left} Wochen`, `${w.left} weeks left`)
                        }`}
                      >
                        {t(`Kurswoche ${w.week} von ${w.week + w.left - 1}`, `Course week ${w.week} of ${w.week + w.left - 1}`)}
                      </Choice>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 'sitting' && exam ? (
        <section className="space-y-3">
          <Question>{t(`Welcher Termin für ${exam.name}?`, `Which sitting of ${exam.name}?`)}</Question>
          {exam.sittings.length === 0 ? (
            <p className="text-sm text-[var(--casa-muted)]">{t('Für diese Prüfung ist kein Termin geplant.', 'No sitting of this exam is planned.')}</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {exam.sittings.map((s) => (
                <Choice key={s.id} selected={sittingId === s.id} onSelect={() => setSittingId(s.id)} title={sittingDay(s.startsAt, lang)}>
                  {sittingFacts(s, personId, t, lang)}
                </Choice>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step === 'level' && isBz && run ? (
        <section className="space-y-4">
          <Question>{t('In welche Kurse?', 'Into which classes?')}</Question>
          {bzClasses(run, t, lang).map((c) => (
            <BzClassPicker
              key={c.half}
              label={c.label}
              codes={offer.levels.map((l) => l.code).filter((code) => code.endsWith(c.half === 'first' ? '.1' : '.2'))}
              run={run}
              half={c.half}
              value={c.half === 'first' ? bzFirst : bzSecond}
              onChange={(code) => {
                if (c.half === 'first') {
                  setBzFirst(code);
                  if (!bzSecond) setBzSecond(sibling(code, '2', offer.levels));
                } else {
                  setBzSecond(code);
                  if (!bzFirst) setBzFirst(sibling(code, '1', offer.levels));
                }
              }}
              t={t}
            />
          ))}
          <BooksQuestion
            books={books}
            wantsBooks={wantsBooks}
            setWantsBooks={setWantsBooks}
            excludedBooks={excludedBooks}
            setExcludedBooks={setExcludedBooks}
            empty={t('Für diese Niveaus ist kein Buch hinterlegt.', 'No book is listed for these levels.')}
            t={t}
          />
        </section>
      ) : step === 'level' ? (
        <section className="space-y-3">
          <Question>{t('Mit welchem Niveau beginnt die Person?', 'Which level are they starting at?')}</Question>
          <div className="flex flex-wrap gap-1.5">
            {offer.levels.map((l) => {
              const places = cohort ? coursePlaces(cohort, l.code) : null;
              const isFull = places ? levelFree(places, personId) === 0 : false;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    chooseLevel(l.code);
                    setAutoSecond(false);
                  }}
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
                  {isFull ? <span className="ml-1 text-[0.72rem] font-bold opacity-80">{places?.closed ? t('geschlossen', 'closed') : t('voll', 'full')}</span> : null}
                </button>
              );
            })}
          </div>
          {group ? (
            // The chosen level's places in this start, before the rest is asked.
            <p className={cn('text-[0.82rem]', full ? 'font-semibold text-[#9a5b00]' : 'text-[var(--casa-muted)]')}>
              {full && group.closed
                ? t(`${levelCode} ist geschlossen: nicht zur Buchung angeboten`, `${levelCode} is closed: not offered for booking`)
                : full
                ? t(`${levelCode} ist voll: ${group.booked} von ${group.places} Plätzen gebucht`, `${levelCode} is full: ${group.booked} of ${group.places} places booked`)
                : t(`${levelCode}: ${free} von ${group.places} Plätzen frei`, `${levelCode}: ${free} of ${group.places} places free`)}
              {joinedUntil
                ? t(` · im laufenden Kurs bis ${german(joinedUntil)}`, ` · in the running course until ${german(joinedUntil)}`)
                : ''}
              {joining && join ? t(` · Einstieg ab ${german(join)}`, ` · joining from ${german(join)}`) : ''}
              {group.offeredTo.includes(personId)
                ? t(' · der Platz ist für diese Person reserviert', ' · the place is held for this person')
                : group.queue.length
                  ? t(` · ${group.queue.length} auf der Warteliste`, ` · ${group.queue.length} on the waiting list`)
                  : ''}
            </p>
          ) : null}

          {levelCode ? (
            <>
              {/* Only an intensive start sells the whole level, and only from its first half: an evening term is one half. */}
              {halfOffered && cohort ? (
                <div className="flex flex-wrap gap-2 border-t border-ws-line-soft pt-4">
                  <Question small>{t(`Wie viel von ${levelBand(levelCode)}?`, `How much of ${levelBand(levelCode)}?`)}</Question>
                  <div className="flex w-full gap-2">
                    <Toggle
                      selected={scope === 'whole'}
                      onSelect={() => setLevelScope('whole')}
                      label={`${t(`Das ganze ${levelBand(levelCode)}`, `The whole ${levelBand(levelCode)}`)} · ${weeksLabel(t, spanWeeks(spanFor('whole')))}`}
                    />
                    <Toggle
                      selected={scope === 'half'}
                      onSelect={() => setLevelScope('half')}
                      label={`${t(`Nur ${levelCode}`, `${levelCode} only`)} · ${weeksLabel(t, spanWeeks(spanFor('half')))}`}
                    />
                  </div>
                </div>
              ) : null}

              <BooksQuestion
                books={books}
                wantsBooks={wantsBooks}
                setWantsBooks={setWantsBooks}
                excludedBooks={excludedBooks}
                setExcludedBooks={setExcludedBooks}
                empty={t(`Für ${levelCode} ist kein Buch hinterlegt.`, `No book is listed for ${levelCode}.`)}
                t={t}
              />
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
                // Arrive the day before the course, leave on the Saturday after it: whole weeks of rent.
                if (!accTouched) defaultStay();
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
                    title={pick(lang, a.name)}
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
                          {pick(lang, r.name)}
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
                          {pick(lang, c.name)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('Von', 'From')} htmlFor="acc-from">
                    <DateField
                      id="acc-from"
                      value={accFrom || null}
                      onChange={(v) => {
                        setAccTouched(true);
                        setAccFrom(v ?? '');
                      }}
                    />
                  </Field>
                  <Field label={t('Bis', 'Until')} htmlFor="acc-to">
                    <DateField
                      id="acc-to"
                      value={accTo || null}
                      min={accFrom || null}
                      onChange={(v) => {
                        setAccTouched(true);
                        setAccTo(v ?? '');
                      }}
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
          {run ? (
            <>
              <input type="hidden" name="superintensive" value="1" />
              <input type="hidden" name="bzMonday" value={run[0].monday} />
              <input type="hidden" name="bzWeeks" value={run.length} />
              <input type="hidden" name="levelFirst" value={bzFirst ?? ''} />
              <input type="hidden" name="levelSecond" value={bzSecond ?? ''} />
            </>
          ) : null}
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
          <input type="hidden" name="examSessionId" value={kind === 'exam' ? (sitting?.id ?? '') : ''} />
          <input type="hidden" name="examParts" value={examParts} />
          {sourceExamRegistrationId ? <input type="hidden" name="sourceExamRegistrationId" value={sourceExamRegistrationId} /> : null}
          <input type="hidden" name="startDate" value={period ? period.start : accFrom} />
          <input type="hidden" name="endDate" value={period ? period.end : accTo} />
          <input type="hidden" name="levelCode" value={levelCode ?? ''} />
          <input type="hidden" name="levelScope" value={scope} />
          <input type="hidden" name="joinFrom" value={joining && join ? join : ''} />
          <input type="hidden" name="includeEnrolmentFee" value={includeFee && kind === 'course' ? '1' : ''} />
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
            {summaryRows(t, lang, {
              kind,
              cohort,
              bildungszeit: run && bz ? { name: bz.name, run, first: bzFirst, second: bzSecond } : null,
              exam,
              sitting,
              examParts,
              levelCode,
              levelScope: scope,
              period,
              runningUntil: joinedUntil,
              books: wantsBooks ? chosenBooks : [],
              accommodation: chosenAccommodation
                ? {
                    name: [
                      pick(lang, chosenAccommodation.name),
                      offer.roomTypes.find((r) => r.code === roomType)?.name,
                      offer.catering.find((c) => c.code === catering)?.name,
                    ]
                      .map((n) => (n && typeof n === 'object' ? pick(lang, n) : n))
                      .filter(Boolean)
                      .join(' · '),
                  }
                : null,
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
            {/* A course's: the enrolment fee and a visa. An exam is booked without either. */}
            {kind === 'course' ? (
              <>
                <label className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={includeFee}
                    onChange={(e) => setIncludeFee(e.target.checked)}
                    className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
                  />
                  {t('Einschreibegebühr berechnen', 'Charge the enrolment fee')}
                </label>
                <label className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    name="visaRequired"
                    className="size-4 rounded-lg border-ws-line-firm accent-[var(--casa-accent-surface)]"
                  />
                  {t('Visum nötig', 'Visa required')}
                </label>
              </>
            ) : null}
            <Field label={t('Notizen', 'Notes')} htmlFor="review-notes">
              <Textarea id="review-notes" name="notes" rows={2} />
            </Field>
          </OptionalSection>

          {kind === 'exam' && sitting && lateEntry(sitting) ? (
            // After the deadline the entry reaches telc late, if at all: said before it is booked.
            <p role="status" className="rounded-xl bg-[#fff8e6] px-3.5 py-3 text-[0.86rem] leading-relaxed text-[#5c3d00] ring-1 ring-[#efdca4] ring-inset">
              {t(
                `Der Anmeldeschluss war am ${shortDay(sitting.deadline!, lang)}. Die Anmeldung bei telc ist eine Nachmeldung.`,
                `Entries closed on ${shortDay(sitting.deadline!, lang)}. Reporting this candidate to telc is a late entry.`
              )}
            </p>
          ) : null}

          {bzFull.length ? (
            // A Bildungszeit class with no place in one of its weeks: said, and booking it anyway stays possible.
            <p role="status" className="rounded-xl bg-[#fff8e6] px-3.5 py-3 text-[0.86rem] leading-relaxed text-[#5c3d00] ring-1 ring-[#efdca4] ring-inset">
              {bzFull
                .map((c) =>
                  t(`${c.code} ist in dieser Zeit voll (${c.booked} von ${c.places} Plätzen).`, `${c.code} is full in these weeks (${c.booked} of ${c.places} places).`)
                )
                .join(' ')}
            </p>
          ) : null}

          {fullJoin && group ? (
            // A course under way with no place left: said, and booking it anyway stays possible.
            <p role="status" className="rounded-xl bg-[#fff8e6] px-3.5 py-3 text-[0.86rem] leading-relaxed text-[#5c3d00] ring-1 ring-[#efdca4] ring-inset">
              {group.closed
                ? t(`${levelCode} ist in diesem Termin geschlossen: nicht zur Buchung angeboten.`, `${levelCode} is closed in this start: not offered for booking.`)
                : t(`${levelCode} ist in diesem Termin voll (${group.booked} von ${group.places} Plätzen).`, `${levelCode} is full in this start (${group.booked} of ${group.places} places).`)}
            </p>
          ) : null}

          {queueFirst && group && kind === 'exam' ? (
            // A full sitting, or candidates waiting in front: the queue is offered first.
            <p role="status" className="rounded-xl bg-[#fff8e6] px-3.5 py-3 text-[0.86rem] leading-relaxed text-[#5c3d00] ring-1 ring-[#efdca4] ring-inset">
              {full
                ? t(
                    `Dieser Termin ist voll (${group.booked} von ${group.places} Plätzen). Auf der Warteliste wäre ${personName} Nr. ${ahead + 1}.`,
                    `This sitting is full (${group.booked} of ${group.places} places). On the waiting list ${personName} would be no. ${ahead + 1}.`
                  )
                : t(
                    `${ahead === 1 ? '1 Person wartet' : `${ahead} Personen warten`} schon auf diesen Termin. Ein freier Platz geht zuerst an die Warteliste.`,
                    `${ahead === 1 ? '1 person is' : `${ahead} people are`} already waiting for this sitting. A free place goes to the waiting list first.`
                  )}
            </p>
          ) : queueFirst && group ? (
            // A full level, or learners waiting in front: the queue is offered first, and booking anyway stays possible.
            <p role="status" className="rounded-xl bg-[#fff8e6] px-3.5 py-3 text-[0.86rem] leading-relaxed text-[#5c3d00] ring-1 ring-[#efdca4] ring-inset">
              {full && group.closed
                ? t(
                    `${levelCode} ist in diesem Termin geschlossen: nicht zur Buchung angeboten. Auf der Warteliste wäre ${personName} Nr. ${ahead + 1}.`,
                    `${levelCode} is closed in this start: not offered for booking. On the waiting list ${personName} would be no. ${ahead + 1}.`
                  )
                : full
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

          <DialogFooter
            start={
              <Button type="button" variant="ghost" onClick={() => go(-1)}>
                {t('Zurück', 'Back')}
              </Button>
            }
          >
            {bzFull.length || fullJoin ? (
              <Button type="submit" variant="secondary">
                {t('Trotzdem buchen', 'Book anyway')}
              </Button>
            ) : queueFirst && full && kind === 'exam' ? (
              // A sitting's places are the room's and the examiners': a full one is not booked over.
              <Button type="submit" formAction={waitlistAction}>
                {t('Auf die Warteliste', 'Add to waiting list')}
              </Button>
            ) : queueFirst && full ? (
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
          </DialogFooter>
        </form>
      ) : (
        <DialogFooter
          start={
            index > 0 ? (
              <Button type="button" variant="ghost" onClick={() => go(-1)}>
                {t('Zurück', 'Back')}
              </Button>
            ) : null
          }
        >
          <Button type="button" onClick={() => go(1)} disabled={!canAdvance}>
            {t('Weiter', 'Continue')}
          </Button>
        </DialogFooter>
      )}
    </div>
  );
}

/** Whether the learner takes the books, and which of them. */
function BooksQuestion({
  books,
  wantsBooks,
  setWantsBooks,
  excludedBooks,
  setExcludedBooks,
  empty,
  t,
}: {
  books: readonly { id: string; title: string }[];
  wantsBooks: boolean | null;
  setWantsBooks: (value: boolean) => void;
  excludedBooks: Set<string>;
  setExcludedBooks: (value: Set<string>) => void;
  empty: string;
  t: T;
}) {
  return (
    <div className="space-y-2 border-t border-ws-line-soft pt-4">
      <Question small>{t('Möchte die Person das Buch?', 'Do they want the book?')}</Question>
      <div className="flex gap-2">
        <Toggle selected={wantsBooks === true} onSelect={() => setWantsBooks(true)} label={t('Ja', 'Yes')} />
        <Toggle selected={wantsBooks === false} onSelect={() => setWantsBooks(false)} label={t('Nein', 'No')} />
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
      {wantsBooks && books.length === 0 ? <p className="text-xs text-[var(--casa-text-subtle)]">{empty}</p> : null}
    </div>
  );
}

/** One of a Bildungszeit week's two classes: its levels, a full one marked, and the chosen one's places. */
function BzClassPicker({
  label,
  codes,
  run,
  half,
  value,
  onChange,
  t,
}: {
  label: string;
  codes: string[];
  run: BzWeek[];
  half: 'first' | 'second';
  value: string | null;
  onChange: (code: string) => void;
  t: T;
}) {
  const free = value ? bzFree(run, half, value) : null;
  const peak = value ? bzPeak(run, half, value) : null;
  return (
    <div className="space-y-2">
      <Question small>{label}</Question>
      <div className="flex flex-wrap gap-1.5">
        {codes.map((code) => {
          const isFull = bzFree(run, half, code) === 0;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onChange(code)}
              aria-pressed={value === code}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-sm font-semibold tabular-nums transition-colors',
                value === code
                  ? 'border-[var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] text-white'
                  : isFull
                    ? 'border-[#efdca4] bg-[#fff8e6] text-[#7a4a00] hover:border-[#d9b65c]'
                    : 'border-ws-line bg-white hover:border-[var(--casa-blue)]/45'
              )}
            >
              {code}
              {isFull ? <span className="ml-1 text-[0.72rem] font-bold opacity-80">{t('voll', 'full')}</span> : null}
            </button>
          );
        })}
      </div>
      {value && peak ? (
        <p className={cn('text-[0.82rem]', free === 0 ? 'font-semibold text-[#9a5b00]' : 'text-[var(--casa-muted)]')}>
          {free === 0
            ? t(`${value} ist in dieser Zeit voll: ${peak.booked} von ${peak.places} Plätzen`, `${value} is full in these weeks: ${peak.booked} of ${peak.places} places`)
            : t(`${value}: ${free} von ${peak.places} Plätzen frei`, `${value}: ${free} of ${peak.places} places free`)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The two classes to choose, the morning one first. When a new course starts within the run the shifts
 * swap from that week on, so the classes are named by their half of the level instead.
 */
function bzClasses(run: BzWeek[], t: T, lang: WsLang): { half: 'first' | 'second'; label: string }[] {
  const since = (iso: string) => `${t('Kursstart', 'started')} ${shortDay(new Date(`${iso}T12:00:00`), lang)}`;
  if (bzSegments(run).length > 1)
    return [
      { half: 'first', label: t('Erste Hälfte des Niveaus (.1)', 'First half of the level (.1)') },
      { half: 'second', label: t('Zweite Hälfte des Niveaus (.2)', 'Second half of the level (.2)') },
    ];
  const [{ start, previous }] = run;
  const classes = [
    { half: 'first' as const, shift: start.shift, label: `${bzShift(t, start.shift)} · ${since(start.startDate)}` },
    { half: 'second' as const, shift: previous.shift, label: `${bzShift(t, previous.shift)} · ${since(previous.startDate)}` },
  ];
  return classes.sort((a, b) => (a.shift === 'morning' ? -1 : b.shift === 'morning' ? 1 : 0));
}

const bzShift = (t: T, shift: BzShift | null) => (shift === 'morning' ? t('Vormittag', 'Morning') : shift === 'afternoon' ? t('Nachmittag', 'Afternoon') : t('Intensivkurs', 'Intensive course'));

/** The same level at the other half: B1.1 → B1.2, when the levels have it. */
const sibling = (code: string, half: '1' | '2', levels: readonly { code: string }[]) => {
  const other = `${code.slice(0, -2)}.${half}`;
  return levels.some((l) => l.code === other) ? other : null;
};

/** A start's dates and days as the period rule reads them (`bookedSpan`). */
const spanOf = (c: CohortOffer, runningEnd: string | null = null): StartSpan => ({
  format: c.format,
  startDate: toDateInputValue(c.startDate),
  endDate: toDateInputValue(c.endDate),
  days: c.days,
  runningEnd,
});

const spanWeeks = (span: { startDate: string; endDate: string } | null) => (span ? teachingWeeks(span.startDate, span.endDate) : 0);

/** A start under way (begun, not over): the weeks it can still be joined from. Else none. */
function joinableWeeks(c: CohortOffer | null, today: string): JoinWeek[] {
  if (!c) return [];
  const start = toDateInputValue(c.startDate);
  const end = toDateInputValue(c.endDate);
  return start <= today && today <= end ? joinWeeks(start, end, today) : [];
}

/**
 * The step a learner joining from a Monday starts at: in an intensive course weeks 1–4 teach `B1.1`
 * and weeks 5–8 `B1.2`, so a first half chosen for a join in the second half becomes the second.
 */
function stepForJoin(code: string | null, c: CohortOffer | null, join: string | null, levels: readonly { code: string }[]): string | null {
  if (!code || !c || c.format !== 'intensive' || !/\.1$/.test(code)) return code;
  const s = spanOf(c);
  return inSecondHalf(s, joinStart(s.startDate, join)) ? (sibling(code, '2', levels) ?? code) : code;
}

/** „Mo 19.10.", „Mon 19 Oct": a join week's Monday. */
const mondayLabel = (iso: string, lang: WsLang) =>
  lang === 'de'
    ? `Mo ${iso.slice(8, 10)}.${iso.slice(5, 7)}.`
    : `Mon ${new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;

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
  lang: WsLang,
  {
    kind,
    cohort,
    bildungszeit,
    exam,
    sitting,
    examParts,
    levelCode,
    levelScope,
    period,
    runningUntil,
    books,
    accommodation,
    accFrom,
    accTo,
  }: {
    kind: 'course' | 'exam';
    cohort: CohortOffer | null;
    bildungszeit: { name: string; run: BzWeek[]; first: string | null; second: string | null } | null;
    exam: { name: string } | null;
    sitting: SittingOffer | null;
    examParts: ExamParts;
    levelCode: string | null;
    levelScope: 'half' | 'whole';
    period: { start: string; end: string } | null;
    /** A second half joined at a start: the end of the running course of the start before it sits in. */
    runningUntil: string | null;
    books: readonly { id: string; title: string }[];
    accommodation: { name: string } | null;
    accFrom: string;
    accTo: string;
  }
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (kind === 'course' && bildungszeit) {
    const { run } = bildungszeit;
    rows.push({ label: t('Kurs', 'Course'), value: bildungszeit.name });
    rows.push({
      label: t('Zeitraum', 'Dates'),
      value: `${german(run[0].monday)} – ${german(run[run.length - 1].friday)} · ${weeksLabel(t, run.length)}`,
    });
    // Per part of the run, which class is when: a new course starting in between swaps the shifts.
    const parts = bzSegments(run);
    for (const part of parts) {
      const classes = [
        { code: bildungszeit.first, shift: part.start.shift, since: part.start.startDate },
        { code: bildungszeit.second, shift: part.previous.shift, since: part.previous.startDate },
      ].sort((a, b) => (a.shift === 'morning' ? -1 : b.shift === 'morning' ? 1 : 0));
      rows.push({
        label: parts.length > 1 ? `${german(part.from)} – ${german(part.to)}` : t('Kurse', 'Classes'),
        value: classes.map((c) => `${c.code ?? '—'} ${bzShift(t, c.shift)} (${t('Kursstart', 'started')} ${german(c.since)})`).join(' · '),
      });
    }
  }
  if (kind === 'course' && cohort) {
    rows.push({ label: t('Kurs', 'Course'), value: cohort.label });
    // A second half joined here sits in the running course of the start before, to its end; a learner
    // joining a start under way, from their Monday.
    rows.push({
      label: t('Dauer', 'Runs for'),
      value: !period
        ? weeksLabel(t, cohort.weeks)
        : runningUntil
          ? t(`${german(period.start)} – ${german(period.end)} · im laufenden Kurs`, `${german(period.start)} – ${german(period.end)} · in the running course`)
          : `${german(period.start)} – ${german(period.end)} · ${weeksLabel(t, teachingWeeks(period.start, period.end))}`,
    });
  }
  if (kind === 'exam' && exam) {
    rows.push({ label: t('Prüfung', 'Exam'), value: exam.name });
    if (sitting) rows.push({ label: t('Termin', 'Sitting'), value: sittingDay(sitting.startsAt, lang) });
    rows.push({ label: t('Teile', 'Parts'), value: pick(lang, EXAM_PARTS_LABELS[examParts]) });
    return rows;
  }
  if (levelCode && !bildungszeit) {
    rows.push({
      label: t('Niveau', 'Level'),
      value:
        levelScope === 'whole' && levelSiblings(levelCode).length > 1
          ? `${t(`Das ganze ${levelBand(levelCode)}`, `The whole ${levelBand(levelCode)}`)} (${levelSiblings(levelCode).join('–')})`
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

/**
 * Under a start, what staff choose by: its weeks; the time of day of an intensive start (Vormittag,
 * Nachmittag), the weekdays and time of any other; and its free places — the chosen level's when the
 * level is known, else the start's.
 */
function startFacts(c: CohortOffer, levelCode: string | null, personId: string, today: string, t: T, lang: WsLang): string {
  const slot = c.days && c.time ? { days: c.days, time: c.time } : null;
  const session = c.session ?? sessionOf(slot);
  const when =
    c.format === 'intensive'
      ? session
        ? sessionLabel(t, session)
        : null
      : slot
        ? `${daysLabel(slot.days, lang)} ${slot.time.replace('-', '–')}`
        : session
          ? sessionLabel(t, session)
          : null;
  const places = startFree(c, levelCode, personId);
  const prefix = levelCode && places ? `${levelCode}: ` : '';
  const free = !places
    ? null
    : places.closed
      ? `${prefix}${t('geschlossen', 'closed')}`
      : places.free === 0
        ? `${prefix}${t('voll', 'full')}`
        : `${prefix}${places.free === 1 ? t('1 Platz frei', '1 place free') : t(`${places.free} Plätze frei`, `${places.free} places free`)}`;
  // A start under way: the weeks still ahead of it, from the next week a learner can join.
  const ahead = joinableWeeks(c, today);
  const left = ahead.find((w) => w.monday === defaultJoin(ahead, today))?.left ?? null;
  const length =
    left === null ? weeksLabel(t, c.weeks) : left === 1 ? t('läuft, noch 1 Woche', 'running, 1 week left') : t(`läuft, noch ${left} Wochen`, `running, ${left} weeks left`);
  return [length, when, free].filter(Boolean).join(' · ');
}

/** "Fr, 13. Nov. 2026 · 09:00": the day of a sitting and when it begins. */
function sittingDay(startsAt: Date, lang: WsLang): string {
  const d = new Date(startsAt);
  return `${d.toLocaleDateString(wsLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit' })}`;
}

const shortDay = (day: Date, lang: WsLang) => new Date(day).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' });

/** Its deadline has passed: a booking now is a late entry to telc. */
const lateEntry = (s: SittingOffer) => s.deadline !== null && new Date(s.deadline).setHours(23, 59, 59, 999) < Date.now();

/** Under a sitting: its free places — or that it is full and how many wait — and its deadline. */
function sittingFacts(s: SittingOffer, personId: string, t: T, lang: WsLang): string {
  const free = levelFree(s.places, personId);
  return [
    free > 0
      ? free === 1
        ? t('1 Platz frei', '1 place free')
        : t(`${free} Plätze frei`, `${free} places free`)
      : s.places.queue.length
        ? t(`Voll · ${s.places.queue.length} auf der Warteliste`, `Full · ${s.places.queue.length} waiting`)
        : t('Voll', 'Full'),
    s.deadline ? (lateEntry(s) ? t('Anmeldeschluss vorbei', 'Entries closed') : t(`Anmeldeschluss ${shortDay(s.deadline, lang)}`, `Entries close ${shortDay(s.deadline, lang)}`)) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const german = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
