import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';


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

export { ListBar, type ListTab } from './list-bar';

/**
 * A group of rows inside a `Table`: what they have in common, and how many — on the head band
 * (`--ws-card-head`), as the Tagesplan's Kurse heads each part of the day with a band (2026-10-27).
 */
export function ListGroup({ label, count, span }: { label: string; count?: number; span: number }) {
  return (
    <tr data-group>
      <th colSpan={span} scope="colgroup" className="border-y border-ws-line bg-ws-card-head px-5 py-2.5 text-left text-[0.8rem] font-extrabold text-[var(--casa-ink)]">
        {label}
        {count ? (
          <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-white px-1.5 py-px text-[0.68rem] font-bold text-[var(--casa-muted)] tabular-nums ring-1 ring-ws-line ring-inset">
            {count}
          </span>
        ) : null}
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
          {reference ? <span data-record-reference="" className="hidden shrink-0 text-xs font-medium text-[var(--casa-text-subtle)] tabular-nums sm:inline">{reference}</span> : null}
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

/** A span of days in the workspace's language; see `dayRange` in lib/admin/i18n.ts. */
export { dayRange } from '@/lib/admin/i18n';
