import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The control room's keys — FileMaker's buttons on the home calendar, kept
 * where the team's hands expect them and given a state:
 *
 *   plain    a way in (blue text on a light key)
 *   has      there is something here (bold, underlined — FileMaker's own mark)
 *   warn     something needs a look (amber)
 *   clash    a plan contradicts itself (FileMaker's orange key, red text)
 *   later    a building block not built yet: in its place, quiet, not a link
 */

export type KeyState = 'plain' | 'has' | 'warn' | 'clash' | 'later';

export const keyClass = (state: KeyState = 'plain') =>
  cn(
    'flex h-7 w-full min-w-0 items-center justify-center gap-1 truncate rounded-[3px] border px-1.5 text-[0.74rem] leading-none whitespace-nowrap transition-colors outline-none',
    'focus-visible:ring-2 focus-visible:ring-[var(--fm-blue)]/40',
    state === 'plain' && 'border-[var(--fm-grey-line)] bg-[var(--fm-grey-light)] text-[var(--fm-blue)] hover:bg-white',
    state === 'has' && 'border-[var(--fm-grey-line)] bg-white font-bold text-[var(--fm-blue)] underline decoration-1 underline-offset-2 hover:bg-[var(--fm-yellow)]',
    state === 'warn' && 'border-[#e8c56a] bg-[#fff6d6] font-bold text-[#8a5a00] hover:bg-[#ffefb8]',
    state === 'clash' && 'border-[#d97a55] bg-[var(--fm-orange)] font-bold text-[var(--fm-red)] underline decoration-1 underline-offset-2 hover:brightness-105',
    state === 'later' && 'cursor-default border-dashed border-[var(--fm-grey-line)] bg-transparent text-[#a3a9b1]'
  );

export function Key({ href, state = 'plain', count, children }: { href?: string; state?: KeyState; count?: number; children: ReactNode }) {
  const body = (
    <>
      <span className="truncate">{children}</span>
      {count !== undefined ? <span className="shrink-0 font-semibold no-underline opacity-80">| {count}</span> : null}
    </>
  );
  if (state === 'later' || !href) {
    return (
      <span className={keyClass(state)} aria-disabled={state === 'later' ? true : undefined}>
        {body}
      </span>
    );
  }
  return (
    <Link href={href} className={keyClass(state)}>
      {body}
    </Link>
  );
}

/** FileMaker's green plus, for the keys that make something new. */
export function Plus() {
  return (
    <span aria-hidden="true" className="grid size-3.5 shrink-0 place-items-center rounded-full bg-[var(--fm-green)] text-[0.6rem] leading-none font-bold text-white">
      +
    </span>
  );
}

/** A block's small heading, FileMaker's "Shift | Reception". */
export function BlockHead({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <p className="flex items-baseline gap-1.5 px-2.5 pt-1.5 pb-1 text-[0.68rem] font-semibold text-[#7a828c]">
      {count ? <span className="italic tabular-nums">{count}</span> : null}
      {children}
    </p>
  );
}
