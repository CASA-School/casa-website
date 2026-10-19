import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { canAccess, type WorkspaceModule } from '@/lib/admin/access';
import { bridgeStatus, bridgeTime } from '@/lib/admin/bridge';
import { requireModule } from '@/lib/admin/guard';
import { num, wsLocale, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { getOverviewFacts, type OverviewFacts } from '@/lib/admin/overview';
import { placementTestSwitchedOn } from '@/lib/placement/availability';
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

/** The cards, in the language of the request: a function of `t` so each text sits beside its German. */
function groups(t: T, lang: WsLang): { label: string; cards: Card[] }[] {
  const n = (value: number) => num(lang, value);
  const day = (d: Date) => d.toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short' });
  const date = (d: Date) => d.toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  const monthYear = (d: Date) =>
    new Date(`${toDateInputValue(d)}T00:00:00`).toLocaleDateString(wsLocale(lang), { month: 'short', year: 'numeric' });
  const open = t('offen', 'open');
  const fresh = (count: number) => ({ text: t(`${n(count)} neu`, `${n(count)} new`), tone: 'new' as const });

  return [
    {
      label: t('Posteingang', 'Inbox'),
      cards: [
        {
          title: t('Anfragen', 'Enquiries'),
          href: '/admin/enquiries',
          module: 'enquiries',
          icon: Icon.enquiries,
          tone: 'blue',
          figure: (f) => ({ value: n(f.enquiriesOpen), label: open }),
          pill: (f) => (f.enquiriesNew ? fresh(f.enquiriesNew) : null),
        },
        {
          title: t('Anmeldungen', 'Registrations'),
          href: '/admin/registrations',
          module: 'registrations',
          icon: Icon.registrations,
          tone: 'blue',
          figure: (f) => ({ value: n(f.registrationsOpen), label: open }),
          pill: (f) => (f.registrationsNew ? fresh(f.registrationsNew) : null),
        },
        {
          title: t('Einstufungstests', 'Placement tests'),
          href: '/admin/placement',
          module: 'placement',
          icon: Icon.placement,
          tone: 'green',
          figure: (f) =>
            f.placementToReview
              ? { value: n(f.placementToReview), label: t('zu prüfen', 'to review') }
              : { value: t('Alle geprüft', 'All reviewed') },
        },
      ],
    },
    {
      label: t('Schule', 'School'),
      cards: [
        {
          title: t('Teilnehmende', 'Students'),
          href: '/admin/people',
          module: 'people',
          icon: Icon.people,
          tone: 'green',
          figure: (f) => ({ value: n(f.students), label: t('in der Kartei', 'in the register') }),
        },
        {
          title: t('Buchungen', 'Bookings'),
          href: '/admin/bookings',
          module: 'bookings',
          icon: Icon.bookings,
          tone: 'sun',
          figure: (f) => ({ value: n(f.bookingsCurrent), label: t('laufend', 'current') }),
        },
        {
          title: t('Angebote', 'Offers'),
          href: '/admin/offers',
          module: 'offers',
          icon: Icon.offers,
          tone: 'sun',
          figure: (f) => ({ value: n(f.offersOpen), label: open }),
          pill: (f) =>
            f.offersToFollowUp
              ? { text: t(`${n(f.offersToFollowUp)} nachfassen`, `${n(f.offersToFollowUp)} to follow up`), tone: 'warn' }
              : null,
        },
        {
          title: t('Wartelisten', 'Waiting lists'),
          href: '/admin/catalogue/waitlist',
          module: 'catalogue',
          icon: Icon.clock,
          tone: 'blue',
          figure: (f) => (f.waitlistWaiting ? { value: n(f.waitlistWaiting), label: f.waitlistWaiting === 1 ? t('wartet', 'waiting') : t('warten', 'waiting') } : { value: t('Niemand wartet', 'Nobody waiting') }),
          pill: (f) =>
            f.waitlistFree
              ? { text: f.waitlistFree === 1 ? t('Platz frei', 'Place free') : t(`${n(f.waitlistFree)} Plätze frei`, `${n(f.waitlistFree)} places free`), tone: 'warn' }
              : null,
        },
        {
          title: t('Kurse', 'Courses'),
          href: '/admin/catalogue',
          module: 'catalogue',
          icon: Icon.catalogue,
          tone: 'red',
          figure: (f) => ({
            value: n(f.cohortsUpcoming),
            label: f.cohortsUpcoming === 1 ? t('kommender Termin', 'cohort ahead') : t('kommende Termine', 'cohorts ahead'),
          }),
        },
        {
          title: t('Prüfungen', 'Exams'),
          href: '/admin/catalogue/exams',
          module: 'catalogue',
          icon: Icon.calendar,
          tone: 'red',
          figure: (f) => (f.nextExam ? { lead: t('Nächster Termin', 'Next sitting'), value: day(f.nextExam) } : null),
        },
      ],
    },
    {
      label: t('Verwaltung', 'Management'),
      cards: [
        {
          title: t('Bewerbungen', 'Applications'),
          href: '/admin/applications',
          module: 'applications',
          icon: Icon.applications,
          tone: 'green',
          figure: (f) => ({ value: n(f.applicationsOpen), label: open }),
        },
        {
          title: 'Kursplanung',
          href: '/admin/kursplanung',
          module: 'kursplanung',
          icon: Icon.kursplanung,
          tone: 'red',
          figure: (f) => (f.plannedTo ? { lead: t('Geplant bis', 'Planned to'), value: monthYear(f.plannedTo) } : null),
        },
        {
          title: 'Website',
          href: '/admin/website',
          module: 'website',
          icon: Icon.website,
          tone: 'blue',
          figure: (f) =>
            f.websiteDrafts
              ? { value: n(f.websiteDrafts), label: f.websiteDrafts === 1 ? t('Entwurf', 'draft') : t('Entwürfe', 'drafts') }
              : { value: t('Alles veröffentlicht', 'Up to date') },
          pill: (f) =>
            f.websitePending
              ? { text: t(`${n(f.websitePending)} zur Freigabe`, `${n(f.websitePending)} to approve`), tone: 'warn' }
              : null,
        },
        {
          title: t('Preise', 'Prices'),
          href: '/admin/settings/prices',
          module: 'prices',
          icon: Icon.money,
          tone: 'sun',
          figure: (f) => (f.pricesSince ? { lead: t('Gültig seit', 'In force since'), value: date(f.pricesSince) } : null),
        },
        {
          title: t('Zugänge', 'Accounts'),
          href: '/admin/team',
          module: 'team',
          icon: Icon.lock,
          tone: 'green',
          figure: (f) => ({ value: n(f.colleagues), label: f.colleagues === 1 ? t('Konto', 'account') : t('Konten', 'accounts') }),
        },
        {
          title: t('Aktivität', 'Activity'),
          href: '/admin/activity',
          module: 'activity',
          icon: Icon.note,
          tone: 'ink',
          figure: (f) => ({
            value: n(f.changesToday),
            label: f.changesToday === 1 ? t('Änderung heute', 'change today') : t('Änderungen heute', 'changes today'),
          }),
        },
        { title: t('Einstellungen', 'Settings'), href: '/admin/settings', module: 'settings', icon: Icon.settings, tone: 'ink' },
      ],
    },
  ];
}

export default async function OverviewPage() {
  const user = await requireModule('overview');
  const [facts, bridge, { t, lang }] = await Promise.all([getOverviewFacts(), bridgeStatus(), getI18n()]);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 11 ? t('Guten Morgen', 'Good morning') : hour < 18 ? t('Guten Tag', 'Good afternoon') : t('Guten Abend', 'Good evening');
  const firstName = (user.name ?? '').split(/\s+/)[0];
  // The placement queue only where CASA's own test is switched on (`placementTestSwitchedOn`), as in the rail.
  const shown = (module: WorkspaceModule) => canAccess(user, module) && (module !== 'placement' || placementTestSwitchedOn());
  const visible = groups(t, lang).map((g) => ({ ...g, cards: g.cards.filter((c) => shown(c.module)) })).filter((g) => g.cards.length);

  return (
    <div className="mx-auto max-w-[1120px] pb-6">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-1">
        <div>
          <p className="text-[0.82rem] font-medium text-[var(--casa-text-subtle)]">
            {now.toLocaleDateString(wsLocale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1.5 text-[2.15rem] leading-[1.1] font-extrabold tracking-[-0.03em] text-[var(--casa-ink)]">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        {/* What the workspace shows from SchoolMan is a copy as of a time: say which (docs/FILEMAKER_BRIDGE.md §8). */}
        {bridge ? (
          <p className="flex items-center gap-2 pb-1 text-[0.8rem] font-medium text-[var(--casa-text-subtle)]">
            <span aria-hidden="true" className={cn('size-2 rounded-full', bridge.lastFailed ? 'bg-[#d92d20]' : 'bg-[#17b26a]')} />
            {bridge.readAt ? t(`SchoolMan · Stand ${bridgeTime(bridge.readAt, t, lang)}`, `SchoolMan · as of ${bridgeTime(bridge.readAt, t, lang)}`) : 'SchoolMan'}
            {bridge.lastFailed ? <span className="text-[#b42318]">{t('· letzte Übernahme fehlgeschlagen', '· last transfer failed')}</span> : null}
          </p>
        ) : null}
      </header>

      <div className="space-y-10">
        {visible.map((group) => (
          <section key={group.label} aria-labelledby={`overview-${group.cards[0].module}`}>
            <div className="mb-4 flex items-center gap-3">
              <h2 id={`overview-${group.cards[0].module}`} className="text-[0.8rem] font-semibold tracking-[0.01em] text-[var(--casa-muted)]">
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
