import Link from 'next/link';

import { createSittingAction } from './actions';
import { ExamFilters } from './exam-filters';
import { SittingForm } from './sitting-form';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Tally } from '@/components/admin/inbox';
import { ListBar, ListEmpty, ListGroup, Owner } from '@/components/admin/list';
import { RowActions, type RowAction } from '@/components/admin/row-actions';
import { Badge, Card, Cell, Meter, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { examAhead, examFilterChoices, examViewCounts, isExamView, listExamSittings, type ExamListFilters, type ExamListItem, type ExamView } from '@/lib/admin/exam-list';
import { SITTING_STATUS_LABELS } from '@/lib/admin/exam-parts';
import { sittingDefaults } from '@/lib/admin/exams';
import { requireModule } from '@/lib/admin/guard';
import { pick, wsLocale, type Bilingual, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { isUuid } from '@/lib/admin/ids';
import { mailHref } from '@/lib/admin/mail/href';
import { firstParam } from '@/lib/admin/paging';
import { groupRuns, monthKey, monthLabel, shortDate } from '../list-parts';

/**
 * Prüfungen (2026-10-27, Rahman: „it doesn't look so advanced and doesn't have all the necessary
 * functionalities … proper filters that we have applied in other parts of our system").
 *
 * The views answer what the office asks of its sittings, one question each (docs/ADMIN_WORKSPACE.md §Lists
 * 10a): what is coming and offered on the website, what is prepared but not yet offered, whose results are
 * still to be entered, what was sat, what was called off, and everything. The filters cut across them at
 * the side, as on Buchungen: the exam, the month, the places, who examines, the report to telc. The search
 * finds a sitting by its exam, its day or a candidate's name.
 *
 * A row is the sitting: its exam and day, the deadline with the days left (amber in its last week), the
 * places as a bar with who waits, the report to telc or the results, who examines; its next step as a
 * button — the telc list as the deadline nears, the results once sat — and the rest behind „…": its tabs,
 * the mail to everyone booked or to the examiners, the letters to all. The line above says only what the
 * tabs do not: how many are booked into the sittings ahead and the next deadline.
 */

const VIEWS: { key: ExamView; label: Bilingual }[] = [
  { key: 'upcoming', label: { de: 'Kommend', en: 'Upcoming' } },
  { key: 'drafts', label: { de: 'Entwürfe', en: 'Drafts' } },
  { key: 'results', label: { de: 'Ergebnisse offen', en: 'Results due' } },
  { key: 'past', label: { de: 'Vergangen', en: 'Past' } },
  { key: 'cancelled', label: { de: 'Abgesagt', en: 'Cancelled' } },
  { key: 'all', label: { de: 'Alle', en: 'All' } },
];

type FilterKey = 'exam' | 'month' | 'places' | 'examiner' | 'filed';

const DAY = 86_400_000;

export default async function ExamCataloguePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, { t, lang }, user] = await Promise.all([searchParams, getI18n(), requireModule('catalogue')]);
  const rawView = firstParam(params.view);
  const view: ExamView = isExamView(rawView) ? rawView : 'upcoming';
  const search = firstParam(params.q)?.trim().slice(0, 80) || undefined;
  const error = firstParam(params.error);
  const rawExam = firstParam(params.exam);
  const rawMonth = firstParam(params.month);
  const rawPlaces = firstParam(params.places);
  const rawExaminer = firstParam(params.examiner);
  const filters: ExamListFilters = {
    examTypeId: rawExam && isUuid(rawExam) ? rawExam : undefined,
    month: rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : undefined,
    places: rawPlaces === 'free' || rawPlaces === 'full' || rawPlaces === 'waiting' ? rawPlaces : undefined,
    examiner: rawExaminer === 'none' || (rawExaminer && isUuid(rawExaminer)) ? rawExaminer : undefined,
    filed: firstParam(params.filed) === 'open' ? 'open' : undefined,
    search,
  };

  const [items, counts, ahead, choices] = await Promise.all([listExamSittings(view, filters), examViewCounts(filters), examAhead(), examFilterChoices()]);
  // A new sitting (0038): `catalogue` at `edit`, starting from its exam's last one.
  const exams = canAccess(user, 'catalogue', 'edit') ? await sittingDefaults() : [];
  const books = canAccess(user, 'bookings');
  const handles = canAccess(user, 'bookings', 'edit');
  const plans = canAccess(user, 'catalogue', 'edit');

  const today = new Date().setHours(0, 0, 0, 0);
  const dayOf = (d: Date | string) => new Date(d).setHours(0, 0, 0, 0);
  const isPast = (s: ExamListItem) => dayOf(s.startsAt) < today;
  const daysTo = (d: Date | string | null) => (d ? Math.round((dayOf(d) - today) / DAY) : null);
  const nextDeadline = ahead.nextDeadline ? new Date(`${ahead.nextDeadline}T12:00:00`) : null;
  const toDeadline = daysTo(nextDeadline);

  const value: Record<FilterKey, string | undefined> = {
    exam: filters.examTypeId,
    month: filters.month,
    places: filters.places,
    examiner: filters.examiner,
    filed: filters.filed,
  };
  // A view's address keeps the filters and the search; `without` drops one filter, for its label's ×.
  const href = (key: ExamView, without?: FilterKey) => {
    const q = new URLSearchParams(
      Object.entries({ view: key === 'upcoming' ? undefined : key, q: search, ...value, ...(without ? { [without]: undefined } : {}) }).filter(
        (e): e is [string, string] => Boolean(e[1])
      )
    ).toString();
    return `/admin/catalogue/exams${q ? `?${q}` : ''}`;
  };
  const examinerName = filters.examiner === 'none' ? t('Noch ohne Prüfende', 'No examiner yet') : choices.examiners.find((x) => x.id === filters.examiner)?.name;
  const chips = [
    filters.examTypeId ? { key: 'exam' as const, label: choices.exams.find((e) => e.id === filters.examTypeId)?.name ?? t('Prüfung', 'Exam') } : null,
    filters.month ? { key: 'month' as const, label: monthLabel(filters.month, lang, 0) } : null,
    filters.places
      ? { key: 'places' as const, label: filters.places === 'free' ? t('Plätze frei', 'Places free') : filters.places === 'full' ? t('Voll', 'Full') : t('Mit Warteliste', 'With a waiting list') }
      : null,
    examinerName ? { key: 'examiner' as const, label: examinerName } : null,
    filters.filed ? { key: 'filed' as const, label: t('Noch nicht alle bei telc gemeldet', 'Not everyone reported to telc') } : null,
  ].filter((c): c is { key: FilterKey; label: string } => c !== null);

  // What is coming reads by month; the past by month, newest first; the results due as one list, by its question.
  const groups =
    view === 'results'
      ? [{ key: 'results', label: '', items }]
      : groupRuns(items, (s) => monthKey(s.startsAt)).map((m) => ({ key: m.key, label: monthLabel(m.key, lang), items: m.items }));

  const sat = view === 'results' || view === 'past';
  const actionsOf = (s: ExamListItem): { primary: RowAction | null; actions: RowAction[] } => {
    const page = `/admin/catalogue/exams/${s.id}`;
    const left = daysTo(s.registrationDeadline);
    const past = isPast(s);
    const results = past && books && handles && s.booked > s.withResult && s.status !== 'cancelled';
    const telc = !past && books && s.booked > s.filed && s.status !== 'cancelled' && left !== null && left <= 14;
    const primary: RowAction | null = results
      ? { label: t('Ergebnisse eintragen', 'Enter results'), href: `${page}/results`, icon: Icon.award }
      : telc
        ? { label: t('Liste für telc', 'List for telc'), href: `${page}/telc`, icon: Icon.statement }
        : null;
    // The sitting's tabs, then what is done for it: the telc list, the letters, the mails, the results.
    const open: RowAction[] = [
      ...(books ? [{ label: t('Teilnehmende', 'Candidates'), href: page, icon: Icon.people }] : []),
      ...(s.waiting + s.offered ? [{ label: t('Warteliste', 'Waiting list'), href: `${page}?tab=waiting`, icon: Icon.clock }] : []),
      { label: t('Prüfende', 'Examiners'), href: `${page}?tab=examiners`, icon: Icon.award },
    ];
    const work: RowAction[] = [
      ...(books && s.booked && !telc ? [{ label: t('Liste für telc', 'List for telc'), href: `${page}/telc`, icon: Icon.statement }] : []),
      ...(handles && s.booked ? [{ label: t('Briefe an alle', 'Letters to all'), href: `${page}/letters`, icon: Icon.statement }] : []),
      ...(handles && s.booked
        ? [{ label: t('E-Mail an alle Teilnehmenden', 'E-mail every candidate'), href: mailHref('exam_sitting', s.id, { back: href(view) }), icon: Icon.mail }]
        : []),
      ...(s.examiners.length && (plans || canAccess(user, 'staff'))
        ? [{ label: t('E-Mail an die Prüfenden', 'E-mail the examiners'), href: mailHref('exam_examiners', s.id, { back: href(view) }), icon: Icon.mail }]
        : []),
      ...(past && handles && s.booked && !results ? [{ label: t('Ergebnisse eintragen', 'Enter results'), href: `${page}/results`, icon: Icon.award }] : []),
    ];
    return { primary, actions: [...open, ...work.map((a, i) => (i === 0 ? { ...a, divide: true } : a))] };
  };

  // The actions column is as wide as a row's step needs: a button where a row has one, else „…".
  const stepped = items.some((s) => actionsOf(s).primary);
  const columns = [
    { label: t('Prüfung', 'Exam') },
    { label: t('Termin', 'Sitting'), className: 'hidden md:table-cell w-[10rem]' },
    sat
      ? { label: t('Teilnehmende', 'Candidates'), className: 'hidden md:table-cell w-[7.5rem]' }
      : { label: t('Anmeldeschluss', 'Entries close'), className: 'hidden lg:table-cell w-[9.5rem]' },
    sat ? { label: t('Ergebnisse', 'Results'), className: 'w-[7.5rem]' } : { label: t('Plätze', 'Places'), className: 'w-[5.5rem] sm:w-[10rem]' },
    ...(view === 'upcoming' ? [{ label: t('Bei telc gemeldet', 'Reported to telc'), className: 'hidden xl:table-cell w-[8.5rem]' }] : []),
    { label: t('Prüfende', 'Examiners'), className: 'hidden lg:table-cell w-[6rem]' },
    { label: '', className: stepped ? 'w-[3.5rem] sm:w-[10.5rem]' : 'w-[3.5rem]' },
  ];

  return (
    <>
      <PageHeader
        title={t('Prüfungen', 'Exams')}
        actions={
          exams.length ? (
            <FormDialog icon={Icon.calendar} tint="red" trigger={t('Neuer Termin', 'New sitting')} title={t('Neuer Prüfungstermin', 'New exam sitting')} triggerVariant="primary">
              <SittingForm action={createSittingAction} exams={exams} />
            </FormDialog>
          ) : null
        }
      />
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      {/* What the tabs do not say: who is booked into what is coming, and the next deadline — a telc entry cannot be filed after it. */}
      {ahead.booked || nextDeadline ? (
        <p className="-mt-3 mb-5 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
          <Tally tone="done" n={ahead.booked} label={t('in den kommenden Terminen gebucht', 'booked into the sittings ahead')} lang={lang} />
          {nextDeadline && toDeadline !== null ? (
            <span className={toDeadline <= 7 ? 'font-semibold text-[#9a5b00]' : undefined}>
              {t('Nächster Anmeldeschluss', 'Next deadline')} <b className="font-semibold text-[var(--casa-ink)]">{shortDate(nextDeadline, lang)}</b>
              {' · '}
              {daysLeftWords(toDeadline, t)}
            </span>
          ) : null}
        </p>
      ) : null}

      {/* The filters in force, each with its ×: the list says what it is narrowed to, the panel changes it. */}
      {chips.length ? (
        <p className="mb-4 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pr-1.5 pl-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line">
              {chip.label}
              <Link
                href={href(view, chip.key)}
                aria-label={t(`Filter „${chip.label}" entfernen`, `Remove the filter “${chip.label}”`)}
                className="grid size-5 place-items-center rounded-full text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)] [&_svg]:size-3"
              >
                {Icon.close}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <Card bleed>
        <ListBar
          tabs={VIEWS.map((v) => ({ key: v.key, label: pick(lang, v.label), href: href(v.key), count: counts[v.key] }))}
          active={view}
          search={{
            action: '/admin/catalogue/exams',
            value: search,
            placeholder: t('Prüfung, Datum oder Name', 'Exam, date or name'),
            keep: { view: view === 'upcoming' ? undefined : view, ...value },
          }}
          end={
            <ExamFilters
              base={{ view: view === 'upcoming' ? undefined : view, q: search }}
              exam={filters.examTypeId}
              month={filters.month}
              places={filters.places}
              examiner={filters.examiner}
              filed={filters.filed}
              exams={choices.exams}
              months={choices.months.map((m) => ({ value: m, label: monthLabel(m, lang, 0), year: m.slice(0, 4) }))}
              examiners={choices.examiners}
            />
          }
        />
        {items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Hier gibt es keine Prüfungstermine', 'No sittings here')}>
            {search ? t(`Kein Termin passt zu „${search}“.`, `No sitting matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table head={columns}>
            {groups.map((group) => [
              group.label ? <ListGroup key={group.key} label={group.label} count={group.items.length} span={columns.length} /> : null,
              ...group.items.map((s) => <SittingRow key={s.id} s={s} view={view} past={isPast(s)} left={daysTo(s.registrationDeadline)} {...actionsOf(s)} t={t} lang={lang} />),
            ])}
          </Table>
        )}
      </Card>
    </>
  );
}

const daysLeftWords = (n: number, t: T) => (n <= 0 ? t('heute', 'today') : n === 1 ? t('noch 1 Tag', '1 day left') : t(`noch ${n} Tage`, `${n} days left`));

/** „Fr., 13. Nov. · 08:30". */
const when = (s: ExamListItem, lang: WsLang) =>
  `${shortDate(s.startsAt, lang, { weekday: true })} · ${new Date(s.startsAt).toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}`;

function SittingRow({
  s,
  view,
  past,
  left,
  primary,
  actions,
  t,
  lang,
}: {
  s: ExamListItem;
  view: ExamView;
  past: boolean;
  left: number | null;
  primary: RowAction | null;
  actions: RowAction[];
  t: T;
  lang: WsLang;
}) {
  const sat = view === 'results' || view === 'past';
  const free = Math.max(0, s.capacity - s.booked - s.offered);
  const waiting = s.waiting + s.offered;
  const closing = !past && left !== null && left >= 0 && left <= 7;
  // A badge only for what is not simply offered: a draft or a called-off sitting, where the view does not say it.
  const status =
    s.status === 'cancelled' && view !== 'cancelled' ? (
      <Badge tone="danger">{pick(lang, SITTING_STATUS_LABELS.cancelled)}</Badge>
    ) : s.status === 'draft' && !past && view !== 'drafts' ? (
      <Badge tone="neutral">{pick(lang, SITTING_STATUS_LABELS.draft)}</Badge>
    ) : null;
  // Within a month: who examines and the report to telc are worth a word; further ahead an empty cell says enough.
  const soon = !past && Math.round((new Date(s.startsAt).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000) <= 30;
  // The past is quiet, except where its results are the work.
  const quiet = (past && view !== 'results') || s.status === 'cancelled';
  return (
    <TableRow interactive>
      <Cell href={`/admin/catalogue/exams/${s.id}`} className="max-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-[0.9rem] font-semibold ${quiet ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-ink)]'}`}>{s.examName}</span>
          {status}
        </span>
        {/* Under the name: what is new from the website; on a phone also the day, whose column is hidden there. */}
        {s.openRegistrations ? (
          <span className="mt-0.5 block truncate text-[0.8rem] font-semibold text-[#1d4e96]">
            {s.openRegistrations === 1 ? t('1 neue Anmeldung', '1 new registration') : t(`${s.openRegistrations} neue Anmeldungen`, `${s.openRegistrations} new registrations`)}
          </span>
        ) : null}
        <span className="mt-0.5 block truncate text-[0.8rem] text-[var(--casa-muted)] md:hidden">{when(s, lang)}</span>
      </Cell>
      <Cell className="hidden text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums md:table-cell">
        <time dateTime={new Date(s.startsAt).toISOString()}>{when(s, lang)}</time>
      </Cell>
      {sat ? (
        <Cell className="hidden text-[0.84rem] tabular-nums md:table-cell">{s.booked ? <span className="font-semibold">{s.booked}</span> : null}</Cell>
      ) : (
        <Cell className="hidden text-[0.84rem] whitespace-nowrap tabular-nums lg:table-cell">
          {s.registrationDeadline ? (
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className={left !== null && left < 0 ? 'text-[var(--casa-muted)]' : 'text-[#2b3546]'}>{shortDate(s.registrationDeadline, lang)}</span>
              {left !== null && left < 0 ? (
                <span className="text-xs text-[var(--casa-muted)]">{t('Geschlossen', 'Closed')}</span>
              ) : left !== null && left <= 30 ? (
                <span className={closing ? 'text-xs font-semibold text-[#9a5b00]' : 'text-xs text-[var(--casa-muted)]'}>{daysLeftWords(left, t)}</span>
              ) : null}
            </span>
          ) : null}
        </Cell>
      )}
      {sat ? (
        <Cell className="text-[0.84rem] tabular-nums">
          {s.booked ? (
            <span className={s.withResult < s.booked ? 'font-semibold text-[#9a5b00]' : 'font-semibold text-[#17693a]'}>
              {s.withResult} <span className="font-normal text-[var(--casa-muted)]">/ {s.booked}</span>
            </span>
          ) : null}
        </Cell>
      ) : (
        <Cell>
          {/* Booked against the places, as a bar from a tablet on; who waits, or full, under it. */}
          <span className="flex items-center gap-3 text-[0.84rem] whitespace-nowrap tabular-nums">
            <span className={s.booked ? 'font-semibold text-[var(--casa-ink)]' : 'text-[var(--casa-text-subtle)]'}>
              {s.booked}
              <span className="font-normal text-[var(--casa-text-subtle)]"> / {s.capacity}</span>
            </span>
            {s.booked ? (
              <span className="hidden w-14 sm:block">
                <Meter value={s.booked} max={s.capacity || s.booked} label={t(`${s.booked} von ${s.capacity} Plätzen gebucht`, `${s.booked} of ${s.capacity} places booked`)} tone={closing ? 'warning' : 'accent'} />
              </span>
            ) : null}
          </span>
          {waiting ? (
            <span className="mt-0.5 block text-[0.74rem] font-semibold whitespace-nowrap text-[#9a5b00]">{t(`${waiting} warten`, `${waiting} waiting`)}</span>
          ) : free === 0 && s.booked ? (
            <span className="mt-0.5 block text-[0.74rem] text-[var(--casa-muted)]">{t('Voll', 'Full')}</span>
          ) : null}
        </Cell>
      )}
      {view === 'upcoming' ? (
        <Cell className="hidden text-[0.84rem] tabular-nums xl:table-cell">
          {s.booked && (s.filed || soon || (left !== null && left <= 30)) ? (
            <span className={s.filed === s.booked ? 'font-semibold text-[#17693a]' : closing || soon ? 'font-semibold text-[#9a5b00]' : 'text-[#2b3546]'}>
              {s.filed} <span className="font-normal text-[var(--casa-muted)]">/ {s.booked}</span>
            </span>
          ) : null}
        </Cell>
      ) : null}
      <Cell className="hidden lg:table-cell">
        {s.examiners.length ? (
          <span className="flex flex-wrap gap-1">
            {s.examiners.map((x) => (
              <Owner key={x.id} name={x.name} />
            ))}
          </span>
        ) : soon && s.status !== 'cancelled' && s.booked ? (
          <span className="text-[0.78rem] font-semibold text-[#9a5b00]">{t('Noch offen', 'Not yet')}</span>
        ) : null}
      </Cell>
      <Cell align="right">
        <RowActions label={t(`Aktionen: ${s.examName}, ${when(s, lang)}`, `Actions: ${s.examName}, ${when(s, lang)}`)} primary={primary} actions={actions} compact />
      </Cell>
    </TableRow>
  );
}
