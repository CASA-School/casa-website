import Link from 'next/link';
import type { ReactNode } from 'react';

import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange, euros, ListBar, ListEmpty, ListGroup, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { RowActions, type RowAction } from '@/components/admin/row-actions';
import { Badge, Button, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { FLAG_LABELS, openFlagsByCode, type FlagCode } from '@/lib/admin/flags';
import { capitalise, num, pick, relativeDays, wsLocale, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { toDateInputValue } from '@/lib/dates';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { canAccess } from '@/lib/admin/access';
import { groupByMonth, monthHeading } from '@/lib/admin/days';
import { requireModule } from '@/lib/admin/guard';
import { LEARNER_STAGE_LABELS, listCountries, listDeletedPeople, listPeople, peopleCounts, type PeopleView } from '@/lib/admin/people';
import { restorePersonAction } from './actions';
import { PersonForm } from './person-form';
import { SessionMark } from '@/components/admin/session-mark';

/**
 * The person register.
 *
 * One row per human who has ever been in touch, with the rows a staff member
 * has linked as duplicates folded underneath their survivor. This is the table
 * FileMaker never had — its Contact, Person and Student tables each held part
 * of the same people with nothing connecting them (docs/FILEMAKER_LESSONS.md
 * §1) — and the reason every queue detail screen now points here.
 *
 * A row is the person and, under the name, what they are here for: the course
 * running now or starting next, otherwise the address they wrote from; then the
 * level a teacher confirmed, what is open under them (enquiries, registrations,
 * offers in play), the dates of that course, and when they were added
 * (2026-10-15). A list carries what staff act on — nationality and birth date
 * are on the person's page (Rahman, 2026-10-16). The views answer the
 * questions the office brings to a register, and nothing twice (Rahman,
 * 2026-10-18: "avoid redundancies"): who is coming, who is here, who is here
 * with nothing booked after, who owes money, who has finished. The tabs carry
 * the counts, so no line above repeats them; „Neu" is a word on the row. What
 * is open under a person is the column, worked in the inboxes. The learner stages are
 * FileMaker's Rookie, Runner, LastDance and Unicorn, worked out from the
 * booked periods instead of typed (2026-10-16, docs/schoolman/bookings.md). Open flags are one quiet
 * line above the list, each a link to that work list; they are cleared on the
 * record they belong to, not here (docs/ADMIN_WORKSPACE.md §Design standards 4, §Lists).
 *
 * In months (Rahman, 2026-10-21: „add year and month as to know which are the newest … an action
 * button"): by the month a person was added, the newest first; „Kommend" by the month their course
 * begins, „Ohne Folgekurs" by the month it ends; „Zahlung offen" stays one list, most owed first. Each
 * row ends in its actions — a booking, a reminder or a payment on the booking that owes most, an
 * e-mail, their letters — with the step the view is for as a button: „Folgekurs buchen" where nothing
 * is booked after, „Erinnern" where money is open.
 */

/** The register's views, and „Gelöscht" for whoever may delete (and so restore) a person. */
type RegisterView = PeopleView | 'deleted';

// In the order a learner goes through them; who owes money before the archive.
const VIEWS: readonly { key: RegisterView; label: Bilingual }[] = [
  { key: 'all', label: { de: 'Alle', en: 'All' } },
  { key: 'coming', label: LEARNER_STAGE_LABELS.coming },
  { key: 'in_course', label: LEARNER_STAGE_LABELS.in_course },
  { key: 'last', label: LEARNER_STAGE_LABELS.last },
  { key: 'owing', label: { de: 'Zahlung offen', en: 'Unpaid' } },
  { key: 'finished', label: LEARNER_STAGE_LABELS.finished },
];

const shortDay = (value: Date, lang: WsLang) => value.toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' });

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const user = await requireModule('people');
  const { t, lang } = await getI18n();
  const canEdit = canAccess(user, 'people', 'edit');
  const canBook = canAccess(user, 'bookings', 'edit');
  const canRestore = canAccess(user, 'people', 'full');
  const views = canRestore ? [...VIEWS, { key: 'deleted' as const, label: { de: 'Gelöscht', en: 'Deleted' } }] : VIEWS;
  const rawView = firstParam(params.view);
  const view: RegisterView = views.some((v) => v.key === rawView) ? (rawView as RegisterView) : 'all';
  const deletedView = view === 'deleted';
  const [{ items, total }, counts, flagCounts, countries, deleted] = await Promise.all([
    deletedView ? Promise.resolve({ items: [], total: 0 }) : listPeople({ search, view, limit: PAGE_SIZE, offset: offsetFor(page) }),
    peopleCounts(),
    openFlagsByCode(),
    canEdit ? listCountries() : Promise.resolve([]),
    canRestore ? listDeletedPeople({ search: deletedView ? search : undefined, limit: deletedView ? PAGE_SIZE : 0, offset: deletedView ? offsetFor(page) : 0 }) : Promise.resolve(null),
  ]);
  const href = (key: RegisterView) => (key === 'all' ? '/admin/people' : `/admin/people?view=${key}`);
  const error = firstParam(params.error);

  const flagEntries = (Object.entries(flagCounts) as [FlagCode, number][]).filter(([, n]) => n > 0);
  const hide = 'hidden md:table-cell';
  // What is open and when they were added give way first on a narrower screen: the month heading says when.
  const hideLg = 'hidden lg:table-cell';
  // …except in „Zahlung offen", where the amount is what the list is about.
  const hideOpen = view === 'owing' ? hide : hideLg;

  type Row = (typeof items)[number];
  // The month a row belongs to in this view: added, or its course's start or end; none for the money view.
  const monthOf: ((p: Row) => Date | null) | null =
    view === 'coming' ? (p) => p.course?.start ?? null : view === 'last' ? (p) => p.course?.end ?? null : view === 'owing' ? null : (p) => p.createdAt;
  const heading = (month: string) => {
    const m = monthHeading(month, lang);
    return view === 'coming' ? t(`Beginn im ${m}`, `Starting in ${m}`) : view === 'last' ? t(`Ende im ${m}`, `Ending in ${m}`) : m;
  };
  const groups = monthOf
    ? [
        ...groupByMonth(
          items.filter((p) => monthOf(p)),
          (p) => monthOf(p)!
        ).map(({ month, rows }) => ({ key: month, label: heading(month), rows })),
        { key: 'undated', label: t('Ohne Termin', 'No dates'), rows: items.filter((p) => !monthOf(p)) },
      ].filter((g) => g.rows.length)
    : [{ key: view, label: '', rows: items }];
  const actionsOf = (p: Row): { primary: RowAction | null; actions: RowAction[] } => {
    const book: RowAction = { label: t('Buchung anlegen', 'New booking'), href: `/admin/people/${p.id}?book=1`, icon: Icon.bookings };
    const remind: RowAction | null = p.owedBookingId
      ? { label: t('Zahlungserinnerung', 'Payment reminder'), href: `/admin/bookings/${p.owedBookingId}/letter?kind=reminder`, icon: Icon.mail }
      : null;
    const primary =
      canBook && view === 'last'
        ? { ...book, label: t('Folgekurs buchen', 'Book the next course') }
        : canBook && view === 'owing' && remind
          ? { ...remind, label: t('Erinnern', 'Remind') }
          : null;
    const actions: RowAction[] = [
      ...(canBook && view !== 'last' ? [book] : []),
      ...(canBook && remind && view !== 'owing' ? [remind] : []),
      ...(canBook && p.owedBookingId ? [{ label: t('Zahlung erfassen', 'Record payment'), href: `/admin/bookings/${p.owedBookingId}?pay=1`, icon: Icon.money }] : []),
      ...(p.primaryEmail
        ? [{ label: t('E-Mail schreiben', 'Write an email'), href: `mailto:${p.primaryEmail}`, icon: Icon.mail, divide: canBook }]
        : []),
      { label: t('Anfragen & Buchungen', 'Enquiries & bookings'), href: `/admin/people/${p.id}?tab=cases`, icon: Icon.registrations, divide: !p.primaryEmail && canBook },
      { label: t('Briefe', 'Letters'), href: `/admin/people/${p.id}?tab=letters`, icon: Icon.statement },
    ];
    return { primary, actions };
  };
  const wideActions = canBook && (view === 'last' || view === 'owing');
  // Under the name: where they stand (unless the view says it), then their course — after its colour, the
  // part of the day it is taught in (2026-10-21) — or, for someone who has only enquired, their address.
  const aboutOf = (person: Row): ReactNode => {
    const stage = person.stage && view !== person.stage ? pick(lang, LEARNER_STAGE_LABELS[person.stage]) : null;
    const course = person.course
      ? person.course.current
        ? person.course.name
        : [person.course.name, `${t('ab', 'from')} ${shortDay(new Date(person.course.start), lang)}`].filter(Boolean).join(' · ')
      : null;
    const rest = course ?? (person.stage ? null : person.primaryEmail);
    if (!stage && !rest) return undefined;
    return (
      <>
        {stage}
        {stage && rest ? ' · ' : null}
        {course && person.course?.session ? <SessionMark session={person.course.session} lang={lang} className="mr-1.5" /> : null}
        {rest}
      </>
    );
  };

  return (
    <>
      <PageHeader
        title={t('Teilnehmende', 'Students')}
        actions={
          canEdit ? (
            <FormDialog icon={Icon.person} tint="ink"
              trigger={t('Person hinzufügen', 'Add person')}
              title={params.then === 'book' ? t('Neue Buchung: wer?', 'New booking: who?') : t('Neue Person', 'Add a person')}
              triggerVariant="primary"
              defaultOpen={params.new === '1'}
            >
              {params.then === 'book' ? (
                <PersonForm countries={countries} hidden={{ then: 'book' }} submitLabel={t('Weiter zur Buchung', 'On to the booking')} />
              ) : (
                <PersonForm countries={countries} />
              )}
            </FormDialog>
          ) : null
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      {flagEntries.length > 0 ? (
        <p className="-mt-3 mb-6 flex flex-wrap gap-x-5 gap-y-1">
          {flagEntries.map(([code, n]) => (
            <Link
              key={code}
              href={`/admin/people/flags?code=${code}`}
              className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)] [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
              <span aria-hidden="true" className="text-[#b45309]">
                {Icon.flag}
              </span>
              {num(lang, n)} {lang === 'en' ? pick(lang, FLAG_LABELS[code]).toLowerCase() : pick(lang, FLAG_LABELS[code])}
            </Link>
          ))}
        </p>
      ) : null}

      <Card bleed>
        <ListBar
          tabs={views.map((v) => ({ key: v.key, label: pick(lang, v.label), href: href(v.key), count: v.key === 'deleted' ? (deleted?.total ?? 0) : counts[v.key] }))}
          active={view}
          search={{ action: '/admin/people', value: search, placeholder: t('Name oder E-Mail', 'Name or email'), keep: { view: view === 'all' ? undefined : view } }}
        />
        {deletedView && deleted ? (
          deleted.items.length === 0 ? (
            <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Niemand gelöscht', 'Nobody deleted')} />
          ) : (
            // Deleted people have no page to open; each row says when and by whom, and brings them back.
            <Table
              head={[
                t('Teilnehmende', 'Student'),
                { label: t('Gelöscht', 'Deleted'), className: 'w-[14rem]' },
                { label: '', className: 'w-[11rem]' },
              ]}
            >
              {deleted.items.map((person) => (
                <TableRow key={person.id}>
                  <Cell className="max-w-0">
                    <RecordName name={person.displayName} about={person.primaryEmail ?? undefined} />
                  </Cell>
                  <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                    {capitalise(relativeDays(person.deletedAt, lang))}
                    {person.deletedByName ? ` · ${person.deletedByName}` : ''}
                  </Cell>
                  <Cell className="text-right">
                    <form action={restorePersonAction}>
                      <input type="hidden" name="personId" value={person.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        {t('Wiederherstellen', 'Restore')}
                      </Button>
                    </form>
                  </Cell>
                </TableRow>
              ))}
            </Table>
          )
        ) : items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : view !== 'all' ? t('Hier ist niemand', 'Nobody here') : t('Noch keine Teilnehmenden', 'No students yet')}>
            {search ? t(`Niemand passt zu „${search}“.`, `Nobody matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table
            head={[
              t('Teilnehmende', 'Student'),
              { label: t('Niveau', 'Level'), className: `w-[6.5rem] ${hide}` },
              { label: t('Offen', 'Open'), className: `w-[12rem] ${hideOpen}` },
              { label: t('Zeitraum', 'Dates'), className: `w-[12.5rem] ${hide}` },
              { label: t('Angelegt', 'Added'), className: `w-[8.5rem] ${hideLg}` },
              { label: '', className: wideActions ? 'w-[11rem]' : 'w-[3.5rem]' },
            ]}
          >
            {groups.map((group) => [
              group.label ? <ListGroup key={group.key} label={group.label} count={group.rows.length} span={6} /> : null,
              ...group.rows.map((person) => (
              <TableRow key={person.id} interactive>
                <Cell href={`/admin/people/${person.id}`} className="max-w-0">
                  <RecordName name={person.displayName} about={aboutOf(person)} />
                </Cell>
                <Cell className={hide}>
                  {person.level ? (
                    <span className="inline-flex h-6 items-center rounded-lg bg-[#e6f5ec] px-2 text-[0.78rem] font-extrabold text-[#14653a] ring-1 ring-[#b7dfc6] ring-inset tabular-nums">
                      {person.level}
                    </span>
                  ) : null}
                </Cell>
                <Cell className={hideOpen}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {person.openCases > 0 ? (
                      <Badge tone="accent">
                        {person.openCases === 1 ? t('1 offene Anfrage', '1 open enquiry') : t(`${num(lang, person.openCases)} offene Anfragen`, `${num(lang, person.openCases)} open enquiries`)}
                      </Badge>
                    ) : null}
                    {person.owed > 0.005 ? <Badge tone="warning">{euros(person.owed)}</Badge> : null}
                  </span>
                </Cell>
                {/* The course they are in or about to start: when they are here. Nationality is on their page. */}
                <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] tabular-nums ${hide}`}>
                  {person.course ? dayRange(toDateInputValue(person.course.start), toDateInputValue(person.course.end), lang) : null}
                </Cell>
                <Cell className={`text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)] ${hideLg}`}>
                  {capitalise(relativeDays(person.createdAt, lang))}
                </Cell>
                <Cell align="right">
                  <RowActions label={t(`Aktionen: ${person.displayName}`, `Actions: ${person.displayName}`)} {...actionsOf(person)} />
                </Cell>
              </TableRow>
              )),
            ])}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/people" page={page} total={deletedView ? (deleted?.total ?? 0) : total} params={params} />
    </>
  );
}
