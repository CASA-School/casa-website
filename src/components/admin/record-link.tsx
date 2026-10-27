import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A record named on another record's page — a booking's teacher, a course's room, a learner's course
 * (2026-10-27). With an `href` (from `recordHrefFor`, which gives one only to a colleague who may open
 * the record) the name is a link to it; without, the same name as text. No server or client
 * hooks, so both kinds of component use it.
 *
 * `quiet` keeps the text's own look with a faint underline that darkens on pointing — a name inside a
 * line, a teacher, a room — so it reads as a way on without shouting; `plain` has no underline until
 * pointed at (a record's title); `strong` is the booking page's link (navy, semibold), for a name
 * that stands alone.
 */
export function RecordLink({
  href,
  children,
  tone = 'quiet',
  className,
  title,
}: {
  href: string | null | undefined;
  children: ReactNode;
  tone?: 'quiet' | 'plain' | 'strong';
  className?: string;
  title?: string;
}) {
  if (!href) return <>{children}</>;
  return (
    <Link
      href={href}
      title={title}
      className={cn(
        'rounded-sm decoration-1 underline-offset-[3px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40',
        tone === 'strong'
          ? 'font-semibold text-[var(--fm-navy)] hover:underline'
          : tone === 'plain'
            ? 'hover:underline'
            : 'underline decoration-ws-line-firm hover:text-[var(--casa-ink)] hover:decoration-current',
        className
      )}
    >
      {children}
    </Link>
  );
}
