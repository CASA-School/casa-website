import Link from 'next/link';

import { linkPersonAction, resolveFlagAction } from '@/app/(admin)/admin/(workspace)/actions';
import { Button, Card, DateText } from './ui';
import { Icon } from './icons';
import { FLAG_LABELS, type RecordFlag } from '@/lib/admin/flags';
import type { PersonSummary } from '@/lib/admin/people';

/**
 * The person behind a record, and whatever intake could not settle about it.
 *
 * Sits at the top of the rail on every queue detail screen, above Status,
 * because identity comes before workflow: "who is this, and have we met them"
 * is the first question a staff member asks of a new registration, and it is
 * the question FileMaker never let anyone answer once
 * (docs/FILEMAKER_LESSONS.md §1).
 *
 * The duplicate control is deliberately one button per candidate and no
 * "merge". Linking records that the new row IS the existing person; it
 * rewrites nothing and is undone from the person screen. The candidates come
 * from the open `duplicate_candidate` flag, so once someone has answered the
 * question — linked, or cleared the flag as "no, different person" — the
 * panel stops asking.
 */
export function PersonPanel({
  person,
  candidates,
  flags,
  returnTo,
}: {
  person: PersonSummary | null;
  candidates: readonly (PersonSummary & {
    reason: 'email' | 'name_and_birth_date';
  })[];
  flags: readonly RecordFlag[];
  returnTo: string;
}) {
  const open = flags.filter((f) => f.resolvedAt === null);
  const duplicateFlag = open.find((f) => f.code === 'duplicate_candidate');
  const otherFlags = open.filter((f) => f.code !== 'duplicate_candidate');
  const linked = person && person.canonicalId !== person.id;

  return (
    <Card title="Person" description={linked ? 'Linked to an existing person.' : undefined}>
      {person ? (
        <Link
          href={`/admin/people/${person.canonicalId}`}
          className="group flex items-center justify-between gap-3 rounded-lg border border-ws-line-soft px-3 py-2.5 transition-colors hover:border-[var(--casa-blue)]/45 hover:bg-ws-sunk"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{person.displayName}</span>
            <span className="block text-xs text-[var(--casa-text-subtle)]">
              {person.nationalityName ?? person.nationalityRaw ?? 'Nationality not given'}
              {person.birthDate ? (
                <>
                  {' · born '}
                  <DateText value={person.birthDate} />
                </>
              ) : null}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-[var(--casa-text-subtle)] transition-transform group-hover:translate-x-0.5"
          >
            {Icon.chevronRight}
          </span>
        </Link>
      ) : null}

      {duplicateFlag && person && candidates.length > 0 ? (
        <div className="mt-4 rounded-lg border border-[var(--casa-warning-text)]/30 bg-[var(--casa-warning-text)]/8 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--casa-warning-text)]">
            {Icon.flag} {FLAG_LABELS.duplicate_candidate}
          </p>
          <ul className="mt-3 space-y-2">
            {candidates.map((candidate) => (
              <li key={candidate.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/admin/people/${candidate.id}`}
                  className="min-w-0 text-sm font-medium hover:underline"
                >
                  <span className="block truncate">{candidate.displayName}</span>
                  <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                    {candidate.reason === 'email' ? 'Same email' : 'Same surname and date of birth'}
                    {' · since '}
                    <DateText value={candidate.createdAt} compact />
                  </span>
                </Link>
                <form action={linkPersonAction}>
                  <input type="hidden" name="duplicateId" value={person.id} />
                  <input type="hidden" name="survivorId" value={candidate.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <Button type="submit" variant="secondary" size="sm">
                    Same person
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form
            action={resolveFlagAction}
            className="mt-3 border-t border-[var(--casa-warning-text)]/20 pt-2.5"
          >
            <input type="hidden" name="flagId" value={duplicateFlag.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button type="submit" variant="ghost" size="sm">
              Not a duplicate
            </Button>
          </form>
        </div>
      ) : null}

      {otherFlags.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {otherFlags.map((flag) => (
            <li
              key={flag.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-ws-line-soft px-3 py-2"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {Icon.flag} {FLAG_LABELS[flag.code]}
                </span>
                {typeof flag.detail?.raw === 'string' ? (
                  <span className="mt-0.5 block text-xs text-[var(--casa-text-subtle)]">
                    “{flag.detail.raw}”
                  </span>
                ) : null}
              </span>
              <form action={resolveFlagAction} className="shrink-0">
                <input type="hidden" name="flagId" value={flag.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  aria-label={`Clear: ${FLAG_LABELS[flag.code]}`}
                >
                  Clear
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
