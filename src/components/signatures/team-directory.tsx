'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';

import type { TeamSpotlight } from '@/lib/content/types';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TeamPlaceholder } from '@/components/signatures/team-placeholder';
import { useSiteCopy } from '@/components/cms/site-copy-provider';

type TeamDirectoryProps = {
  title: string;
  description: string;
  team: TeamSpotlight[];
  contactLabel: string;
  contactHref: string;
};

function Portrait({ member, sizes, className }: { member: TeamSpotlight; sizes: string; className?: string }) {
  if (member.photo) {
    return (
      <Image
        src={member.photo.src}
        alt={member.photo.alt}
        fill
        sizes={sizes}
        className={cn('object-cover', className)}
        style={{ objectPosition: member.photo.position ?? 'center 25%' }}
      />
    );
  }

  return member.placeholder ? (
    <div className={cn('absolute inset-0', className)}>
      <TeamPlaceholder animal={member.placeholder} />
    </div>
  ) : null;
}

/*
 * ONE PERSON, OPENED (2026-10-27). Every card opens the same popup: a larger
 * portrait, the name and title, what they look after, and, for a colleague who
 * chose to share them, their own few lines and the languages they speak. Most
 * colleagues have no bio, so nothing on a card says whether there is one; the
 * popup simply has less in it.
 */
function MemberDialog({ member, contactLabel, contactHref }: { member: TeamSpotlight; contactLabel: string; contactHref: string }) {
  const { say } = useSiteCopy();
  const locale = member.locale;
  const areas = member.areas ?? member.highlight;
  const facts = [
    areas ? { label: say(locale, 'Zuständig für', 'Looks after'), value: areas } : null,
    member.languages ? { label: say(locale, 'Sprachen', 'Languages'), value: member.languages } : null,
  ].filter((fact) => fact !== null);
  const bio = member.bio?.filter(Boolean) ?? [];

  return (
    <DialogContent
      closeLabel={say(locale, 'Schließen', 'Close')}
      brandStripe
      className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col p-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
        {/* A phone puts a small portrait beside the name; from sm the portrait is the left column. */}
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-start sm:gap-x-8">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--casa-surface-subtle)] sm:row-span-2">
            <Portrait member={member} sizes="(min-width: 640px) 208px, 88px" />
          </div>
          <div className="pr-10 sm:pt-1">
            <DialogTitle className="text-balance sm:text-3xl">{member.name}</DialogTitle>
            <DialogDescription className="mt-1 hyphens-auto">{member.title}</DialogDescription>
          </div>
          {facts.length > 0 || bio.length > 0 ? (
            <div className="col-span-2 sm:col-span-1 sm:col-start-2">
              {facts.length > 0 ? (
                <dl className="space-y-3">
                  {facts.map((fact) => (
                    <div key={fact.label}>
                      <dt className="text-sm font-semibold text-[var(--casa-muted)]">{fact.label}</dt>
                      <dd className="mt-0.5 text-base leading-snug text-[var(--casa-ink)]">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {bio.length > 0 ? (
                <div
                  className={cn(
                    'max-w-measure space-y-4 text-base leading-relaxed text-[var(--casa-ink)]',
                    facts.length > 0 && 'mt-6 border-t border-[color:var(--casa-sand)] pt-6'
                  )}
                >
                  {bio.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 border-t border-[color:var(--casa-sand)] px-6 py-4 sm:flex sm:justify-end sm:px-8">
        <Link
          href={contactHref}
          className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--casa-ink-deep)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)] sm:w-auto"
          data-casa-track="true"
          data-casa-label={contactLabel}
        >
          {contactLabel}
        </Link>
      </div>
    </DialogContent>
  );
}

/*
 * THE TEAM, WITH FACES (2026-10-07). Every person opens with the same square
 * frame: the colleague's portrait, or one of the Bremer Stadtmusikanten until a
 * portrait is on file, so the grid stays even. „Alle" shows everyone at once,
 * grouped under the areas the filters name; the search box and the „show more"
 * button went, because a team of this size is quicker to look at than to search.
 *
 * Square, five to a row on a wide screen and two on a phone: the first version
 * gave each person a 4:5 card, 386px tall at 1440 and nearly the whole screen
 * on a phone. The portraits are plain `next/image`, not CasaImage — that one
 * swaps any photograph outside the photo register for a stand-in panel, and a
 * portrait already has its own stand-in.
 *
 * The whole card opens the popup: a button laid over it, named „Mehr über …",
 * so the heading stays a heading and a screen reader hears whose card it is.
 * The arrow in the corner is for touch screens, which have no hover.
 */
function MemberCard({ member, contactLabel, contactHref }: { member: TeamSpotlight; contactLabel: string; contactHref: string }) {
  const { say } = useSiteCopy();
  const areas = member.areas ?? member.highlight;

  return (
    <Dialog>
      <article className="group relative break-words">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--casa-surface-subtle)]">
          <Portrait
            member={member}
            sizes="(min-width: 1280px) 250px, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
            className="transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <span
            aria-hidden
            className="absolute bottom-2.5 right-2.5 inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-[var(--casa-ink)] shadow-sm transition-colors group-hover:bg-[var(--casa-blue)] group-hover:text-white"
          >
            <ArrowRight className="size-4" />
          </span>
        </div>
        <h3 className="mt-3 text-base font-bold leading-snug text-[var(--casa-ink)] underline-offset-4 group-hover:underline">{member.name}</h3>
        {/* Hyphenated: two to a row on a phone, „Bundesfreiwilligendienst" and „Qualitätsmanagement" broke mid-word. */}
        <p className="mt-0.5 hyphens-auto text-sm font-semibold leading-snug text-[var(--casa-muted)]">{member.title}</p>
        {areas ? <p className="mt-1.5 hyphens-auto text-sm leading-snug text-[var(--casa-muted)]">{areas}</p> : null}
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={say(member.locale, 'Mehr über {name}', 'More about {name}', { name: member.name })}
            className="absolute -inset-1.5 rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
          />
        </DialogTrigger>
      </article>
      <MemberDialog member={member} contactLabel={contactLabel} contactHref={contactHref} />
    </Dialog>
  );
}

function MemberGrid({ members, contactLabel, contactHref }: { members: TeamSpotlight[]; contactLabel: string; contactHref: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
      {members.map((member) => (
        <li key={member.id}>
          <MemberCard member={member} contactLabel={contactLabel} contactHref={contactHref} />
        </li>
      ))}
    </ul>
  );
}

export function TeamDirectory({ title, description, team, contactLabel, contactHref }: TeamDirectoryProps) {
  const { say } = useSiteCopy();
  const locale = team[0]?.locale ?? 'en';
  const allLabel = say(locale, 'Alle', 'All');
  const groups = useMemo(() => Array.from(new Set(team.map((member) => member.role))), [team]);
  const roles = useMemo(() => [allLabel, ...groups], [allLabel, groups]);
  const [selectedRole, setSelectedRole] = useState<string | null>(allLabel);
  const activeRole = selectedRole && roles.includes(selectedRole) ? selectedRole : allLabel;

  return (
    <>
      <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:p-8">
        <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
        <p className="mt-3 max-w-measure text-sm text-[var(--casa-muted)] md:text-base">{description}</p>

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={say(locale, 'Team nach Bereich filtern', 'Filter the team by area')}>
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
                <MemberGrid members={team.filter((member) => member.role === group)} contactLabel={contactLabel} contactHref={contactHref} />
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <MemberGrid members={team.filter((member) => member.role === activeRole)} contactLabel={contactLabel} contactHref={contactHref} />
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
