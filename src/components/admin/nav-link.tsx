'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A sidebar link that knows where it is.
 *
 * The one client component in the shell, because "am I the current page?" needs
 * the pathname and a server layout is rendered once per route, not per link.
 *
 * `/admin` is matched exactly. Every other workspace route starts with it, so a
 * prefix test would light Overview up on every single screen.
 */
export function NavLink({
  href,
  icon,
  badge,
  children,
}: {
  href: string;
  icon: ReactNode;
  /** A count worth interrupting for. Rendered only when above zero. */
  badge?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = href === '/admin' ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-marker)]/70',
        active
          ? 'bg-white/10 font-semibold text-ws-on-panel'
          : 'text-ws-on-panel-muted hover:bg-white/6 hover:text-ws-on-panel'
      )}
    >
      {/* CASA's sun, and the only saturated warm note on the panel. One accent,
          used once, so "you are here" registers before the label is read. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 -left-2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-ws-marker transition-opacity',
          active ? 'opacity-100' : 'opacity-0'
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 transition-colors',
          active ? 'text-ws-marker' : 'text-ws-on-panel-muted group-hover:text-ws-on-panel'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {badge && badge > 0 ? (
        <span className="flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-[var(--casa-accent-surface)] px-1.5 text-[0.65rem] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}
