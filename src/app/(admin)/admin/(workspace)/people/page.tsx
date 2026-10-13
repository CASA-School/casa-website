import Link from 'next/link';

import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Pagination } from '@/components/admin/pagination';
import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  Input,
  PageHeader,
  Table,
  TableRow,
  TINTS,
} from '@/components/admin/ui';
import { FLAG_LABELS, openFlagsByCode, type FlagCode } from '@/lib/admin/flags';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { listCountries, listPeople } from '@/lib/admin/people';
import { cn } from '@/lib/utils';
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
 * Beside the search, the open-flag count by kind, each a link to that work
 * list. Flags are cleared on the record they belong to, not here: the register
 * tells you WHAT needs a look, the record tells you what you are looking at.
 */
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

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <form method="get" action="/admin/people" className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--casa-text-subtle)]"
            >
              {Icon.search}
            </span>
            <Input
              type="search"
              name="q"
              defaultValue={search ?? ''}
              placeholder="Name or email"
              aria-label="Search people"
              className="pl-9"
            />
          </div>
        </form>

        {flagEntries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {flagEntries.map(([code, n]) => (
              <Link
                key={code}
                href={`/admin/people/flags?code=${code}`}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-opacity hover:opacity-80',
                  TINTS.sun
                )}
              >
                {Icon.flag}
                {n} {FLAG_LABELS[code].toLowerCase()}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={search ? 'Nobody matches that search' : 'No people yet'}
          description={search ? 'Try a shorter term.' : 'People appear here as records arrive.'}
        />
      ) : (
        <Card bleed>
          <Table
            head={['Name', 'Email', 'Nationality', 'Born', { label: 'Since', align: 'right' }]}
          >
            {items.map((person) => (
              <TableRow key={person.id} interactive>
                <Cell href={`/admin/people/${person.id}`} className="font-semibold">
                  {person.displayName}
                </Cell>
                <Cell className="text-sm text-[var(--casa-text-subtle)]">
                  {person.primaryEmail ?? '—'}
                </Cell>
                <Cell className="text-sm">
                  {person.nationalityName ??
                    (person.nationalityRaw ? (
                      <span className="flex items-center gap-2">
                        {person.nationalityRaw}
                        <Badge tone="warning">unrecognised</Badge>
                      </span>
                    ) : (
                      <span className="text-[var(--casa-text-subtle)]">—</span>
                    ))}
                </Cell>
                <Cell className="text-sm">
                  <DateText value={person.birthDate} />
                </Cell>
                <Cell align="right" className="text-xs text-[var(--casa-text-subtle)]">
                  <DateText value={person.createdAt} compact />
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      <Pagination basePath="/admin/people" page={page} total={total} params={params} />
    </>
  );
}
