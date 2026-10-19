'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, type ReactNode } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { menuItem, menuPanel } from './choice-menu';
import { Icon } from './icons';
import { useWsLang } from './lang';

const panel = menuPanel;
const item = menuItem;

/** A quiet control on the bar: no fill until it is hovered or open. */
const control =
  'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.84rem] font-semibold text-[var(--casa-ink)] transition-colors outline-none hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 data-[state=open]:bg-white data-[state=open]:shadow-[0_1px_2px_rgba(16,24,40,0.06)]';

export type CreateItem = { href: string; label: string; icon: ReactNode };

/** A page of its own on the bar — the Tagesplan, FileMaker's Cmd+1 (2026-10-19) — marked while it is open. */
export function BarLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname();
  const on = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={on ? 'page' : undefined}
      className={cn(control, 'ring-1 ring-ws-line ring-inset bg-white/60', on && 'bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-[var(--casa-ink-deep)]/25')}
    >
      <span aria-hidden="true" className="[&_svg]:size-3.5">
        {icon}
      </span>
      {label}
    </Link>
  );
}

/** "Neu": what this colleague may create, wherever they are. */
export function CreateMenu({ items }: { items: readonly CreateItem[] }) {
  const { t } = useWsLang();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={cn(control, 'ring-1 ring-ws-line ring-inset bg-white/60')}>
        <span aria-hidden="true" className="[&_svg]:size-3.5">
          {Icon.plus}
        </span>
        {t('Neu', 'New')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={panel}>
        {items.map((entry) => (
          <DropdownMenuItem key={entry.href} asChild className={item}>
            <Link href={entry.href}>
              {entry.icon}
              {entry.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Who is signed in: their account, the website, and out. `rail` is the initials alone, on the phone's navy band. */
export function AccountMenu({
  name,
  role,
  email,
  siteHref,
  signOutAction,
  tone = 'bar',
}: {
  name: string;
  role: string;
  email: string | null;
  siteHref: string;
  signOutAction: () => Promise<void>;
  tone?: 'bar' | 'rail';
}) {
  const { t } = useWsLang();
  const signOut = useRef<HTMLFormElement>(null);
  const first = name.trim().split(/\s+/)[0] ?? name;

  return (
    <>
      <form ref={signOut} action={signOutAction} hidden />
      <DropdownMenu modal={false}>
        {tone === 'rail' ? (
          <DropdownMenuTrigger
            aria-label={t('Dein Konto', 'Your account')}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Initials name={name} tone="rail" />
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger className={cn(control, 'gap-2 pr-2.5 pl-1')} aria-label={t('Dein Konto', 'Your account')}>
            <Initials name={name} />
            <span className="max-w-[9rem] truncate">{first}</span>
            <span aria-hidden="true" className="text-[var(--casa-text-subtle)] [&_svg]:size-3.5">
              {Icon.chevronDown}
            </span>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="end" sideOffset={8} className={panel}>
          <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2">
            <Initials name={name} size="lg" />
            <span className="min-w-0">
              <span className="block truncate text-[0.88rem] font-bold">{name}</span>
              <span className="block truncate text-xs font-medium text-[var(--casa-text-subtle)]">{email ?? role}</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-1 my-1.5 bg-ws-line-soft" />
          <DropdownMenuItem asChild className={item}>
            <Link href="/admin/account">
              {Icon.person}
              {t('Dein Konto', 'Your account')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={item}>
            <a href={siteHref}>
              {Icon.website}
              {t('Zur Website', 'The website')}
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-1 my-1.5 bg-ws-line-soft" />
          <DropdownMenuItem className={item} onSelect={() => signOut.current?.requestSubmit()}>
            {Icon.signOut}
            {t('Abmelden', 'Sign out')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/**
 * Initials on FileMaker's navy, as a colleague appears everywhere in the
 * workspace; a lighter disc on the navy band. Never a photograph: the portraits
 * in public/media/casa/team/ are synthetic placeholders (CLAUDE.md rule 3).
 */
function Initials({ name, size = 'sm', tone = 'page' }: { name: string; size?: 'sm' | 'lg'; tone?: 'page' | 'rail' }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white',
        tone === 'rail' ? 'bg-[#2e5288] ring-1 ring-white/15' : 'bg-[var(--fm-navy)]',
        size === 'lg' ? 'size-9 text-[0.78rem]' : 'size-7 text-[0.66rem]'
      )}
    >
      {initials}
    </span>
  );
}
