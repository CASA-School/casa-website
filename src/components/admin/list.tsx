import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from './icons';

/**
 * The workspace's list, one design for every list (docs/ADMIN_WORKSPACE.md
 * §Lists). A list is one white card: its views and its search across the top,
 * then the rows, grouped where a group says what to do next.
 *
 * A column holds one kind of thing. The record (an initial, the name, and
 * under it what it is about), when, how much, its status, who has it — never
 * a status with a name and a date under it, never one column for dates and
 * group sizes, never two money columns half full of dashes. An empty value is
 * an empty cell, not a dash.
 */

export type ListTab = { key: string; label: string; href: string; count?: number };

/** The top of a list's card: its views on the left, its search on the right. */
export function ListBar({
  tabs,
  active,
  summary,
  search,
}: {
  tabs?: readonly ListTab[];
  active?: string;
  /** For a list without views: what it holds, in a few words ("18 students"), where the tabs would be. */
  summary?: ReactNode;
  search?: {
    action: string;
    value?: string;
    placeholder: string;
    /** Params the search keeps, the current view among them. */
    keep?: Record<string, string | undefined>;
  };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ws-line px-5">
      {tabs?.length ? (
        <nav aria-label="Views" className="-mb-px flex max-w-full gap-5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => {
            const on = tab.key === active;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'inline-flex h-12 shrink-0 items-center gap-1.5 border-b-2 text-[0.84rem] font-semibold whitespace-nowrap transition-colors outline-none',
                  'focus-visible:text-[var(--casa-ink)] focus-visible:underline',
                  on
                    ? 'border-[var(--casa-ink-deep)] text-[var(--casa-ink)]'
                    : 'border-transparent text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                )}
              >
                {tab.label}
                {tab.count ? (
                  <span className={cn('text-xs font-semibold tabular-nums', on ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-text-subtle)]')}>
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      ) : summary ? (
        <p className="py-3.5 text-[0.84rem] font-semibold text-[var(--casa-muted)]">{summary}</p>
      ) : (
        <span />
      )}
      {search ? (
        <form action={search.action} role="search" className="relative w-full py-2 sm:w-64">
          {Object.entries(search.keep ?? {}).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null
          )}
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--casa-text-subtle)] [&_svg]:h-4 [&_svg]:w-4">
            {Icon.search}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={search.value ?? ''}
            placeholder={search.placeholder}
            aria-label="Search"
            className="h-8 w-full rounded-lg border border-transparent bg-ws-sunk/80 pr-3 pl-8 text-[0.84rem] font-medium text-[var(--casa-ink)] transition-colors outline-none placeholder:font-normal placeholder:text-[var(--casa-text-subtle)] hover:bg-ws-sunk focus:border-[var(--casa-blue)] focus:bg-white focus:ring-[3px] focus:ring-[var(--casa-blue)]/20"
          />
        </form>
      ) : null}
    </div>
  );
}

/** A group of rows inside a `Table`: what they have in common, and how many. */
export function ListGroup({ label, count, span }: { label: string; count?: number; span: number }) {
  return (
    <tr>
      <th
        colSpan={span}
        scope="colgroup"
        className="bg-[#f8fafc] px-5 pt-3 pb-2 text-left text-xs font-bold text-[var(--casa-muted)]"
      >
        {label}
        {count ? <span className="ml-1.5 font-semibold text-[var(--casa-text-subtle)] tabular-nums">{count}</span> : null}
      </th>
    </tr>
  );
}

/** Nothing in this view: one calm line inside the list's card. */
export function ListEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-[0.95rem] font-bold text-[var(--casa-ink)]">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--casa-text-subtle)]">{children}</p> : null}
    </div>
  );
}

const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '·';

/** Soft tints for a record's initials; a name always gets the same one, so a person is recognisable down a list. */
const TINTS = [
  'bg-[#e8f1fd] text-[#1e4f9a] ring-[#d3e3f8]',
  'bg-[#e9f7ef] text-[#17693a] ring-[#cfead9]',
  'bg-[#fff4dc] text-[#8a5a00] ring-[#f1dfb0]',
  'bg-[#fdecef] text-[#a22545] ring-[#f5d1d9]',
  'bg-[#f1ecfd] text-[#5b3aa6] ring-[#e0d6f7]',
  'bg-[#e6f6f7] text-[#16676d] ring-[#c9e9eb]',
] as const;

const tintOf = (name: string) => TINTS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TINTS.length];

/**
 * Initials in a circle. A record (a learner, a school) is softly tinted, the
 * same tint for the same name; a colleague is navy — so "who it is about" and
 * "who has it" never read alike.
 */
export function Avatar({ name, staff = false, size = 'md' }: { name: string; staff?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      title={name}
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-bold tracking-[0.02em] select-none',
        size === 'lg' ? 'size-12 text-[0.95rem]' : size === 'md' ? 'size-9 text-[0.72rem]' : 'size-6 text-[0.6rem]',
        staff ? 'bg-[var(--casa-ink-deep)] text-white' : cn('ring-1 ring-inset', tintOf(name))
      )}
    >
      {initials(name)}
    </span>
  );
}

/** The record a row is about: an initial, the name, a quiet reference, and what it is about under it. */
export function RecordName({ name, reference, about, flag }: { name: string; reference?: string; about?: ReactNode; flag?: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={name} />
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[0.9rem] font-semibold tracking-[-0.005em] text-[var(--casa-ink)]">{name}</span>
          {/* On a phone the name needs the width more than the reference does. */}
          {reference ? <span className="hidden shrink-0 text-xs font-medium text-[var(--casa-text-subtle)] tabular-nums sm:inline">{reference}</span> : null}
          {flag}
        </span>
        {about ? <span className="mt-0.5 block truncate text-[0.8rem] text-[var(--casa-muted)]">{about}</span> : null}
      </span>
    </span>
  );
}

const dots = {
  /** Waits on us: new, unanswered. */
  accent: 'bg-[var(--casa-blue)]',
  neutral: 'bg-[#64748b]',
  positive: 'bg-[#16a34a]',
  warning: 'bg-[#d97706]',
  danger: 'bg-[#dc2626]',
  quiet: 'bg-transparent ring-[1.5px] ring-[#94a3b8] ring-inset',
} as const;

export type DotTone = keyof typeof dots;

/** A status: a dot in its colour and the word. Quiet for what is finished. */
export function Status({ tone, children }: { tone: DotTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[0.8rem] font-semibold whitespace-nowrap',
        tone === 'quiet' ? 'text-[var(--casa-text-subtle)]' : 'text-[var(--casa-ink)]',
        tone === 'warning' && 'text-[#9a5b00]',
        tone === 'danger' && 'text-[#b91c1c]'
      )}
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', dots[tone])} />
      {children}
    </span>
  );
}

/** Who has it: the colleague's initials, the name for a screen reader and on hover. */
export function Owner({ name }: { name: string | null | undefined }) {
  if (!name) return null;
  return (
    <span className="inline-flex" title={name}>
      <Avatar name={name} staff size="sm" />
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** Euros in a list: whole euros without ",00", the cents when there are some. */
export function euros(value: number): string {
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

/** "14 Oct", "11–24 Apr 2027", "26 Oct 2026 – 30 Apr 2027"; the year once, and only when it is not this one. */
export function dayRange(from: string, to: string, thisYear = new Date().getFullYear()): string {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  const year = (y: number) => (y === thisYear ? '' : ` ${y}`);
  if (from === to) return `${ad} ${MONTHS[am - 1]}${year(ay)}`;
  if (ay === by && am === bm) return `${ad}–${bd} ${MONTHS[bm - 1]}${year(by)}`;
  if (ay === by) return `${ad} ${MONTHS[am - 1]} – ${bd} ${MONTHS[bm - 1]}${year(by)}`;
  return `${ad} ${MONTHS[am - 1]} ${ay} – ${bd} ${MONTHS[bm - 1]} ${by}`;
}
