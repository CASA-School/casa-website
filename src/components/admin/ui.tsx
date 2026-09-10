import Link from 'next/link';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

/**
 * The workspace's control set.
 *
 * Everything here is a server component — no hooks, no handlers, no state — so
 * every screen stays server-rendered and every mutation is a form posting to a
 * server action. That is not asceticism: a staff tool that keeps working when a
 * chunk fails to load, and that a browser can submit without JavaScript, is
 * strictly better than one that cannot, and the interactions here (filter,
 * change a status, write a note) genuinely are form submissions.
 *
 * The styling lives in one file so a control cannot drift between two screens —
 * the single most visible way a dashboard stops feeling like one product.
 *
 * Radius follows the three-tier scale in `src/config/brand/tokens.ts`: 4px for
 * controls, 6px for cards and panels, 8px for the outer shells. No fourth value.
 *
 * TWO RULES THIS FILE ENFORCES FOR EVERY SCREEN
 *
 * 1. A SECTION IS ONE WHITE BLOCK, and the canvas between sections is what
 *    separates them. A card's header is therefore white with a rule under it,
 *    not a grey band: a grey header the same value as the page gap made two
 *    stacked cards read as one continuous strip. The only recessed band inside
 *    a card is a table header or a toolbar (`--ws-sunk`), which then reads
 *    unambiguously as a sub-level rather than as the page showing through.
 *
 * 2. A FIELD TITLE IS A LABEL, NOT AN EYEBROW. Field names in `DetailList`,
 *    `StatBand` and a `Table`'s column heads are 12px sentence case in
 *    `--casa-muted`. They used to be
 *    10.4px bold uppercase with letter-spacing — a decorative treatment doing
 *    a functional job, which is slower to read and, next to a value and a
 *    badge, genuinely hard to parse. Uppercase eyebrows are reserved for
 *    `PageHeader`, where there is one per screen and it is decorative.
 */

const focusRing =
  'outline-none focus-visible:border-[var(--casa-blue)] focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/25';

const controlBase =
  'w-full rounded-lg border border-ws-line bg-white px-3 py-2 text-sm text-[var(--casa-ink)] transition-colors hover:border-ws-line-firm disabled:cursor-not-allowed disabled:opacity-55';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, focusRing, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(controlBase, focusRing, 'leading-relaxed', className)} {...props} />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        controlBase,
        focusRing,
        // A native select, on purpose. It is keyboard-accessible, it works on a
        // phone, and it needs no client bundle — three things a custom listbox
        // has to re-earn for a control staff use forty times a day.
        'appearance-none bg-[position:right_0.6rem_center] bg-no-repeat pr-9',
        "bg-[image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1.5 1.75 6 6.25l4.5-4.5' stroke='%235b697e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-baseline justify-between gap-3 text-xs font-semibold text-[var(--casa-ink)]"
      >
        <span>{label}</span>
        {hint ? <span className="font-normal text-[var(--casa-text-subtle)]">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

const buttonVariants = {
  primary:
    'bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)] shadow-[0_1px_2px_rgba(15,23,42,0.18)]',
  secondary:
    'border border-ws-line-firm bg-white text-[var(--casa-ink)] hover:border-[var(--casa-blue)]/45 hover:text-[var(--casa-accent-text)]',
  ghost: 'text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]',
  danger:
    'border border-ws-line-firm bg-white text-[var(--casa-danger-text)] hover:border-[var(--casa-danger-text)]/50 hover:bg-[var(--casa-danger-text)]/6',
} as const;

const buttonSizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        focusRing,
        className
      )}
      {...props}
    />
  );
}

/**
 * A card.
 *
 * The shadow is deliberately almost nothing — a 1px contact edge plus a wide,
 * very soft lift. A dashboard is mostly cards, and a shadow with any real
 * presence multiplied forty times reads as haze rather than as depth. The
 * border does the separating; the shadow only says "this sits on the page".
 */
export function Card({
  title,
  description,
  actions,
  footer,
  bleed = false,
  className,
  children,
}: {
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  /** True when the body is a table or list that should touch the card's edges. */
  bleed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-ws-line bg-white',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-20px_rgba(15,23,42,0.18)]',
        className
      )}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ws-line px-5 py-3.5">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-[family-name:var(--font-display)] text-base leading-tight text-[var(--casa-ink)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-prose text-xs leading-relaxed text-[var(--casa-text-subtle)]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </header>
      ) : null}

      <div className={bleed ? '' : 'px-5 py-4'}>{children}</div>

      {footer ? (
        <footer className="border-t border-ws-line bg-ws-sunk px-5 py-3">{footer}</footer>
      ) : null}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-7">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--casa-text-subtle)] transition-colors hover:text-[var(--casa-accent-text)]"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M6.5 3.5 2.5 8l4 4.5M2.5 8h11" />
          </svg>
          {backLabel ?? 'Back'}
        </Link>
      ) : null}

      {eyebrow ? (
        <p className="mb-2 text-[0.65rem] font-bold tracking-eyebrow uppercase text-[var(--casa-accent-text)]">
          {eyebrow}
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-[1.1] tracking-[-0.015em] text-[var(--casa-ink)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--casa-text-subtle)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/**
 * The stat band.
 *
 * `gap-px` over a line-coloured background, rather than a border on each tile.
 * Four bordered tiles side by side put two 1px lines at every internal join,
 * which renders as a 2px seam that is visibly heavier than the outer edge —
 * the classic dashboard tell. One shared background showing through a 1px gap
 * gives every division exactly the same weight.
 */
export function StatBand({
  items,
}: {
  items: readonly {
    label: string;
    value: string | number;
    hint?: string;
    href?: string;
    /** True when the number is a backlog: it earns colour only when non-zero. */
    alert?: boolean;
  }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ws-line bg-ws-line lg:grid-cols-4">
      {items.map((item) => {
        const alerting = item.alert && Number(item.value) > 0;

        const body = (
          <>
            <p className="text-xs font-medium text-[var(--casa-muted)]">{item.label}</p>
            <p
              data-slot="stat-value"
              className={cn(
                'mt-2 font-[family-name:var(--font-display)] text-[1.75rem] leading-none',
                alerting ? 'text-[var(--casa-warning-text)]' : 'text-[var(--casa-ink)]'
              )}
            >
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1.5 text-xs text-[var(--casa-text-subtle)]">{item.hint}</p>
            ) : null}
          </>
        );

        return item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="group bg-white px-5 py-4 transition-colors hover:bg-ws-sunk"
          >
            {body}
          </Link>
        ) : (
          <div key={item.label} className="bg-white px-5 py-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}

const badgeTones = {
  /** The one that must interrupt: unanswered, unreviewed, waiting on us. */
  accent: 'bg-[var(--casa-accent-surface)] text-white',
  neutral: 'bg-ws-sunk text-[var(--casa-ink)] ring-1 ring-inset ring-ws-line-firm',
  positive: 'bg-[var(--casa-success-surface)]/12 text-[var(--casa-success-text)]',
  warning: 'bg-[var(--casa-warning-text)]/12 text-[var(--casa-warning-text)]',
  danger: 'bg-[var(--casa-danger-text)]/10 text-[var(--casa-danger-text)]',
  quiet: 'bg-transparent text-[var(--casa-text-subtle)] ring-1 ring-inset ring-ws-line',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap',
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ws-line-firm px-6 py-14 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--casa-ink)]">
        {title}
      </p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--casa-text-subtle)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * A table.
 *
 * Header on the sunken band with no bottom border of its own — the tone change
 * already separates it, and adding a rule as well double-draws the boundary.
 * Rows are separated by the soft line and the whole block by the firm one, so
 * the eye can find the edge of the table without counting rows.
 */
export function Table({
  head,
  children,
}: {
  head: readonly (ReactNode | { label: ReactNode; align?: 'left' | 'right' })[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ws-sunk">
            {head.map((column, index) => {
              const isSpec = typeof column === 'object' && column !== null && 'label' in column;
              const label = isSpec ? column.label : column;
              const align = isSpec ? (column.align ?? 'left') : 'left';

              return (
                <th
                  key={index}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5 text-xs font-medium whitespace-nowrap text-[var(--casa-muted)]',
                    align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-ws-line-soft">{children}</tbody>
      </table>
    </div>
  );
}

/**
 * A clickable table row.
 *
 * The row carries the hover state and the positioning context; the link itself
 * is rendered by the FIRST cell, via `Cell href=...`, and stretched over the
 * whole row with `absolute inset-0`.
 *
 * It used to live in an extra zero-width `<td>` of its own, which was wrong in
 * a way that only showed up on screen: an `<a>` cannot contain `<td>`s, so the
 * link needed a cell, and that cell shifted every row one column right of its
 * header. Six headers, seven cells — a placement recommendation appearing under
 * "Confidence". Putting the anchor inside a real cell keeps the counts equal.
 *
 * Still exactly one link per row for a screen reader, rather than one per cell.
 */
export function TableRow({
  interactive = false,
  children,
}: {
  /** Set when a cell in this row carries an `href`. */
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <tr
      className={cn(
        'group bg-white transition-colors',
        interactive ? 'relative hover:bg-ws-sunk/70' : undefined
      )}
    >
      {children}
    </tr>
  );
}

export function Cell({
  align = 'left',
  href,
  className,
  children,
}: {
  align?: 'left' | 'right';
  /**
   * Makes the whole row a link to this path. Set it on the first cell only —
   * two stretched anchors in one row would overlap and the lower one would
   * never be clickable.
   */
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-[var(--casa-ink)]',
        align === 'right' ? 'text-right' : 'text-left',
        className
      )}
    >
      {href ? (
        <Link href={href} className="absolute inset-0 z-10">
          <span className="sr-only">Open</span>
        </Link>
      ) : null}
      {children}
    </td>
  );
}

/**
 * A definition list for a record's fields.
 *
 * Two columns on a wide screen, one on a phone, with the label above the value
 * rather than beside it. Side-by-side label/value columns look tidy in a mockup
 * and fall apart the moment one value is a 60-character address: either the
 * label column is absurdly wide or the value wraps into a 12-character gutter.
 */
export function DetailList({
  items,
}: {
  items: readonly { label: string; value: ReactNode; wide?: boolean }[];
}) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className={item.wide ? 'sm:col-span-2' : undefined}>
          <dt className="text-xs font-medium text-[var(--casa-muted)]">{item.label}</dt>
          <dd className="mt-1 text-sm leading-relaxed break-words text-[var(--casa-ink)]">
            {item.value === null || item.value === undefined || item.value === '' ? (
              <span className="text-[var(--casa-text-subtle)]">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A horizontal bar. Used for capacity and for the placement skill profile. */
export function Meter({
  value,
  max,
  label,
  tone = 'accent',
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'accent' | 'warning' | 'neutral';
}) {
  const share = max > 0 ? Math.min(1, value / max) : 0;
  const fill = {
    accent: 'bg-[var(--casa-accent-surface)]',
    warning: 'bg-[var(--casa-warning-text)]',
    neutral: 'bg-[var(--casa-muted)]',
  }[tone];

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ws-line" role="img" aria-label={label}>
      {/* Zero renders as nothing rather than as a sliver: a 1px stub reads as
          "a little" when the honest answer is "none". */}
      {share > 0 ? (
        <div
          className={cn('h-full rounded-full', fill)}
          style={{ width: `${Math.max(share * 100, 2)}%` }}
        />
      ) : null}
    </div>
  );
}

/**
 * A dated line. `<time>` so the value is machine-readable, and the workspace's
 * tabular-numerals rule (globals.css) picks it up by element.
 *
 * `compact` drops the year, and every list table uses it. A six-column queue
 * has about 1100px to work with on a laptop, and "07 Sept 2026" spends 40 of
 * them on a year that is the current one for all but a handful of rows —
 * enough, across six columns, to push the table into horizontal scroll. The
 * year comes back on a record's own screen, where there is room and where the
 * exact date is being read rather than scanned. A row older than the current
 * year keeps its year in either mode, since that is the case where it carries
 * information.
 */
export function DateText({
  value,
  withTime = false,
  compact = false,
}: {
  value: Date | string | null | undefined;
  withTime?: boolean;
  compact?: boolean;
}) {
  if (!value) {
    return <span className="text-[var(--casa-text-subtle)]">—</span>;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span className="text-[var(--casa-text-subtle)]">—</span>;
  }

  const sameYear = date.getFullYear() === new Date().getFullYear();

  return (
    <time dateTime={date.toISOString()} className="whitespace-nowrap">
      {date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        ...(compact && sameYear ? {} : { year: 'numeric' }),
      })}
      {withTime
        ? `, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
        : ''}
    </time>
  );
}

/**
 * A date of birth.
 *
 * Since 0007 every queue row carries two columns: `birth_date` (a real `date`,
 * set when the submitted text parsed as one) and `birth_date_raw` (the text,
 * verbatim). Pass the typed value first and the raw as fallback:
 * `<BirthDate value={row.birthDate ?? row.birthDateRaw} />`. A `Date` or an
 * ISO string is formatted; anything else is printed exactly as it arrived —
 * a date read for identity checks against a passport must not be reformatted
 * on a maybe. The row is flagged `birth_date_unparsed` in that case, so the
 * verbatim text is never the only signal.
 */
export function BirthDate({ value }: { value: Date | string | null | undefined }) {
  if (!value) {
    return <span className="text-[var(--casa-text-subtle)]">—</span>;
  }

  const iso =
    value instanceof Date
      ? Number.isNaN(value.getTime())
        ? null
        : value.toISOString().slice(0, 10)
      : (/^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())?.[0] ?? null);

  if (!iso) {
    return <span>{String(value)}</span>;
  }

  const date = new Date(`${iso}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return <span>{String(value)}</span>;
  }

  return (
    <time dateTime={iso}>
      {date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })}
    </time>
  );
}

/** "3 days ago". Rendered on the server, so it is the server's clock. */
export function relativeDays(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const midnight = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
  const days = Math.round((midnight(new Date()) - midnight(date)) / 86_400_000);

  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
