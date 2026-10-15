import Link from 'next/link';

import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Tally } from '@/components/admin/inbox';
import { euros, ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { FLAG_LABELS, openFlagsByCode, type FlagCode } from '@/lib/admin/flags';
import { capitalise, num, pick, relativeDays, wsLocale, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { listCountries, listPeople, peopleCounts, type PeopleView } from '@/lib/admin/people';
import { PersonForm } from './person-form';

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
 * offers in play) and what they still owe (2026-10-15). The views answer the
 * questions staff bring to a register — who is here now, who has something open,
 * who owes money — and the counts line says how many. Open flags are one quiet
 * line above the list, each a link to that work list; they are cleared on the
 * record they belong to, not here (docs/ADMIN_WORKSPACE.md §Design standards 4, §Lists).
 */

const VIEWS: readonly { key: PeopleView; label: Bilingual }[] = [
  { key: 'all', label: { de: 'Alle', en: 'All' } },
  { key: 'in_course', label: { de: 'Im Kurs', en: 'In a course' } },
  { key: 'open', label: { de: 'Offene Vorgänge', en: 'Something open' } },
  { key: 'owing', label: { de: 'Zu zahlen', en: 'Owing' } },
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
  const rawView = firstParam(params.view);
  const view: PeopleView = VIEWS.some((v) => v.key === rawView) ? (rawView as PeopleView) : 'all';
  const [{ items, total }, counts, flagCounts, countries] = await Promise.all([
    listPeople({ search, view, limit: PAGE_SIZE, offset: offsetFor(page) }),
    peopleCounts(),
    openFlagsByCode(),
    canEdit ? listCountries() : Promise.resolve([]),
  ]);
  const href = (key: PeopleView) => (key === 'all' ? '/admin/people' : `/admin/people?view=${key}`);
  const error = firstParam(params.error);

  const flagEntries = (Object.entries(flagCounts) as [FlagCode, number][]).filter(([, n]) => n > 0);
  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader
        title={t('Teilnehmende', 'Students')}
        actions={
          canEdit ? (
            <FormDialog
              trigger={t('Person hinzufügen', 'Add person')}
              title={t('Neue Person', 'Add a person')}
              triggerVariant="primary"
              defaultOpen={params.new === '1'}
            >
              <PersonForm countries={countries} />
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

      {/* Who is here, who has something open, who still owes: the register at a glance. */}
      <p className="-mt-3 mb-2 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="done" n={counts.in_course} label={t('im Kurs', 'in a course')} lang={lang} />
        <Tally tone="new" n={counts.open} label={t('mit offenen Vorgängen', 'with something open')} lang={lang} />
        <Tally tone="waiting" n={counts.owing} label={t('mit offenen Beträgen', 'owing money')} lang={lang} />
      </p>

      {flagEntries.length > 0 ? (
        <p className="mb-6 flex flex-wrap gap-x-5 gap-y-1">
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
          tabs={VIEWS.map((v) => ({ key: v.key, label: pick(lang, v.label), href: href(v.key), count: counts[v.key] }))}
          active={view}
          search={{ action: '/admin/people', value: search, placeholder: t('Name oder E-Mail', 'Name or email'), keep: { view: view === 'all' ? undefined : view } }}
        />
        {items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : view !== 'all' ? t('Hier ist niemand', 'Nobody here') : t('Noch keine Teilnehmenden', 'No students yet')}>
            {search ? t(`Niemand passt zu „${search}“.`, `Nobody matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table
            head={[
              t('Teilnehmende', 'Student'),
              { label: t('Niveau', 'Level'), className: `w-[6.5rem] ${hide}` },
              { label: t('Offen', 'Open'), className: `w-[12rem] ${hide}` },
              { label: t('Nationalität', 'Nationality'), className: `w-[11rem] ${hide}` },
              { label: t('Angelegt', 'Added'), className: 'w-[7.5rem] md:w-[8.5rem]' },
            ]}
          >
            {items.map((person) => (
              <TableRow key={person.id} interactive>
                <Cell href={`/admin/people/${person.id}`} className="max-w-0">
                  <RecordName
                    name={person.displayName}
                    about={
                      person.course
                        ? person.course.current
                          ? person.course.name
                          : `${person.course.name} · ${t('ab', 'from')} ${shortDay(new Date(person.course.start), lang)}`
                        : (person.primaryEmail ?? undefined)
                    }
                  />
                </Cell>
                <Cell className={hide}>
                  {person.level ? (
                    <span className="inline-flex h-6 items-center rounded-lg bg-[#e6f5ec] px-2 text-[0.78rem] font-extrabold text-[#14653a] ring-1 ring-[#b7dfc6] ring-inset tabular-nums">
                      {person.level}
                    </span>
                  ) : null}
                </Cell>
                <Cell className={hide}>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {person.openCases > 0 ? (
                      <Badge tone="accent">
                        {person.openCases === 1 ? t('1 Vorgang', '1 case') : t(`${num(lang, person.openCases)} Vorgänge`, `${num(lang, person.openCases)} cases`)}
                      </Badge>
                    ) : null}
                    {person.owed > 0.005 ? <Badge tone="warning">{euros(person.owed)}</Badge> : null}
                  </span>
                </Cell>
                <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>
                  {person.nationalityName ??
                    (person.nationalityRaw ? (
                      <span className="flex items-center gap-2">
                        <span className="truncate">{person.nationalityRaw}</span>
                        <Badge tone="warning">{t('Nicht erkannt', 'Unrecognised')}</Badge>
                      </span>
                    ) : null)}
                </Cell>
                <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                  {capitalise(relativeDays(person.createdAt, lang))}
                </Cell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/people" page={page} total={total} params={params} />
    </>
  );
}
