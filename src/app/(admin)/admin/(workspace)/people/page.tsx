import Link from 'next/link';

import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Badge, Card, Cell, DateText, PageHeader, relativeDays, Table, TableRow } from '@/components/admin/ui';
import { FLAG_LABELS, openFlagsByCode, type FlagCode } from '@/lib/admin/flags';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { listCountries, listPeople } from '@/lib/admin/people';
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
 * running now or starting next, otherwise the address they wrote from. Open
 * flags are one quiet line above the list, each a link to that work list;
 * they are cleared on the record they belong to, not here (docs/ADMIN_WORKSPACE.md
 * §Design standards 4, §Lists).
 */

const shortDay = (value: Date) => value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const user = await requireModule('people');
  const canEdit = canAccess(user, 'people', 'edit');
  const [{ items, total }, flagCounts, countries] = await Promise.all([
    listPeople({ search, limit: PAGE_SIZE, offset: offsetFor(page) }),
    openFlagsByCode(),
    canEdit ? listCountries() : Promise.resolve([]),
  ]);
  const error = firstParam(params.error);

  const flagEntries = (Object.entries(flagCounts) as [FlagCode, number][]).filter(([, n]) => n > 0);
  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader
        title="Students"
        actions={
          canEdit ? (
            <FormDialog trigger="Add person" title="Add a person" triggerVariant="primary">
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

      {flagEntries.length > 0 ? (
        <p className="-mt-1 mb-3 flex flex-wrap gap-x-5 gap-y-1">
          {flagEntries.map(([code, n]) => (
            <Link
              key={code}
              href={`/admin/people/flags?code=${code}`}
              className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-ink)] [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
              <span aria-hidden="true" className="text-[#b45309]">
                {Icon.flag}
              </span>
              {n} {FLAG_LABELS[code].toLowerCase()}
            </Link>
          ))}
        </p>
      ) : null}

      <Card bleed>
        <ListBar search={{ action: '/admin/people', value: search, placeholder: 'Name or email' }} />
        {items.length === 0 ? (
          <ListEmpty title={search ? 'Nothing found' : 'No students yet'}>
            {search ? `Nobody matches “${search}”.` : null}
          </ListEmpty>
        ) : (
          <Table
            head={[
              'Student',
              { label: 'Nationality', className: `w-[13rem] ${hide}` },
              { label: 'Born', className: `w-[9rem] ${hide}` },
              { label: 'Added', className: 'w-[7.5rem] md:w-[8.5rem]' },
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
                          : `${person.course.name} · from ${shortDay(new Date(person.course.start))}`
                        : (person.primaryEmail ?? undefined)
                    }
                  />
                </Cell>
                <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>
                  {person.nationalityName ??
                    (person.nationalityRaw ? (
                      <span className="flex items-center gap-2">
                        <span className="truncate">{person.nationalityRaw}</span>
                        <Badge tone="warning">Unrecognised</Badge>
                      </span>
                    ) : null)}
                </Cell>
                <Cell className={`text-[0.84rem] whitespace-nowrap text-[#2b3546] ${hide}`}>
                  {person.birthDate ? <DateText value={person.birthDate} /> : null}
                </Cell>
                <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                  {capital(relativeDays(person.createdAt))}
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
