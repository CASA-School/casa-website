import Link from 'next/link';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { Tr } from './lang';
import { Avatar } from './list';
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
 * controls, 6px for tiles and panels inside a card, 8px for the cards on the
 * canvas. No fourth value. The look is the offers module's (docs/OFFERS.md
 * §Design): framed white cards on the canvas, headings in the sans at 800,
 * an icon chip in a meaning colour where a card has a subject, plain values.
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
 * 2. A FIELD TITLE IS A LABEL, NOT AN EYEBROW. Field names in `DetailList` and
 *    a `Table`'s column heads are 12px sentence case in
 *    `--casa-muted`. They used to be
 *    10.4px bold uppercase with letter-spacing — a decorative treatment doing
 *    a functional job, which is slower to read and, next to a value and a
 *    badge, genuinely hard to parse. There are no uppercase eyebrows at all:
 *    a page's title says where you are, and the way back says where from.
 */

const focusRing =
  'outline-none focus-visible:border-[var(--casa-blue)] focus-visible:ring-[3px] focus-visible:ring-[var(--casa-blue)]/25';

const controlBase =
  'w-full rounded-lg border border-ws-line bg-white px-3 py-2 text-sm font-medium text-[var(--casa-ink)] transition-colors placeholder:font-normal placeholder:text-[var(--casa-text-subtle)] hover:border-ws-line-firm disabled:cursor-not-allowed disabled:opacity-55';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, focusRing, 'h-10', className)} {...props} />;
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
        'h-10 appearance-none bg-[position:right_0.6rem_center] bg-no-repeat pr-9',
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
    <div className={cn('flex flex-col', className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs font-bold text-[var(--casa-muted)]"
      >
        <span>{label}</span>
        {hint ? <span className="font-normal text-[var(--casa-text-subtle)]">{hint}</span> : null}
      </label>
      {/* At the foot: in a row of fields whose labels wrap differently, the controls still line up. */}
      <div className="mt-auto">{children}</div>
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
  /** The last step of a destructive action, in its confirmation. */
  destructive: 'bg-[#c4282f] text-white hover:bg-[#a51f26] shadow-[0_1px_2px_rgba(127,29,29,0.25)]',
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

/** The meaning colours, as on an offer: red the course, blue the stay, yellow the programme, ink the rest. */
export const TINTS = {
  red: 'bg-[#fdecee] text-[#a3050f]',
  blue: 'bg-[#e3f4fc] text-[#065f8c]',
  sun: 'bg-[#fff7cc] text-[#6b5600]',
  ink: 'bg-[#edf0f5] text-[#2b3546]',
  green: 'bg-[#e5f5eb] text-[#137a3c]',
} as const;

export type Tint = keyof typeof TINTS;

/** An icon on a tinted square: a card's subject, a fact's kind. */
export function IconChip({ icon, tint = 'ink', size = 'sm' }: { icon: ReactNode; tint?: Tint; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center [&_svg]:h-3.5 [&_svg]:w-3.5',
        size === 'md' ? 'h-8 w-8 rounded-xl [&_svg]:h-4 [&_svg]:w-4' : 'h-6 w-6 rounded-lg',
        TINTS[tint]
      )}
    >
      {icon}
    </span>
  );
}

const cardShadow = 'shadow-[0_1px_2px_rgba(15,23,42,0.05)]';

/**
 * A link dressed as a button: a page to go to, an address to write to, a file
 * to download. A path inside the workspace is a `Link`; a `mailto:`, or a
 * route marked `plain`, is a plain anchor.
 */
export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  plain = false,
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  /** A route that streams a file: a plain anchor, so it is never prefetched. */
  plain?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
    buttonVariants[variant],
    buttonSizes[size],
    focusRing,
    className
  );
  return href.startsWith('/') && !plain ? (
    <Link href={href} className={classes}>
      {children}
    </Link>
  ) : (
    <a href={href} className={classes}>
      {children}
    </a>
  );
}

/**
 * A card: one white block on the canvas, 8px, with a 1px border and the
 * faintest contact shadow — the border does the separating. Its header is
 * white with a rule under it: the title in the sans at 800, an icon chip when
 * the card has a subject, and the card's actions on the right.
 *
 * `overflow="visible"` for a card whose controls open a panel over what
 * follows (the record rail); every other card clips, so a table's rows keep
 * the rounded corners.
 */
export function Card({
  title,
  description,
  actions,
  footer,
  icon,
  tint = 'ink',
  bleed = false,
  overflow = 'hidden',
  className,
  children,
}: {
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  tint?: Tint;
  /** True when the body is a table or list that should touch the card's edges. */
  bleed?: boolean;
  overflow?: 'hidden' | 'visible';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-3xl border border-ws-line bg-white',
        overflow === 'hidden' ? 'overflow-hidden' : '',
        cardShadow,
        className
      )}
    >
      {title || actions ? (
        <header className="flex min-h-[50px] flex-wrap items-center justify-between gap-3 rounded-t-3xl border-b border-ws-line px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon ? <IconChip icon={icon} tint={tint} /> : null}
            <div className="min-w-0">
              {title ? <h2 className="text-sm leading-tight font-extrabold text-[var(--casa-ink)]">{title}</h2> : null}
              {description ? (
                <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-[var(--casa-text-subtle)]">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}

      <div className={bleed ? '' : 'px-4 py-4'}>{children}</div>

      {footer ? (
        <footer className="rounded-b-3xl border-t border-ws-line-soft bg-[#f8fafc] px-4 py-2.5">{footer}</footer>
      ) : null}
    </section>
  );
}

function BackLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/60 py-1 pr-3 pl-2 text-xs font-semibold text-[var(--casa-muted)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-white hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40"
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
      {label ?? <Tr de="Zurück" en="Back" />}
    </Link>
  );
}

/** A list's or a page's head, on the canvas: the way back, the title, a line, the actions. */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-6">
      {backHref ? <BackLink href={backHref} label={backLabel} /> : null}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.025em] text-[var(--casa-ink)]">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--casa-text-subtle)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export type Fact = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tint?: Tint;
  href?: string;
};

const FACT_COLUMNS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-3 lg:grid-cols-5',
  6: 'sm:grid-cols-3 lg:grid-cols-6',
};

/**
 * A record's head, the offer page's way: a framed card with the record's
 * name over a soft tint, what it is under it, its status and actions on the
 * right — and under that a bar of its facts, each a label, a value and a line,
 * so the five things a colleague looks for are read before anything is
 * scrolled.
 */
export function RecordHeader({
  backHref,
  backLabel,
  avatar,
  title,
  subtitle,
  status,
  actions,
  facts = [],
  bar,
  tabs,
}: {
  backHref?: string;
  backLabel?: string;
  /** A person's record: their name, shown as large tinted initials beside the title. */
  avatar?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  facts?: readonly Fact[];
  /** A strip under the head for the record's working controls (a queue record: its status and owner). */
  bar?: ReactNode;
  /** The record's tabs (`RecordTabList`), on the head's lower edge. */
  tabs?: ReactNode;
}) {
  return (
    <header className="mb-4">
      {backHref ? <BackLink href={backHref} label={backLabel} /> : null}
      <section className={cn('overflow-hidden rounded-3xl border border-ws-line bg-white', cardShadow)}>
        {/* Clean white: the record's name carries the head, not a tinted wash behind it. */}
        <div className="flex flex-wrap items-start gap-4 px-6 pt-6 pb-5">
          {avatar ? <Avatar name={avatar} size="lg" /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.025em] text-[var(--casa-ink)]">{title}</h1>
              {status}
            </div>
            {subtitle ? <div className="mt-1.5 text-sm text-[var(--casa-text-subtle)]">{subtitle}</div> : null}
          </div>
          {actions ? <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {facts.length ? (
          <dl className={cn('grid grid-cols-2 gap-px border-t border-ws-line-soft bg-ws-line-soft', FACT_COLUMNS[Math.min(facts.length, 6)])}>
            {facts.map((fact) => {
              const body = (
                <>
                  <dt className="mb-1.5 flex items-center gap-2 text-[0.74rem] font-semibold text-[var(--casa-muted)]">
                    {fact.icon ? <IconChip icon={fact.icon} tint={fact.tint} /> : null}
                    {fact.label}
                  </dt>
                  <dd className="truncate text-[0.95rem] font-bold text-[var(--casa-ink)]">
                    {fact.value === null || fact.value === undefined || fact.value === '' ? (
                      <span className="font-semibold text-[var(--casa-text-subtle)]">—</span>
                    ) : (
                      fact.value
                    )}
                  </dd>
                  {fact.sub ? <dd className="mt-0.5 truncate text-xs text-[var(--casa-text-subtle)]">{fact.sub}</dd> : null}
                </>
              );
              return fact.href ? (
                <Link key={fact.label} href={fact.href} className="block min-w-0 bg-[#fbfcfe] px-5 py-3.5 transition-colors hover:bg-[#f4f7fb]">
                  {body}
                </Link>
              ) : (
                <div key={fact.label} className="min-w-0 bg-[#fbfcfe] px-5 py-3.5">
                  {body}
                </div>
              );
            })}
          </dl>
        ) : null}
        {bar ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ws-line bg-[#f4f6f9] px-6 py-3">{bar}</div>
        ) : null}
        {tabs ? <div className="border-t border-ws-line px-3">{tabs}</div> : null}
      </section>
    </header>
  );
}

/** Soft pills with a fine edge: a state is read at a glance without a block of colour shouting it. */
const badgeTones = {
  /** The one that must interrupt: unanswered, unreviewed, waiting on us. */
  accent: 'bg-[#e8f1fd] text-[#1d4e96] ring-[#cfe0f7]',
  neutral: 'bg-[#f1f4f8] text-[#2b3546] ring-[#dde3ec]',
  positive: 'bg-[#e9f7ef] text-[#17693a] ring-[#cbe8d6]',
  warning: 'bg-[#fff4dc] text-[#8a5a00] ring-[#f1dfb0]',
  danger: 'bg-[#fdecec] text-[#a3241f] ring-[#f5cfcd]',
  quiet: 'bg-transparent text-[var(--casa-text-subtle)] ring-ws-line',
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold whitespace-nowrap ring-1 ring-inset',
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
    <div className="rounded-3xl border border-dashed border-ws-line-firm bg-white/50 px-6 py-14 text-center">
      <p className="text-base font-extrabold text-[var(--casa-ink)]">
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
 * A table, the body of a list (list.tsx has the rest: the bar of views and
 * search, groups, initials, status).
 *
 * The column heads are quiet labels on white with a rule under them: a band
 * under the list's bar stacked two greys on top of each other. Rows are
 * separated by the soft line, the first and last columns sit 20px in, and the
 * card around the table frames it.
 */
export function Table({
  head,
  children,
}: {
  head: readonly (ReactNode | { label: ReactNode; align?: 'left' | 'right'; className?: string })[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="ws-table w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--ws-head-line)] bg-[var(--ws-head)]">
            {head.map((column, index) => {
              const isSpec = typeof column === 'object' && column !== null && 'label' in column;
              const label = isSpec ? column.label : column;
              const align = isSpec ? (column.align ?? 'left') : 'left';

              return (
                <th
                  key={index}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold whitespace-nowrap text-[var(--ws-head-text)] first:pl-5 last:pr-5',
                    align === 'right' ? 'text-right' : 'text-left',
                    isSpec ? column.className : undefined
                  )}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/**
 * A clickable table row.
 *
 * Its background — white, every other row a breath of navy, a deeper one on
 * hover — comes from `.ws-table` in globals.css, which can count rows past the
 * group headings. The row carries the hover state and the positioning context; the link itself
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
    <tr data-interactive={interactive || undefined} className={cn('group transition-colors', interactive ? 'relative' : undefined)}>
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
        'px-4 py-3.5 align-middle text-[var(--casa-ink)] first:pl-5 last:pr-5',
        align === 'right' ? 'text-right' : 'text-left',
        className
      )}
    >
      {href ? (
        <Link href={href} className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 focus-visible:ring-inset">
          <span className="sr-only">
            <Tr de="Öffnen" en="Open" />
          </span>
          {/* The row opens something: a quiet arrow at its end, on hover or focus. */}
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-[5px] hidden -translate-y-1/2 text-[var(--casa-text-subtle)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:block"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
          </span>
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

// Dates in the workspace's language (client components that read it from the shell).
export { BirthDate, DateText } from './date-text';
