import Link from 'next/link';
import { notFound } from 'next/navigation';

import { unlinkPersonAction } from '../../actions';
import { Icon } from '@/components/admin/icons';
import {
  Badge,
  BirthDate,
  Button,
  Card,
  DateText,
  DetailList,
  PageHeader,
} from '@/components/admin/ui';
import { activityFor, describeActivity } from '@/lib/admin/activity';
import { listFileMakerLinks } from '@/lib/admin/filemaker-links';
import { FLAG_LABELS, listFlags } from '@/lib/admin/flags';
import {
  getPerson,
  latestConfirmedLevel,
  personTimeline,
  type TimelineItem,
} from '@/lib/admin/people';
import { relativeDays } from '@/components/admin/ui';
import { normaliseStatus, STATUS_LABELS, STATUS_TONES } from '@/lib/admin/queues';

const SALUTATIONS: Record<string, string> = {
  mr: 'Mr',
  ms: 'Ms',
  mx: 'Mx',
  neutral: '',
};

const KIND_LABELS: Record<TimelineItem['kind'], string> = {
  enquiry: 'Enquiry',
  course: 'Course registration',
  exam: 'Exam registration',
  review: 'Placement',
};

/**
 * One person, and everything that has ever come in under their name.
 *
 * The timeline is the point of the screen. A registration on its own says
 * "someone wants a B1 course"; the same registration under a person who
 * enquired twice, sat a placement and was confirmed A2.2 by a teacher says
 * something quite different, and staff should not have to search four queues
 * to find that out.
 *
 * If this row was linked INTO another, the page redirects its reader to the
 * survivor by rendering the survivor: `getPerson` follows `merged_into`. The
 * rows that were linked into THIS one are listed at the bottom, each with an
 * undo, because a wrong link is the one identity mistake that must stay cheap
 * to reverse.
 */
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPerson(id);

  if (!person) {
    notFound();
  }

  const [timeline, confirmed, flags, activity, fileMakerLinks] = await Promise.all([
    personTimeline(person.id),
    latestConfirmedLevel(person.id),
    listFlags('person', person.id),
    activityFor('person', person.id),
    listFileMakerLinks('person', person.id),
  ]);

  const title = [SALUTATIONS[person.salutation ?? ''] ?? '', person.displayName]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <PageHeader
        backHref="/admin/people"
        backLabel="All people"
        eyebrow="Person"
        title={title}
        description={
          person.id !== id
            ? 'Opened from a linked record.'
            : `In touch since ${person.createdAt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.`
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card title="History">
            {timeline.length === 0 ? (
              <p className="text-sm text-[var(--casa-text-subtle)]">Nothing yet.</p>
            ) : (
              <ol className="divide-y divide-ws-line-soft">
                {timeline.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      href={item.href}
                      className="group -mx-2 flex items-start justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-ws-sunk"
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge tone="quiet">{KIND_LABELS[item.kind]}</Badge>
                          <span className="text-sm font-semibold">{item.title}</span>
                          {item.status ? (
                            <Badge tone={STATUS_TONES[normaliseStatus(item.status)]}>
                              {STATUS_LABELS[normaliseStatus(item.status)]}
                            </Badge>
                          ) : null}
                        </span>
                        {item.detail ? (
                          <span className="mt-1 block truncate text-sm text-[var(--casa-text-subtle)]">
                            {item.detail}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--casa-text-subtle)]">
                        <DateText value={item.at} compact />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {person.linkedDuplicates.length > 0 ? (
            <Card title="Linked records">
              <ul className="divide-y divide-ws-line-soft">
                {person.linkedDuplicates.map((dup) => (
                  <li key={dup.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium">{dup.displayName}</span>
                      <span className="block text-xs text-[var(--casa-text-subtle)]">
                        Created <DateText value={dup.createdAt} /> · {dup.createdBy}
                      </span>
                    </span>
                    <form action={unlinkPersonAction}>
                      <input type="hidden" name="personId" value={dup.id} />
                      <input type="hidden" name="returnTo" value={`/admin/people/${person.id}`} />
                      <Button type="submit" variant="ghost" size="sm">
                        Unlink
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card title="Details">
            <DetailList
              items={[
                {
                  label: 'Email',
                  value:
                    person.emails.length > 0 ? (
                      <ul className="space-y-1">
                        {person.emails.map((e) => (
                          <li key={e.address}>
                            <a
                              href={`mailto:${e.address}`}
                              className="font-medium text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                            >
                              {e.address}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null,
                },
                {
                  label: 'Phone',
                  value:
                    person.phones.length > 0 ? (
                      <ul className="space-y-1">
                        {person.phones.map((p) => (
                          <li key={p.number}>
                            <a href={`tel:${p.number}`} className="font-medium">
                              {p.number}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null,
                },
                {
                  label: 'Nationality',
                  value:
                    person.nationalityName ??
                    (person.nationalityRaw ? (
                      <span className="flex items-center gap-2">
                        {person.nationalityRaw}
                        <Badge tone="warning">unrecognised</Badge>
                      </span>
                    ) : null),
                },
                {
                  label: 'Date of birth',
                  value: <BirthDate value={person.birthDate} />,
                },
                {
                  label: 'Confirmed level',
                  value: confirmed ? (
                    <span className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-display)] text-lg leading-none">
                        {confirmed.level}
                      </span>
                      <span className="text-xs text-[var(--casa-text-subtle)]">
                        {confirmed.reviewerName ?? 'A former colleague'} ·{' '}
                        <DateText value={confirmed.decidedAt} />
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--casa-text-subtle)]">—</span>
                  ),
                },
                { label: 'Record created by', value: person.createdBy },
              ]}
            />
          </Card>

          {flags.filter((f) => !f.resolvedAt).length > 0 ? (
            <Card title="Needs a look">
              <ul className="space-y-2 text-sm">
                {flags
                  .filter((f) => !f.resolvedAt)
                  .map((f) => (
                    <li key={f.id} className="flex items-center gap-2">
                      <span className="text-[var(--casa-warning-text)]">{Icon.flag}</span>
                      {FLAG_LABELS[f.code]}
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}

          {fileMakerLinks.length > 0 ? (
            <Card title="In FileMaker">
              <ul className="space-y-1.5 text-sm">
                {fileMakerLinks.map((link) => (
                  <li key={link.id} className="flex items-center justify-between gap-2">
                    <span>
                      {link.sourceLayout}{' '}
                      <span className="font-mono text-xs text-[var(--casa-text-subtle)]">
                        {link.sourcePrimaryKey ?? `#${link.sourceRecordId}`}
                      </span>
                    </span>
                    <span className="text-xs text-[var(--casa-text-subtle)]">
                      <DateText value={link.linkedAt} compact />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {activity.length > 0 ? (
            <Card title="Identity decisions">
              <ol className="space-y-2.5">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-2.5 text-xs">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-[var(--casa-text-subtle)]"
                    >
                      {Icon.check}
                    </span>
                    <span className="text-[var(--casa-text-subtle)]">
                      <span className="font-semibold text-[var(--casa-ink)]">
                        {entry.staffName ?? 'Someone'}
                      </span>{' '}
                      {describeActivity(entry)} · {relativeDays(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
