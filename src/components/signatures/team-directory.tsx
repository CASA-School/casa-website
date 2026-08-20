'use client';

import Link from 'next/link';
import { CasaImage as Image } from '@/components/ui/casa-image';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Instagram, Linkedin, Mail, X } from 'lucide-react';

import type { TeamSpotlight } from '@/lib/content/types';

/**
 * Initials, shown where a member has no portrait.
 *
 * CASA publishes twelve real colleagues and no photographs of them, and the only
 * images on hand are synthetic portraits generated for six people who do not
 * exist (CLAUDE.md hard rule 3). Putting a made-up face beside a real name would
 * be a worse misrepresentation than the invented staff this replaced, so the card
 * shows initials and waits for real portraits taken with consent.
 */
function Monogram({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      aria-hidden
      className="flex h-full w-full items-center justify-center bg-[var(--casa-warm-soft)] text-3xl font-bold tracking-tight text-[var(--casa-accent-text)]"
    >
      {initials}
    </span>
  );
}

type TeamDirectoryProps = {
  title: string;
  description: string;
  team: TeamSpotlight[];
  contactLabel: string;
  contactHref: string;
};

function SocialIcon({ platform }: { platform: NonNullable<TeamSpotlight['socials']>[number]['platform'] }) {
  if (platform === 'linkedin') return <Linkedin className="h-4 w-4" aria-hidden />;
  if (platform === 'instagram') return <Instagram className="h-4 w-4" aria-hidden />;
  return <Mail className="h-4 w-4" aria-hidden />;
}

/** True when the modal would show more than the card already does. */
function hasFullProfile(member: TeamSpotlight) {
  return Boolean(member.bio || member.photo || member.socials?.length);
}

export function TeamDirectory({ title, description, team, contactLabel, contactHref }: TeamDirectoryProps) {
  const locale = team[0]?.locale ?? 'en';
  const allLabel = locale === 'de' ? 'Alle' : 'All';
  const roles = useMemo(() => [allLabel, ...Array.from(new Set(team.map((member) => member.role)))], [allLabel, team]);
  const [selectedRole, setSelectedRole] = useState<string | null>(allLabel);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCountByKey, setVisibleCountByKey] = useState<Record<string, number>>({});
  const activeRole = selectedRole && roles.includes(selectedRole) ? selectedRole : allLabel;
  const filterKey = `${activeRole}::${searchQuery.trim().toLowerCase()}`;
  const visibleCount = visibleCountByKey[filterKey] ?? 6;

  const filtered = useMemo(() => {
    const roleFiltered = activeRole === allLabel ? team : team.filter((member) => member.role === activeRole);
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return roleFiltered;
    }

    return roleFiltered.filter((member) =>
      [member.name, member.title, member.role, member.areas, member.focus, member.highlight]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [activeRole, allLabel, searchQuery, team]);
  const visibleMembers = filtered.slice(0, visibleCount);

  const activeMember = useMemo(
    () => team.find((member) => member.id === activeMemberId) || null,
    [activeMemberId, team]
  );

  useEffect(() => {
    if (!activeMemberId) return;

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMemberId(null);
      }
    };

    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [activeMemberId]);

  useEffect(() => {
    if (!activeMemberId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeMemberId]);

  return (
    <>
      <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:p-8">
        <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
        <p className="mt-3 max-w-measure text-sm text-[var(--casa-muted)] md:text-base">{description}</p>

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Team role filters">
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] p-3">
          <label htmlFor="team-directory-search" className="sr-only">
            {locale === 'de' ? 'Team durchsuchen' : 'Search team'}
          </label>
          <input
            id="team-directory-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={locale === 'de' ? 'Nach Name, Rolle oder Fokus suchen' : 'Search by name, role, or focus'}
            className="h-10 w-full max-w-md rounded-xl border border-[color:var(--casa-sand)] bg-white px-3 text-sm text-[var(--casa-ink)] placeholder:text-[var(--casa-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
          />
          <p className="text-xs font-semibold text-[var(--casa-muted)]">
            {locale === 'de'
              ? `Zeige ${Math.min(visibleMembers.length, filtered.length)} von ${filtered.length}`
              : `Showing ${Math.min(visibleMembers.length, filtered.length)} of ${filtered.length}`}
          </p>
        </div>

        {/*
          Four columns from xl, not three.

          The portraits looked "too tall" but the ratio was never wrong —
          `aspect-[4/5]` is the standard portrait crop and swapping it for
          something squarer would crop heads once real photographs land. The
          height came from CARD WIDTH: three columns in the 1360px content
          measure gives 440px cards, and 440 x 5/4 is a 550px portrait.

          Measured at 1360 with gap-5: 3 cols -> 440px wide / 550px tall;
          4 cols -> 325px wide / 406px tall. Same crop, a quarter less height,
          and a team grid reads better dense anyway.

          The lg step is kept at 3 so the cards do not become stamps between
          1024 and 1280, where the content measure is still under 1200.
        */}
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleMembers.map((member) => (
            <li key={member.id}>
              <article className="h-full overflow-hidden rounded-3xl bg-[var(--casa-bg)] shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70">
                <div className="casa-media-overlay relative aspect-[4/5] overflow-hidden">
                  {member.photo ? (
                    <Image
                      src={member.photo.src}
                      alt={member.photo.alt}
                      fill
                      sizes="(min-width: 1280px) 24vw, (min-width: 640px) 44vw, 92vw"
                      className="object-cover"
                    />
                  ) : (
                    <Monogram name={member.name} />
                  )}
                </div>

                <div className="space-y-3 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{member.role}</p>
                    <h3 className="mt-2 text-lg font-bold text-[var(--casa-ink)]">{member.name}</h3>
                    <p className="text-sm font-semibold text-[var(--casa-muted)]">{member.title}</p>
                  </div>

                  {/*
                    `areas` first: CASA publishes a responsibility list, and it is
                    the useful line on the card — someone with a telc question can
                    see who handles telc exams. `highlight` is kept as a fallback
                    for when written profiles exist.
                  */}
                  {member.areas || member.highlight ? (
                    <p className="text-sm leading-relaxed text-[var(--casa-muted)]">
                      {member.areas ?? member.highlight}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <ul className="flex items-center gap-2">
                      {(member.socials ?? []).map((social) => (
                        <li key={social.href}>
                          <a
                            href={social.href}
                            target={social.href.startsWith('http') ? '_blank' : undefined}
                            rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                            aria-label={social.label}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--casa-sand)] text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]"
                          >
                            <SocialIcon platform={social.platform} />
                          </a>
                        </li>
                      ))}
                    </ul>

                    {/*
                      Only offer the modal when it has something the card does not
                      already show. With CASA's published data — a name, a role and
                      a list of areas — the modal would repeat the card verbatim,
                      and a button that opens the same three lines is a dead end
                      dressed as an action.
                    */}
                    {hasFullProfile(member) ? (
                      <button
                        type="button"
                        onClick={() => setActiveMemberId(member.id)}
                        className="rounded-lg bg-[var(--casa-ink-deep)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]"
                      >
                        {locale === 'de' ? 'Vollprofil ansehen' : 'View full profile'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="mt-6 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/35 px-4 py-3 text-sm text-[var(--casa-muted)]">
            {locale === 'de'
              ? 'Keine Teammitglieder zu dieser Suche gefunden.'
              : 'No team members found for this search.'}
          </p>
        ) : null}

        {visibleCount < filtered.length ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() =>
                setVisibleCountByKey((current) => ({
                  ...current,
                  [filterKey]: (current[filterKey] ?? 6) + 6,
                }))
              }
              className="rounded-lg border border-[color:var(--casa-sand)] bg-white px-4 py-2 text-sm font-semibold text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]"
            >
              {locale === 'de' ? 'Mehr Teammitglieder anzeigen' : 'Show more team members'}
            </button>
          </div>
        ) : null}

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

      {activeMember ? createPortal(
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[color:var(--casa-ink-deep)]/65 px-3 py-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeMember.name} profile`}
          onClick={() => setActiveMemberId(null)}
        >
          <div className="flex min-h-full items-end justify-center sm:items-center">
            <div
              className="w-full max-w-3xl overflow-hidden rounded-t-3xl bg-white shadow-[var(--shadow-modal)] sm:my-6 sm:rounded-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-3rem)] md:grid md:grid-cols-[0.9fr_1.1fr]">
                <div className="casa-media-overlay relative aspect-[4/5] overflow-hidden md:aspect-auto md:h-auto md:min-h-full">
                  {activeMember.photo ? (
                    <Image
                      src={activeMember.photo.src}
                      alt={activeMember.photo.alt}
                      fill
                      sizes="(min-width: 1024px) 36vw, 92vw"
                      className="object-cover"
                    />
                  ) : (
                    <Monogram name={activeMember.name} />
                  )}
                </div>
                <div className="p-5 sm:p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{activeMember.role}</p>
                      <h3 className="mt-2 text-xl font-bold text-[var(--casa-ink)] sm:text-2xl">{activeMember.name}</h3>
                      <p className="text-sm font-semibold text-[var(--casa-muted)]">{activeMember.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMemberId(null)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--casa-sand)] text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--casa-blue)]"
                      aria-label="Close profile"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {activeMember.bio ? (
                    <p className="mt-5 text-sm leading-relaxed text-[var(--casa-muted)]">{activeMember.bio}</p>
                  ) : null}

                  {activeMember.areas || activeMember.focus ? (
                    <div className="mt-5 rounded-xl bg-[var(--casa-warm-soft)]/35 p-4">
                      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                        {locale === 'de' ? 'Zuständig für' : 'Responsible for'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--casa-ink)]">
                        {activeMember.areas ?? activeMember.focus}
                      </p>
                    </div>
                  ) : null}

                  <ul className="mt-5 flex flex-wrap items-center gap-2">
                    {(activeMember.socials ?? []).map((social) => (
                      <li key={social.href}>
                        <a
                          href={social.href}
                          target={social.href.startsWith('http') ? '_blank' : undefined}
                          rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--casa-sand)] px-3 py-1.5 text-xs font-semibold text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-warm-soft)]"
                        >
                          <SocialIcon platform={social.platform} />
                          {social.platform}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
