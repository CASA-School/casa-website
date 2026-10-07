'use client';

import { Link } from '@/i18n/navigation';
import { CasaImage as Image } from '@/components/ui/casa-image';
import { useMemo, useState } from 'react';

import type { TeamSpotlight } from '@/lib/content/types';
import { TeamPlaceholder } from '@/components/signatures/team-placeholder';


type TeamDirectoryProps = {
  title: string;
  description: string;
  team: TeamSpotlight[];
  contactLabel: string;
  contactHref: string;
};

/*
 * THE TEAM, WITH FACES (2026-10-07). Every card opens with the same 4:5 frame:
 * the colleague's portrait, or one of the Bremer Stadtmusikanten until a
 * portrait is on file, so the grid stays even. „Alle" shows everyone at once,
 * grouped under the areas the filters name; the search box and the „show more"
 * button went, because a team of this size is quicker to look at than to search.
 */
function MemberCard({ member }: { member: TeamSpotlight }) {
  return (
    <article className="h-full overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]/70">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--casa-surface-subtle)]">
        {member.photo ? (
          <Image
            src={member.photo.src}
            alt={member.photo.alt}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className="object-cover"
            style={{ objectPosition: member.photo.position ?? 'center 30%' }}
          />
        ) : member.placeholder ? (
          <TeamPlaceholder animal={member.placeholder} />
        ) : null}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-[var(--casa-ink)]">{member.name}</h3>
        <p className="mt-0.5 text-sm font-semibold text-[var(--casa-muted)]">{member.title}</p>
        {member.areas || member.highlight ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{member.areas ?? member.highlight}</p>
        ) : null}
      </div>
    </article>
  );
}

function MemberGrid({ members }: { members: TeamSpotlight[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {members.map((member) => (
        <li key={member.id}>
          <MemberCard member={member} />
        </li>
      ))}
    </ul>
  );
}

export function TeamDirectory({ title, description, team, contactLabel, contactHref }: TeamDirectoryProps) {
  const locale = team[0]?.locale ?? 'en';
  const allLabel = locale === 'de' ? 'Alle' : 'All';
  const groups = useMemo(() => Array.from(new Set(team.map((member) => member.role))), [team]);
  const roles = useMemo(() => [allLabel, ...groups], [allLabel, groups]);
  const [selectedRole, setSelectedRole] = useState<string | null>(allLabel);
  const activeRole = selectedRole && roles.includes(selectedRole) ? selectedRole : allLabel;

  return (
    <>
      <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:p-8">
        <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
        <p className="mt-3 max-w-measure text-sm text-[var(--casa-muted)] md:text-base">{description}</p>

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={locale === 'de' ? 'Team nach Bereich filtern' : 'Filter the team by area'}>
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={activeRole === role}
              onClick={() => setSelectedRole(role)}
              className={
                activeRole === role
                  ? 'rounded-full border border-[color:var(--casa-blue)] bg-[var(--casa-blue)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--casa-ink)]'
                  : 'rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]'
              }
            >
              {role}
            </button>
          ))}
        </div>

        {activeRole === allLabel ? (
          <div className="mt-8 space-y-10">
            {groups.map((group) => (
              <section key={group} aria-labelledby={`team-group-${group}`}>
                <h3 id={`team-group-${group}`} className="mb-4 text-xl font-bold text-[var(--casa-ink)]">{group}</h3>
                <MemberGrid members={team.filter((member) => member.role === group)} />
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <MemberGrid members={team.filter((member) => member.role === activeRole)} />
          </div>
        )}

        <div className="mt-8">
          <Link
            href={contactHref}
            className="inline-flex rounded-lg bg-[var(--casa-ink-deep)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
            data-casa-track="true"
            data-casa-label={contactLabel}
          >
            {contactLabel}
          </Link>
        </div>
      </section>

    </>
  );
}
