import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { canAccess, type WorkspaceModule } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getOverviewFacts, type OverviewFacts } from '@/lib/admin/overview';
import { toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

/**
 * Overview — the start page (Rahman, 2026-10-14: "a overview or a start page
 * that is basically like any other dashboard, just a clean interface with some
 * shortcut cards", then "improve … so they look premium"). Shortcuts into every
 * area the colleague may open, grouped as the sidebar is; each card carries one
 * live figure — how many are open, the next sitting, the list in force — and a
 * pill when something new is waiting. Cards follow access. More goes here
 * later, one thing at a time.
 */

type Tone = 'blue' | 'green' | 'sun' | 'red' | 'ink';

/** An icon on a soft gradient with a fine inner edge: the card's subject at a glance. */
const TILES: Record<Tone, string> = {
  blue: 'from-[#eef8fe] to-[#d7eefb] text-[#0b5f8f] ring-[#c5e4f6]',
  green: 'from-[#eefaf3] to-[#d6f0e0] text-[#137a3c] ring-[#c6e8d2]',
  sun: 'from-[#fffbe6] to-[#fff0b8] text-[#7a5d00] ring-[#f3e2a0]',
  red: 'from-[#fef1f1] to-[#fbdcdd] text-[#a3050f] ring-[#f4cacc]',
  ink: 'from-[#f4f6fa] to-[#e3e8f0] text-[#2b3546] ring-[#d8dfe9]',
};

/** One live figure: a count before its word ("5 open"), or a word before its date ("Next sitting 16 Oct"). */
type Figure = { value: string; label?: string; lead?: string } | null;
type Pill = { text: string; tone: 'new' | 'warn' } | null;

type Card = {
  title: string;
  href: string;
  module: WorkspaceModule;
  icon: ReactNode;
  tone: Tone;
  figure?: (f: OverviewFacts) => Figure;
  pill?: (f: OverviewFacts) => Pill;
};

const fmt = (n: number) => n.toLocaleString('en-GB');
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const shortDay = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const monthYear = (d: Date) => new Date(`${toDateInputValue(d)}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const GROUPS: { label: string; cards: Card[] }[] = [
  {
    label: 'Inbox',
    cards: [
      {
        title: 'Enquiries',
        href: '/admin/enquiries',
        module: 'enquiries',
        icon: Icon.enquiries,
        tone: 'blue',
        figure: (f) => ({ value: fmt(f.enquiriesOpen), label: 'open' }),
        pill: (f) => (f.enquiriesNew ? { text: `${f.enquiriesNew} new`, tone: 'new' } : null),
      },
      {
        title: 'Registrations',
        href: '/admin/registrations',
        module: 'registrations',
        icon: Icon.registrations,
        tone: 'blue',
        figure: (f) => ({ value: fmt(f.registrationsOpen), label: 'open' }),
        pill: (f) => (f.registrationsNew ? { text: `${f.registrationsNew} new`, tone: 'new' } : null),
      },
    ],
  },
  {
    label: 'School',
    cards: [
      {
        title: 'Students',
        href: '/admin/people',
        module: 'people',
        icon: Icon.people,
        tone: 'green',
        figure: (f) => ({ value: fmt(f.students), label: 'in the register' }),
      },
      {
        title: 'Placement tests',
        href: '/admin/placement',
        module: 'placement',
        icon: Icon.placement,
        tone: 'green',
        figure: (f) => (f.placementToReview ? { value: fmt(f.placementToReview), label: 'to review' } : { value: 'All reviewed' }),
      },
      {
        title: 'Bookings',
        href: '/admin/bookings',
        module: 'bookings',
        icon: Icon.bookings,
        tone: 'sun',
        figure: (f) => ({ value: fmt(f.bookingsCurrent), label: 'current' }),
      },
      {
        title: 'Offers',
        href: '/admin/offers',
        module: 'offers',
        icon: Icon.offers,
        tone: 'sun',
        figure: (f) => ({ value: fmt(f.offersOpen), label: 'open' }),
        pill: (f) => (f.offersToFollowUp ? { text: `${f.offersToFollowUp} to follow up`, tone: 'warn' } : null),
      },
      {
        title: 'Courses',
        href: '/admin/catalogue',
        module: 'catalogue',
        icon: Icon.catalogue,
        tone: 'red',
        figure: (f) => ({ value: fmt(f.cohortsUpcoming), label: plural(f.cohortsUpcoming, 'cohort ahead', 'cohorts ahead') }),
      },
      {
        title: 'Exams',
        href: '/admin/catalogue/exams',
        module: 'catalogue',
        icon: Icon.calendar,
        tone: 'red',
        figure: (f) => (f.nextExam ? { lead: 'Next sitting', value: shortDay(f.nextExam) } : null),
      },
    ],
  },
  {
    label: 'Management',
    cards: [
      {
        title: 'Applications',
        href: '/admin/applications',
        module: 'applications',
        icon: Icon.applications,
        tone: 'green',
        figure: (f) => ({ value: fmt(f.applicationsOpen), label: 'open' }),
      },
      {
        title: 'Kursplanung',
        href: '/admin/kursplanung',
        module: 'kursplanung',
        icon: Icon.kursplanung,
        tone: 'red',
        figure: (f) => (f.plannedTo ? { lead: 'Planned to', value: monthYear(f.plannedTo) } : null),
      },
      {
        title: 'Website',
        href: '/admin/website',
        module: 'website',
        icon: Icon.website,
        tone: 'blue',
        figure: (f) => (f.websiteDrafts ? { value: fmt(f.websiteDrafts), label: plural(f.websiteDrafts, 'draft') } : { value: 'Up to date' }),
        pill: (f) => (f.websitePending ? { text: `${f.websitePending} to approve`, tone: 'warn' } : null),
      },
      {
        title: 'Prices',
        href: '/admin/settings/prices',
        module: 'prices',
        icon: Icon.money,
        tone: 'sun',
        figure: (f) => (f.pricesSince ? { lead: 'In force since', value: `${shortDay(f.pricesSince)} ${f.pricesSince.getFullYear()}` } : null),
      },
      {
        title: 'Team',
        href: '/admin/team',
        module: 'team',
        icon: Icon.team,
        tone: 'green',
        figure: (f) => ({ value: fmt(f.colleagues), label: plural(f.colleagues, 'colleague') }),
      },
      {
        title: 'Activity',
        href: '/admin/activity',
        module: 'activity',
        icon: Icon.note,
        tone: 'ink',
        figure: (f) => ({ value: fmt(f.changesToday), label: `${plural(f.changesToday, 'change')} today` }),
      },
      { title: 'Settings', href: '/admin/settings', module: 'settings', icon: Icon.settings, tone: 'ink' },
    ],
  },
];

export default async function OverviewPage() {
  const user = await requireModule('overview');
  const facts = await getOverviewFacts();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name ?? '').split(/\s+/)[0];
  const groups = GROUPS.map((g) => ({ ...g, cards: g.cards.filter((c) => canAccess(user, c.module)) })).filter((g) => g.cards.length);

  return (
    <div className="mx-auto max-w-[1120px] pb-6">
      <header className="mb-10 pt-1">
        <p className="text-[0.82rem] font-medium text-[var(--casa-text-subtle)]">
          {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-1.5 text-[2.15rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-[var(--casa-ink)]">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
      </header>

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.label} aria-labelledby={`overview-${group.label}`}>
            <div className="mb-4 flex items-center gap-3">
              <h2 id={`overview-${group.label}`} className="text-[0.8rem] font-semibold tracking-[0.01em] text-[var(--casa-muted)]">
                {group.label}
              </h2>
              <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-[#d3dbe6] to-transparent" />
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {group.cards.map((card) => (
                <li key={card.href}>
                  <OverviewCard card={card} facts={facts} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function OverviewCard({ card, facts }: { card: Card; facts: OverviewFacts }) {
  const figure = card.figure?.(facts) ?? null;
  const pill = card.pill?.(facts) ?? null;

  return (
    <Link
      href={card.href}
      className={cn(
        'group relative flex h-full min-h-[8.5rem] flex-col overflow-hidden rounded-[18px] border border-[#e1e7ef] bg-white p-4 sm:min-h-[9.5rem] sm:p-5',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.05)]',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        'hover:-translate-y-[3px] hover:border-[#cdd6e2] hover:shadow-[0_2px_4px_rgba(16,24,40,0.04),0_20px_40px_-20px_rgba(16,24,40,0.3)]',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0'
      )}
    >
      {/* A whisper of light across the top edge, as a premium surface has. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f8fafd] to-transparent" />

      <span className="relative flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-11 place-items-center rounded-[13px] bg-gradient-to-br shadow-[0_1px_1px_rgba(16,24,40,0.04)] ring-1 ring-inset [&_svg]:size-[19px]',
            TILES[card.tone]
          )}
        >
          {card.icon}
        </span>
        {pill ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] leading-none font-semibold whitespace-nowrap ring-1 ring-inset',
              pill.tone === 'new' ? 'bg-[#eef3fc] text-[var(--fm-navy)] ring-[#d6e2f5]' : 'bg-[#fff6e0] text-[#8a5a00] ring-[#f5e2b0]'
            )}
          >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', pill.tone === 'new' ? 'bg-[#2f6fd1]' : 'bg-[#e0a100]')} />
            {pill.text}
          </span>
        ) : null}
      </span>

      <span className="relative mt-auto block pt-6">
        <span className="block text-[1rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">{card.title}</span>
        <span className="mt-1 flex items-center justify-between gap-2 text-[0.82rem] text-[var(--casa-muted)]">
          <span className="min-w-0 truncate">
            {figure ? (
              <>
                {figure.lead ? `${figure.lead} ` : ''}
                <b className="font-semibold text-[var(--casa-ink)] tabular-nums">{figure.value}</b>
                {figure.label ? ` ${figure.label}` : ''}
              </>
            ) : (
              ' '
            )}
          </span>
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 -translate-x-1 place-items-center rounded-full bg-[var(--fm-navy)] text-white opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none [&_svg]:size-3"
          >
            {Icon.chevronRight}
          </span>
        </span>
      </span>
    </Link>
  );
}
