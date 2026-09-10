import Link from 'next/link';

import { Icon } from './icons';
import { Avatar, roleLabel } from './shell';
import { SidebarToggle } from './sidebar-toggle';
import type { StaffUser } from '@/lib/admin/auth';

/**
 * The bar across the top of every workspace screen.
 *
 * Sticky, thin, and it holds the things that are true everywhere rather than
 * anything about the page underneath: the control that folds the rail, the
 * date with a way back to the day view, and who is signed in.
 *
 * WHY IDENTITY MOVED HERE from the foot of the sidebar. It was the only thing
 * down there, it collided with the browser's own bottom-left furniture, and it
 * vanished when the rail collapsed — so signing out required expanding the rail
 * first. The rail is now navigation and nothing else.
 *
 * NO NOTIFICATION BELL YET, deliberately. There is nothing behind it: the
 * counts that used to sit in the rail were queue backlogs, not notifications,
 * and a bell that opens an empty panel teaches people to ignore it. When there
 * is a real source — something happened, to a record you own, since you last
 * looked — it belongs here, to the left of the date.
 */
export function TopBar({
  user,
  signOutAction,
}: {
  user: StaffUser;
  signOutAction: () => Promise<void>;
}) {
  const today = new Date();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-ws-line bg-white/92 px-4 backdrop-blur-sm lg:px-6">
      <SidebarToggle />

      <Link
        href="/admin"
        title="The day view"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--casa-muted)] transition-colors hover:bg-ws-sunk hover:text-[var(--casa-ink)]"
      >
        <span aria-hidden="true" className="shrink-0 text-[var(--casa-text-subtle)]">
          {Icon.calendar}
        </span>
        <span className="font-medium">
          {today.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </Link>

      <span className="flex-1" />

      <Link
        href="/"
        title="Back to the website"
        className="hidden size-8 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] transition-colors hover:bg-ws-sunk hover:text-[var(--casa-ink)] sm:flex"
      >
        <span aria-hidden="true">{Icon.back}</span>
      </Link>

      <span aria-hidden="true" className="hidden h-6 w-px bg-ws-line sm:block" />

      <span className="flex items-center gap-2.5">
        <Avatar name={user.name} size={30} />
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-semibold leading-tight text-[var(--casa-ink)]">
            {user.name}
          </span>
          <span className="block text-[0.7rem] leading-tight text-[var(--casa-text-subtle)]">
            {roleLabel(user.role)}
          </span>
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="flex size-8 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] transition-colors hover:bg-ws-sunk hover:text-[var(--casa-ink)]"
          >
            {Icon.signOut}
          </button>
        </form>
      </span>
    </header>
  );
}
