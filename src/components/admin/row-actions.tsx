'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { menuItem, menuPanel } from './choice-menu';

export type RowAction = {
  label: string;
  /** A page in the workspace (a mail too: the mail screen). */
  href: string;
  icon?: ReactNode;
  /** A line above it in the menu: the next group of actions. */
  divide?: boolean;
};

/**
 * What a colleague does next with a row of a list (Rahman, 2026-10-21: „an action button would be
 * amazing"): the step the list is for as a small button — „Folgekurs buchen" where nothing is booked
 * after, „Erinnern" where money is open — and the rest behind „…", in CASA's menu. Every action is a
 * page (a booking wizard, a letter, a payment) or an e-mail; nothing happens from the list itself.
 * It sits above the row's link (z-20), as the booking colour does, and replaces the row's arrow: „…" says
 * there is more, the rest of the row still opens the record (globals.css, `.ws-row-arrow`).
 */
export function RowActions({ label, primary, actions }: { label: string; primary?: RowAction | null; actions: readonly RowAction[] }) {
  if (!primary && !actions.length) return null;
  return (
    <span data-row-actions="" className="relative z-20 inline-flex items-center justify-end gap-1">
      {primary ? (
        <ActionLink
          action={primary}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.78rem] font-semibold whitespace-nowrap text-[var(--casa-ink)] ring-1 ring-ws-line transition-colors ring-inset outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-3.5 [&_svg]:text-[var(--casa-muted)]"
        >
          {primary.icon}
          {primary.label}
        </ActionLink>
      ) : null}
      {actions.length ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            aria-label={label}
            className="grid size-7 place-items-center rounded-lg text-[var(--casa-muted)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 data-[state=open]:bg-ws-sunk data-[state=open]:text-[var(--casa-ink)]"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-4">
              <circle cx="3.5" cy="8" r="1.25" />
              <circle cx="8" cy="8" r="1.25" />
              <circle cx="12.5" cy="8" r="1.25" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className={cn(menuPanel, 'min-w-[14rem]')}>
            {actions.map((action) => [
              action.divide ? <DropdownMenuSeparator key={`${action.href}-line`} className="mx-1 my-1 bg-ws-line-soft" /> : null,
              <DropdownMenuItem key={action.href} asChild className={menuItem}>
                <Link href={action.href}>
                  {action.icon}
                  {action.label}
                </Link>
              </DropdownMenuItem>,
            ])}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </span>
  );
}

function ActionLink({ action, className, children }: { action: RowAction; className?: string; children: ReactNode }) {
  return (
    <Link href={action.href} className={className}>
      {children}
    </Link>
  );
}
