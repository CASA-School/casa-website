import Link from 'next/link';

import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { FLAG_LABELS, listOpenFlags, type FlagCode } from '@/lib/admin/flags';

const ENTITY_LABELS: Record<string, string> = {
  person: 'Person',
  enquiry: 'Enquiry',
  course_registration: 'Course registration',
  exam_registration: 'Exam registration',
  career_application: 'Application',
  placement_attempt: 'Placement',
};

const isFlagCode = (value: string | undefined): value is FlagCode =>
  value !== undefined && value in FLAG_LABELS;

/**
 * The open-flag work list.
 *
 * Oldest first, because a flag is a question intake could not answer and the
 * longest-unanswered one has been wrong on the most screens for the longest
 * time. Each row opens the record it belongs to; the flag is cleared there,
 * next to the value it is about, never from this list — clearing a flag
 * without seeing the record is how "as written" values become permanent.
 */
export default async function FlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const filter = isFlagCode(code) ? code : undefined;
  const flags = await listOpenFlags(filter);

  return (
    <>
      <PageHeader
        backHref="/admin/people"
        backLabel="People"
        eyebrow="Needs a look"
        title={filter ? FLAG_LABELS[filter] : 'Everything flagged'}
        description="Values intake kept as written because it could not settle them, and records that may belong to someone already on file."
      />

      {filter ? (
        <p className="mb-4 text-sm text-[var(--casa-text-subtle)]">
          Showing one kind.{' '}
          <Link href="/admin/people/flags" className="font-medium text-[var(--casa-accent-text)]">
            Show every kind
          </Link>
        </p>
      ) : null}

      {flags.length === 0 ? (
        <EmptyState
          title="Nothing needs a look"
          description="Every flag intake has raised has been answered by someone."
        />
      ) : (
        <Card bleed>
          <Table
            head={['What', 'Who', 'Record', 'Submitted as', { label: 'Raised', align: 'right' }]}
          >
            {flags.map((flag) => (
              <TableRow key={flag.id} interactive>
                <Cell href={flag.href} className="font-semibold">
                  {FLAG_LABELS[flag.code]}
                </Cell>
                <Cell className="text-sm">{flag.subject}</Cell>
                <Cell>
                  <Badge tone="quiet">{ENTITY_LABELS[flag.entity] ?? flag.entity}</Badge>
                </Cell>
                <Cell className="text-sm text-[var(--casa-text-subtle)]">
                  {typeof flag.detail?.raw === 'string' ? (
                    <span className="font-mono text-xs">“{flag.detail.raw}”</span>
                  ) : Array.isArray(flag.detail?.candidates) ? (
                    `${flag.detail.candidates.length} possible ${flag.detail.candidates.length === 1 ? 'match' : 'matches'}`
                  ) : (
                    '—'
                  )}
                </Cell>
                <Cell align="right" className="text-xs text-[var(--casa-text-subtle)]">
                  <DateText value={flag.createdAt} compact />
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
