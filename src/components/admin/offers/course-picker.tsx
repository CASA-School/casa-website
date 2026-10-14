'use client';

import { useState } from 'react';

import { DateField } from '@/components/admin/date-picker';
import { useWsLang } from '@/components/admin/lang';
import { formatDay } from '@/lib/admin/calendar';
import type { T, WsLang } from '@/lib/admin/i18n';
import { formatMoney } from '@/lib/admin/letters/format';
import {
  buildCourse,
  courseLines,
  examsAfter,
  extraNights,
  levelLabel,
  slotKey,
  slotLabel,
  slotsOf,
  stayAround,
  type AccommodationChoice,
  type CourseCatalogue,
  type CourseChoice,
  type CourseExam,
  type LearnerHistory,
} from '@/lib/admin/offers/course';
import { continuationLevels } from '@/lib/registration/level-path';
import { levelChoiceGroups } from '@/lib/registration/levels';

import ui from './offers.module.css';

const eur = (t: T, n: number | null) => (n == null ? t('kein Preis', 'no price') : formatMoney(n, 'de'));
/** "26 Oct 2026" / "26. Okt. 2026": the day without its weekday. */
const short = (iso: string, lang: WsLang) => formatDay(iso, lang).slice(4);

/**
 * A learner's course, picked the way a colleague thinks it through: which
 * course, at what time of day, starting when, at which level and on to
 * which — and then what comes with it: the books for each half level, the
 * enrolment fee on a first registration, a room if they need one, the telc
 * exam when the path ends at its level. Every
 * answer narrows the next, and the lines it will put on the offer are listed
 * underneath with their prices as it goes (course.ts prices them).
 */
export function CoursePicker({
  catalogue,
  value,
  onChange,
  history,
}: {
  catalogue: CourseCatalogue;
  value: CourseChoice | null;
  onChange: (course: CourseChoice | null) => void;
  /** What CASA knows of the learner; null when nobody can tell (an agency, a company). */
  history: LearnerHistory | null;
}) {
  const { t, lang } = useWsLang();
  const first = value?.steps[0];
  const [slug, setSlug] = useState(value?.slug ?? catalogue.courses[0]?.slug ?? '');
  const [slot, setSlot] = useState(slotKey(value?.slot ?? null));
  const [termId, setTermId] = useState(first?.termId ?? '');
  const [level, setLevel] = useState(first?.level ?? '');
  const [pathTo, setPathTo] = useState(value && value.steps.length > 1 ? value.steps[value.steps.length - 1].level : '');
  const [withBooks, setWithBooks] = useState(value ? value.books.length > 0 : true);
  const [newStudent, setNewStudent] = useState(value?.newStudent ?? history?.studiedBefore !== true);
  const [firstStay, setFirstStay] = useState(value?.firstStay ?? history?.stayedBefore !== true);
  const [accommodation, setAccommodation] = useState<AccommodationChoice | null>(value?.accommodation ?? null);
  const [exam, setExam] = useState<CourseExam | null>(value?.exam ?? null);

  const course = catalogue.courses.find((c) => c.slug === slug) ?? null;
  const slots = course ? slotsOf(course) : [];
  const slotGroup = slots.find((s) => s.key === slot) ?? slots[0] ?? null;
  const terms = slotGroup?.terms ?? [];
  const groups = course?.levels.length ? levelChoiceGroups(course.slug, course.levels, lang) : [];
  const onward = course && level ? continuationLevels(course.slug, level, course.levels) : [];

  const build = (
    patch: Partial<{
      slug: string;
      termId: string;
      level: string;
      pathTo: string;
      withBooks: boolean;
      newStudent: boolean;
      accommodation: AccommodationChoice | null;
      firstStay: boolean;
      exam: CourseExam | null;
    }>
  ) => {
    const next = { slug, termId, level, pathTo, withBooks, newStudent, accommodation, firstStay, exam, ...patch };
    const c = catalogue.courses.find((x) => x.slug === next.slug);
    const built =
      c && next.termId
        ? buildCourse({
            course: c,
            termId: next.termId,
            level: next.level,
            pathTo: next.pathTo,
            books: catalogue.books,
            withBooks: next.withBooks,
            newStudent: next.newStudent,
            accommodation: next.accommodation,
            firstStay: next.firstStay,
            exams: catalogue.exams,
            exam: next.exam,
            prices: catalogue.prices,
          })
        : null;
    // A path that no longer leads to the exam drops it.
    if ((built?.exam ?? null) !== next.exam) setExam(built?.exam ?? null);
    onChange(built);
    return built;
  };

  const choice = value;
  const lines = choice ? courseLines(choice, lang) : [];
  const examOptions = choice ? examsAfter(choice, catalogue.exams) : [];
  const total = lines.reduce((sum, l) => sum + (l.unitAmount ?? 0), 0);

  if (!catalogue.courses.length) return <div className={ui.empty}>{t('Kein Kurs hat kommende Termine.', 'No course has upcoming dates.')}</div>;

  return (
    <div className={ui.picker}>
      <div className={ui.section}>
        <span className={ui.sectionLabel}>{t('Kurs', 'Course')}</span>
        <div className={ui.courseTiles} role="radiogroup" aria-label={t('Kurs', 'Course')}>
          {catalogue.courses.map((c) => {
            const on = c.slug === slug;
            return (
              <button
                key={c.slug}
                type="button"
                role="radio"
                aria-checked={on}
                className={`${ui.choiceCard} ${on ? ui.choiceOn : ''}`}
                onClick={() => {
                  setSlug(c.slug);
                  const firstSlot = slotsOf(c)[0];
                  setSlot(firstSlot?.key ?? '');
                  setTermId('');
                  setLevel('');
                  setPathTo('');
                  onChange(null);
                }}
              >
                <b>{c.name[lang]}</b>
              </button>
            );
          })}
        </div>
      </div>

      {course && slots.length > 1 ? (
        <div className={ui.section}>
          <span className={ui.sectionLabel}>{t('Tageszeit', 'Time of day')}</span>
          <div className={ui.choiceGrid} style={{ gridTemplateColumns: `repeat(${Math.min(slots.length, 3)}, minmax(0, 1fr))` }}>
            {slots.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={s.key === slotGroup?.key}
                className={`${ui.choiceCard} ${s.key === slotGroup?.key ? ui.choiceOn : ''}`}
                onClick={() => {
                  setSlot(s.key);
                  setTermId('');
                  onChange(null);
                }}
              >
                <b>{slotLabel(s.slot, lang).split(', ')[0]}</b>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {course ? (
        <div className={ui.section}>
          <span className={ui.sectionLabel}>{t('Beginn', 'Starting')}</span>
          <div className={ui.termGrid}>
            {terms.slice(0, 10).map((term) => (
              <button
                key={term.id}
                type="button"
                aria-pressed={term.id === termId}
                className={`${ui.term} ${term.id === termId ? ui.termOn : ''}`}
                onClick={() => {
                  setTermId(term.id);
                  build({ termId: term.id, accommodation: accommodation ? { ...accommodation, from: null, to: null } : null });
                }}
              >
                <b>{short(term.startDate, lang)}</b>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {course && termId && groups.length ? (
        <div className={ui.section}>
          <span className={ui.sectionLabel}>{t('Niveau', 'Level')}</span>
          <div className={ui.levelRows}>
            {groups.map((g) => (
              <div key={g.level} className={ui.acts}>
                {g.choices.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={c.value === level}
                    className={`${ui.act} ${c.value === level ? `${ui.actOn} ${ui.tint_red}` : ''}`}
                    onClick={() => {
                      setLevel(c.value);
                      setPathTo('');
                      build({ level: c.value, pathTo: '' });
                    }}
                  >
                    {c.label.split(' · ')[0]}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {course && termId && level && onward.length ? (
        <div className={ui.section}>
          <span className={ui.sectionLabel}>{t('Und weiter bis', 'And on to')}</span>
          <div className={ui.acts}>
            {['', ...onward].map((to) => (
              <button
                key={to || 'none'}
                type="button"
                aria-pressed={to === pathTo}
                className={`${ui.act} ${to === pathTo ? `${ui.actOn} ${ui.tint_blue}` : ''}`}
                onClick={() => {
                  setPathTo(to);
                  build({ pathTo: to });
                }}
              >
                {to ? t(`bis ${to}`, `to ${to}`) : t('Nur dieses Niveau', 'This level only')}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {choice ? (
        <div className={ui.section}>
          <span className={ui.sectionLabel}>{t('Auf dem Angebot', 'On the offer')}</span>
          <div className={ui.lineList}>
            {choice.steps.map((step, i) => (
              <div key={i} className={ui.lineRow}>
                <span>
                  <b>
                    {choice.name[lang]}
                    {step.level ? ` ${levelLabel(step, lang)}` : ''}
                  </b>
                  <small>
                    {step.start && step.end ? `${short(step.start, lang)} – ${short(step.end, lang)}` : t('Termine nach Absprache', 'Dates by arrangement')}
                  </small>
                </span>
                <em>{eur(t, lines[i]?.unitAmount ?? null)}</em>
              </div>
            ))}
            <label className={ui.lineRow}>
              <span>
                <b>
                  <input
                    type="checkbox"
                    checked={withBooks}
                    onChange={(e) => {
                      setWithBooks(e.target.checked);
                      build({ withBooks: e.target.checked });
                    }}
                  />{' '}
                  {t('Bücher', 'Books')}
                </b>
                <small>
                  {choice.books.length
                    ? choice.books.map((b) => b.title).join(', ')
                    : withBooks
                      ? t('Keine in der Preisliste für dieses Niveau', 'None on the price list for this level')
                      : t('Die lernende Person hat sie schon', 'The learner has them')}
                </small>
              </span>
              <em>{choice.books.length ? eur(t, choice.books.reduce((s, b) => s + (b.price ?? 0), 0)) : '—'}</em>
            </label>
            <label className={ui.lineRow}>
              <span>
                <b>
                  <input
                    type="checkbox"
                    checked={newStudent}
                    onChange={(e) => {
                      setNewStudent(e.target.checked);
                      build({ newStudent: e.target.checked });
                    }}
                  />{' '}
                  {t('Anmeldegebühr', 'Enrolment fee')}
                </b>
                <small>
                  {history?.studiedBefore
                    ? t('Hat schon bei CASA gelernt', 'Has studied at CASA before')
                    : history
                      ? t('Erste Anmeldung bei CASA', 'First registration at CASA')
                      : t('Einmal, bei der ersten Anmeldung', 'Once, on a first registration')}
                </small>
              </span>
              <em>{newStudent ? eur(t, lines.find((l) => l.key === 'enrolment')?.unitAmount ?? null) : '—'}</em>
            </label>
            <label className={ui.lineRow}>
              <span>
                <b>
                  <input
                    type="checkbox"
                    checked={Boolean(accommodation)}
                    onChange={(e) => {
                      const next: AccommodationChoice | null = e.target.checked ? { kind: 'host_family', ...stayAround(choice.steps) } : null;
                      setAccommodation(next);
                      build({ accommodation: next });
                    }}
                  />{' '}
                  {t('Unterkunft', 'Accommodation')}
                </b>
              </span>
              <em>
                {accommodation
                  ? eur(t, lines.filter((l) => ['accommodation', 'placement', 'deposit'].includes(l.key)).reduce((sum, l) => sum + (l.unitAmount ?? 0), 0))
                  : '—'}
              </em>
            </label>
            {accommodation ? (
              <div className={ui.lineDetail}>
                <div className={ui.choiceGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {(
                    [
                      ['host_family', t('Gastfamilie', 'Host family')],
                      ['shared_flat', t('CASA-WG', 'CASA shared flat')],
                    ] as const
                  ).map(([kind, b]) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={accommodation.kind === kind}
                      className={`${ui.choiceCard} ${accommodation.kind === kind ? ui.choiceOn : ''}`}
                      onClick={() => {
                        const next = { ...accommodation, kind };
                        setAccommodation(next);
                        build({ accommodation: next });
                      }}
                    >
                      <b>{b}</b>
                    </button>
                  ))}
                </div>
                <div className={ui.row2}>
                  {(
                    [
                      ['from', t('Anreise', 'Arrival')],
                      ['to', t('Abreise', 'Departure')],
                    ] as const
                  ).map(([end, label]) => (
                    <div key={end} className={ui.fld}>
                      <span>{label}</span>
                      <DateField
                        ariaLabel={label}
                        value={accommodation[end]}
                        min={end === 'to' ? accommodation.from : null}
                        onChange={(day) => {
                          const next = { ...accommodation, [end]: day };
                          setAccommodation(next);
                          build({ accommodation: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
                {extraNights(accommodation) ? (
                  <div className={ui.fieldNote}>
                    {t(
                      `${extraNights(accommodation)} ${extraNights(accommodation) === 1 ? 'Nacht' : 'Nächte'} über ganze Wochen hinaus, nicht in der Miete`,
                      `${extraNights(accommodation)} ${extraNights(accommodation) === 1 ? 'night' : 'nights'} beyond whole weeks, not in the rent`
                    )}
                  </div>
                ) : null}
                <label className={ui.toggleLine}>
                  <input
                    type="checkbox"
                    checked={firstStay}
                    onChange={(e) => {
                      setFirstStay(e.target.checked);
                      build({ firstStay: e.target.checked });
                    }}
                  />
                  <span>
                    {t('Erster Aufenthalt bei CASA', 'First stay with CASA')}{' '}
                    {history?.stayedBefore ? <small>{t('· hat schon bei CASA gewohnt', '· has stayed before')}</small> : null}
                  </span>
                </label>
              </div>
            ) : null}
            {examOptions.map((e) => {
              const on = exam?.code === e.code;
              return (
                <div key={e.code} className={ui.lineGroup}>
                  <label className={ui.lineRow}>
                    <span>
                      <b>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(ev) => {
                            const s0 = e.sessions[0];
                            const next = ev.target.checked ? { code: e.code, name: e.name, date: s0.date, fee: s0.fee } : null;
                            setExam(next);
                            build({ exam: next });
                          }}
                        />{' '}
                        {e.name}
                      </b>
                    </span>
                    <em>{on ? eur(t, exam?.fee ?? null) : '—'}</em>
                  </label>
                  {on ? (
                    <div className={ui.lineDetail}>
                      <div className={ui.acts}>
                        {e.sessions.map((s) => (
                          <button
                            key={s.date}
                            type="button"
                            aria-pressed={exam?.date === s.date}
                            className={`${ui.act} ${exam?.date === s.date ? `${ui.actOn} ${ui.tint_blue}` : ''}`}
                            onClick={() => {
                              const next = { code: e.code, name: e.name, date: s.date, fee: s.fee };
                              setExam(next);
                              build({ exam: next });
                            }}
                          >
                            {short(s.date, lang)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className={`${ui.lineRow} ${ui.lineTotal}`}>
              <span>
                <b>{t('Gesamt', 'Total')}</b>
              </span>
              <em>{eur(t, total)}</em>
            </div>
          </div>
        </div>
      ) : course && termId && groups.length ? (
        <div className={ui.note}>{t('Wähle das Niveau.', 'Choose the level.')}</div>
      ) : null}
    </div>
  );
}
