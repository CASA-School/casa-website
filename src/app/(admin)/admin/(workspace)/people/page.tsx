import Link from 'next/link';

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
} from '@/components/admin/ui';
import { FLAG_LABELS, openFlagsByCode, type FlagCode } from '@/lib/admin/flags';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { listPeople } from '@/lib/admin/people';

/**
 * The person register.
 *
 * One row per human who has ever been in touch, with the rows a staff member
 * has linked as duplicates folded underneath their survivor. This is the table
 * FileMaker never had — its Contact, Person and Student tables each held part
 * of the same people with nothing connecting them (docs/FILEMAKER_LESSONS.md
 * §1) — and the reason every queue detail screen now points here.
 *
 * The band across the top is the open-flag count by kind. Flags are cleared
 * on the record they belong to, not here: the register tells you WHAT needs a
 * look, the record tells you what you are looking at.
 */
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = firstParam(params.q);
  const page = clampPage(params.page);

  const [{ items, total }, flagCounts] = await Promise.all([
    listPeople({ search, limit: PAGE_SIZE, offset: offsetFor(page) }),
    openFlagsByCode(),
  ]);

  const flagEntries = (Object.entries(flagCounts) as [FlagCode, number][]).filter(([, n]) => n > 0);

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="People"
        description="Everyone who has enquired, registered or sat a placement. One row per person, however many times they have written in."
      />

      {flagEntries.length > 0 ? (
        <Card
          title="Needs a look"
          description="Raised by intake when a value could not be settled. Cleared on the record itself."
          className="mb-5"
        >
          <ul className="flex flex-wrap gap-2">
            {flagEntries.map(([code, n]) => (
              <li key={code}>
                <Link
                  href={`/admin/people/flags?code=${code}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-ws-line-soft px-3 py-1.5 text-sm transition-colors hover:border-[var(--casa-blue)]/45 hover:bg-ws-sunk"
                >
                  <span className="text-[var(--casa-warning-text)]">{Icon.flag}</span>
                  {FLAG_LABELS[code]}
                  <Badge tone="warning">{n}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <form method="get" action="/admin/people" className="mb-4 flex max-w-md gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Name or email"
          aria-label="Search people"
        />
      </form>

      {items.length === 0 ? (
        <EmptyState
          title={search ? 'Nobody matches that search' : 'No people yet'}
          description={
            search
              ? 'Try a shorter term, or part of an email address.'
              : 'A person is created the moment anything arrives through the public site.'
          }
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
                        <Badge tone="warning">as written</Badge>
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
