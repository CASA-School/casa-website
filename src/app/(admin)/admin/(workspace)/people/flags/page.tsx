import { ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Card, Cell, PageHeader, relativeDays, Table, TableRow } from '@/components/admin/ui';
import { FLAG_LABELS, listOpenFlags, openFlagsByCode, type FlagCode } from '@/lib/admin/flags';

const ENTITY_LABELS: Record<string, string> = {
  person: 'Student',
  enquiry: 'Enquiry',
  course_registration: 'Course registration',
  exam_registration: 'Exam registration',
  career_application: 'Application',
  placement_attempt: 'Placement',
  booking: 'Booking',
};

const isFlagCode = (value: string | undefined): value is FlagCode =>
  value !== undefined && value in FLAG_LABELS;

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The open-flag work list.
 *
 * Oldest first, because a flag is a question intake could not answer and the
 * longest-unanswered one has been wrong on the most screens for the longest
 * time. Each row opens the record it belongs to; the flag is cleared there,
 * next to the value it is about, never from this list — clearing a flag
 * without seeing the record is how "as written" values become permanent.
 *
 * The kinds are the list's views. Under each name is what the flag says,
 * except in a kind's own view, whose tab already says it (§Lists).
 */
export default async function FlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const filter = isFlagCode(code) ? code : undefined;
  const [flags, counts] = await Promise.all([listOpenFlags(filter), openFlagsByCode()]);

  const kinds = (Object.keys(FLAG_LABELS) as FlagCode[]).filter((k) => (counts[k] ?? 0) > 0 || k === filter);
  const total = kinds.reduce((n, k) => n + (counts[k] ?? 0), 0);
  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader backHref="/admin/people" backLabel="Students" title="Flags" />

      <Card bleed>
        {kinds.length > 1 || filter ? (
          <ListBar
            tabs={[
              { key: 'all', label: 'All', href: '/admin/people/flags', count: total },
              ...kinds.map((k) => ({
                key: k,
                label: FLAG_LABELS[k],
                href: `/admin/people/flags?code=${k}`,
                count: counts[k],
              })),
            ]}
            active={filter ?? 'all'}
          />
        ) : null}
        {flags.length === 0 ? (
          <ListEmpty title="Nothing needs a look" />
        ) : (
          <Table
            head={[
              'Name',
              { label: 'Submitted as', className: `w-[14rem] ${hide}` },
              { label: 'Record', className: `w-[11rem] ${hide}` },
              { label: 'Raised', className: 'w-[7.5rem] md:w-[8.5rem]' },
            ]}
          >
            {flags.map((flag) => (
              <TableRow key={flag.id} interactive>
                <Cell href={flag.href} className="max-w-0">
                  <RecordName name={flag.subject} about={filter ? undefined : FLAG_LABELS[flag.code]} />
                </Cell>
                <Cell className={`text-[0.84rem] text-[#2b3546] ${hide}`}>
                  {typeof flag.detail?.raw === 'string'
                    ? `“${flag.detail.raw}”`
                    : Array.isArray(flag.detail?.candidates)
                      ? `${flag.detail.candidates.length} possible ${flag.detail.candidates.length === 1 ? 'match' : 'matches'}`
                      : null}
                </Cell>
                <Cell className={`text-[0.84rem] text-[var(--casa-muted)] ${hide}`}>
                  {ENTITY_LABELS[flag.entity] ?? capital(flag.entity.replace(/_/g, ' '))}
                </Cell>
                <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                  {capital(relativeDays(flag.createdAt))}
                </Cell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
