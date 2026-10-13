import Link from 'next/link';
import type React from 'react';

import type { WorkspaceModule } from '@/lib/admin/access';
import type { ControlWeek } from '@/lib/admin/control-room';
import { cn } from '@/lib/utils';

/**
 * The control room's head — FileMaker's red-brown bar and its rows of cells:
 * the week (with « ‹ › » as FileMaker had them) and every area of the
 * workspace one click away. The pale yellow cells are the daily destinations,
 * each with what is new in it; the grey ones the rest; a dashed one is a
 * building block still to come (transfers, agencies, companies, internships,
 * messages), in its place so the row reads as it will.
 */

type Cell = { label: string; href?: string; count?: number; module?: WorkspaceModule; later?: true };

export function Launch({
  title,
  week,
  thisWeek,
  holds,
  nav,
}: {
  title: string;
  week: ControlWeek;
  thisWeek: boolean;
  holds: (module: WorkspaceModule) => boolean;
  nav: { back4: string; back: string; next: string; next4: string };
}) {
  const daily: Cell[] = [
    { label: 'Enquiries', href: '/admin/enquiries', count: week.waiting.enquiries, module: 'enquiries' },
    { label: 'Registrations', href: '/admin/registrations', count: week.waiting.registrations, module: 'registrations' },
    { label: 'Offers', href: '/admin/offers', count: week.waiting.offers, module: 'offers' },
    { label: 'Bookings', href: '/admin/bookings', module: 'bookings' },
    { label: 'Placement', href: '/admin/placement', count: week.waiting.placement, module: 'placement' },
    { label: 'Rota', href: '/admin/rota', module: 'rota' },
    { label: 'Transfers', later: true },
  ];
  const areas: Cell[] = [
    { label: 'Students', href: '/admin/people', module: 'people' },
    { label: 'Courses', href: '/admin/catalogue', module: 'catalogue' },
    { label: 'Exams', href: '/admin/catalogue/exams', module: 'catalogue' },
    { label: 'Kursplanung', href: '/admin/kursplanung', module: 'kursplanung' },
    { label: 'Applications', href: '/admin/applications', count: week.waiting.applications, module: 'applications' },
    { label: 'Prices', href: '/admin/settings/prices', module: 'prices' },
    { label: 'Agencies', later: true },
    { label: 'Companies', later: true },
    { label: 'Internships', later: true },
  ];
  const visible = (cells: Cell[]) => cells.filter((c) => !c.module || holds(c.module));

  return (
    <section aria-label="The week and the workspace" className="overflow-hidden rounded-t-md border border-b-0 border-[var(--fm-navy)]/35 bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[var(--fm-bar)] px-2.5 py-1 text-white">
        <nav aria-label="Choose a week" className="flex items-center gap-0.5 text-[0.8rem] font-bold">
          {[
            { href: nav.back4, label: 'Four weeks back', text: '«' },
            { href: nav.back, label: 'The week before', text: '‹' },
            { href: nav.next, label: 'The week after', text: '›' },
            { href: nav.next4, label: 'Four weeks ahead', text: '»' },
          ].map((a) => (
            <Link key={a.label} href={a.href} aria-label={a.label} className="grid h-6 w-6 place-items-center rounded-[3px] bg-white/12 hover:bg-white/25">
              {a.text}
            </Link>
          ))}
        </nav>
        <h2 className="text-[0.84rem] font-bold tracking-[0.01em]">{title}</h2>
        {!thisWeek ? (
          <Link href="/admin" className="rounded-[3px] bg-white px-2 py-0.5 text-[0.74rem] font-bold text-[var(--fm-bar)] hover:bg-[var(--fm-yellow)]">
            Go to today
          </Link>
        ) : null}
      </div>
      {/* The two rows share one set of columns, as FileMaker's do; the shorter row ends early. On a phone, two columns. */}
      <div
        className="grid grid-cols-2 border-t border-[var(--fm-grey-line)] md:[grid-template-columns:repeat(var(--cells),minmax(0,1fr))]"
        style={{ '--cells': Math.max(visible(daily).length, visible(areas).length) } as React.CSSProperties}
      >
        <Row cells={visible(daily)} tone="yellow" />
        <Row cells={visible(areas)} tone="grey" />
      </div>
    </section>
  );
}

function Row({ cells, tone }: { cells: Cell[]; tone: 'yellow' | 'grey' }) {
  return (
    <div className="contents">
      {cells.map((c, i) => {
        const cls = cn(
          'flex h-8 min-w-0 items-center justify-center gap-1.5 border-r border-b border-[var(--fm-grey-line)] px-2 text-[0.78rem] whitespace-nowrap',
          i === 0 && 'md:col-start-1',
          c.later
            ? 'border-dashed text-[#a3a9b1]'
            : tone === 'yellow'
              ? 'bg-[var(--fm-yellow)] font-semibold text-[var(--fm-navy)] hover:bg-[#fff59a]'
              : 'bg-[var(--fm-grey-light)] font-medium text-[var(--fm-navy)] hover:bg-white'
        );
        const body = (
          <>
            {c.label}
            {c.count ? <span className="rounded-[3px] bg-[var(--fm-navy)] px-1.5 py-px text-[0.68rem] font-bold text-white tabular-nums">{c.count}</span> : null}
          </>
        );
        return c.later || !c.href ? (
          <span key={c.label} className={cls} aria-disabled="true">
            {body}
          </span>
        ) : (
          <Link key={c.label} href={c.href} className={cls}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}
