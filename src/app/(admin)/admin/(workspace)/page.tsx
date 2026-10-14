import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { TINTS, type Tint } from '@/components/admin/ui';
import { canAccess, type WorkspaceModule } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getOverviewSignals, type OverviewSignals } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';

/**
 * Overview — the start page. A clean set of shortcuts into every area the
 * colleague may open, grouped as the sidebar is, each card showing what is new
 * behind it when there is something (Rahman, 2026-10-14: "a overview or a start
 * page that is basically like any other dashboard, just a clean interface with
 * some shortcut cards … based on people's access they see different nav items").
 * It replaced Today and the rota; more goes here later, one thing at a time.
 */

type Card = {
  title: string;
  href: string;
  module: WorkspaceModule;
  icon: ReactNode;
  tint: Tint;
  /** What is new behind it, from the signals; nothing when there is nothing. */
  signal?: (s: OverviewSignals) => string | null;
};

const count = (n: number, word: string) => (n > 0 ? `${n} ${word}` : null);

const GROUPS: { label: string; cards: Card[] }[] = [
  {
    label: 'Inbox',
    cards: [
      { title: 'Enquiries', href: '/admin/enquiries', module: 'enquiries', icon: Icon.enquiries, tint: 'blue', signal: (s) => count(s.enquiries, 'new') },
      { title: 'Registrations', href: '/admin/registrations', module: 'registrations', icon: Icon.registrations, tint: 'blue', signal: (s) => count(s.registrations, 'new') },
    ],
  },
  {
    label: 'School',
    cards: [
      { title: 'Students', href: '/admin/people', module: 'people', icon: Icon.people, tint: 'green' },
      { title: 'Placement tests', href: '/admin/placement', module: 'placement', icon: Icon.placement, tint: 'green', signal: (s) => count(s.placement, 'to review') },
      { title: 'Bookings', href: '/admin/bookings', module: 'bookings', icon: Icon.bookings, tint: 'sun' },
      { title: 'Offers', href: '/admin/offers', module: 'offers', icon: Icon.offers, tint: 'sun', signal: (s) => count(s.offers, 'to follow up') },
      { title: 'Courses', href: '/admin/catalogue', module: 'catalogue', icon: Icon.catalogue, tint: 'red' },
      { title: 'Exams', href: '/admin/catalogue/exams', module: 'catalogue', icon: Icon.calendar, tint: 'red' },
    ],
  },
  {
    label: 'Management',
    cards: [
      { title: 'Applications', href: '/admin/applications', module: 'applications', icon: Icon.applications, tint: 'green', signal: (s) => count(s.applications, 'new') },
      { title: 'Kursplanung', href: '/admin/kursplanung', module: 'kursplanung', icon: Icon.kursplanung, tint: 'red' },
      { title: 'Website', href: '/admin/website', module: 'website', icon: Icon.website, tint: 'blue' },
      { title: 'Prices', href: '/admin/settings/prices', module: 'prices', icon: Icon.money, tint: 'sun' },
      { title: 'Team', href: '/admin/team', module: 'team', icon: Icon.team, tint: 'green' },
      { title: 'Activity', href: '/admin/activity', module: 'activity', icon: Icon.note, tint: 'ink' },
      { title: 'Settings', href: '/admin/settings', module: 'settings', icon: Icon.settings, tint: 'ink' },
    ],
  },
];

export default async function OverviewPage() {
  const user = await requireModule('overview');
  const signals = await getOverviewSignals();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name ?? '').split(/\s+/)[0];
  const groups = GROUPS.map((g) => ({ ...g, cards: g.cards.filter((c) => canAccess(user, c.module)) })).filter((g) => g.cards.length);

  return (
    <div className="mx-auto max-w-[1080px]">
      <header className="mb-9">
        <p className="text-sm font-medium text-[var(--casa-text-subtle)]">
          {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-1 text-[2rem] leading-tight font-extrabold tracking-[-0.025em] text-[var(--casa-ink)]">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
      </header>

      <div className="space-y-9">
        {groups.map((group) => (
          <section key={group.label} aria-labelledby={`overview-${group.label}`}>
            <h2 id={`overview-${group.label}`} className="mb-3 text-[0.8rem] font-semibold text-[var(--casa-muted)]">
              {group.label}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.cards.map((card) => {
                const signal = card.signal?.(signals) ?? null;
                return (
                  <li key={card.href}>
                    <Link
                      href={card.href}
                      className={cn(
                        'group flex h-full min-h-[7.5rem] flex-col justify-between rounded-2xl border border-ws-line bg-white p-5',
                        'shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 ease-out',
                        'hover:-translate-y-0.5 hover:border-[#c9d4e3] hover:shadow-[0_14px_30px_-20px_rgba(15,23,42,0.4)]',
                        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span aria-hidden="true" className={cn('grid size-10 place-items-center rounded-xl [&_svg]:size-[18px]', TINTS[card.tint])}>
                          {card.icon}
                        </span>
                        {signal ? (
                          <span className="rounded-full bg-[var(--casa-ink-deep)] px-2.5 py-1 text-[0.72rem] leading-none font-bold text-white tabular-nums">
                            {signal}
                          </span>
                        ) : (
                          <span aria-hidden="true" className="text-[var(--casa-text-subtle)] opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-4">
                            {Icon.chevronRight}
                          </span>
                        )}
                      </span>
                      <span className="mt-5 block text-[0.98rem] font-bold text-[var(--casa-ink)]">{card.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
