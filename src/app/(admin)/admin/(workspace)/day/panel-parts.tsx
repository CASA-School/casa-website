import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { Avatar } from '@/components/admin/list';
import { IconChip, type Tint } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

/**
 * The Tagesplan overview's tiles and the parts of the side panels they open (2026-10-19): who is in,
 * who is away, the lessons, birthdays, the appointments — each the one figure that matters on a tile,
 * the rest in a panel of quiet sections.
 */

export const tileClass =
  'group block h-full w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ws-canvas)]';

/** A tile: what it is, the one figure, a line under it, and — when something needs a look — a mark. */
export function Tile({
  icon,
  tint,
  label,
  value,
  detail,
  alert,
  children,
}: {
  icon: ReactNode;
  tint: Tint;
  label: string;
  value: string;
  detail?: string;
  alert?: { tone: 'red' | 'sun'; text: string };
  children?: ReactNode;
}) {
  return (
    <span className="flex h-full min-h-[8.75rem] flex-col rounded-2xl border border-ws-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[box-shadow,transform] group-hover:-translate-y-px group-hover:shadow-[0_12px_30px_-18px_rgba(15,23,42,0.4)]">
      <span className="flex items-center gap-2.5">
        <IconChip icon={icon} tint={tint} />
        <span className="text-[0.8rem] font-semibold text-[var(--casa-muted)]">{label}</span>
        <span aria-hidden="true" className="ml-auto text-[var(--casa-text-subtle)] transition-transform group-hover:translate-x-0.5 [&_svg]:size-4">
          {Icon.chevronRight}
        </span>
      </span>
      <span className="mt-3 text-[1.45rem] leading-none font-extrabold tracking-[-0.02em] text-[var(--casa-ink)] tabular-nums">{value}</span>
      {detail ? <span className="mt-1.5 truncate text-[0.8rem] text-[var(--casa-muted)]">{detail}</span> : null}
      <span className="mt-auto flex items-center justify-between gap-2 pt-3">
        {children ?? <span />}
        {alert ? (
          <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[0.72rem] font-bold whitespace-nowrap', alert.tone === 'red' ? 'bg-[#fdecec] text-[#9b1c1c]' : 'bg-[#fff2d6] text-[#6e4700]')}>
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', alert.tone === 'red' ? 'bg-[#d14343]' : 'bg-[#d99a00]')} />
            {alert.text}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Who is in, as faces: the first few, then how many more. */
export function Faces({ names }: { names: string[] }) {
  if (!names.length) return <span />;
  const shown = names.slice(0, 5);
  return (
    <span className="flex items-center">
      {shown.map((n, i) => (
        <span key={`${n}-${i}`} className={cn('rounded-full ring-2 ring-white', i > 0 && '-ml-1.5')}>
          <Avatar name={n} staff size="sm" />
        </span>
      ))}
      {names.length > shown.length ? <span className="ml-1.5 text-[0.74rem] font-semibold text-[var(--casa-muted)]">+{names.length - shown.length}</span> : null}
    </span>
  );
}

export function PanelSection({ title, tone, aside, children }: { title: string; tone?: 'red'; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-ws-line-soft py-3 last:border-b-0">
      <h3 className={cn('flex items-baseline gap-3 px-6 pb-1.5 text-[0.76rem] font-bold', tone === 'red' ? 'text-[#b42318]' : 'text-[var(--casa-muted)]')}>
        {title}
        {aside ? <span className="ml-auto font-semibold whitespace-nowrap tabular-nums">{aside}</span> : null}
      </h3>
      {children}
    </section>
  );
}

export function Quiet({ children }: { children: ReactNode }) {
  return <p className="px-6 py-3 text-[0.86rem] text-[var(--casa-muted)]">{children}</p>;
}
