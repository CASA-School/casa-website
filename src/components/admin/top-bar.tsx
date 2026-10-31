import { canAccess } from '@/lib/admin/access';
import type { StaffUser } from '@/lib/admin/auth';
import { getI18n } from '@/lib/admin/i18n.server';
import { cn } from '@/lib/utils';

import { CommandSearch } from './command-search';
import { FeedbackButton } from './feedback/feedback-button';
import { createItems, type Shortcut } from './command-shortcuts';
import { Icon } from './icons';
import { LangSwitch } from './lang-switch';
import { AccountMenu, BarLink, CreateMenu } from './top-bar-menus';

/**
 * The top bar (Rahman, 2026-10-14: "a top nav but very sleek and elegant for
 * some of the functionalities"). Desktop only — on a phone the navy band is
 * already the top bar. What a colleague reaches for from any page: search on
 * the left, then the Tagesplan (FileMaker's calendar, the screen the team opens
 * first — 2026-10-19), "Neu", „Feedback" (2026-10-31), the language, and who is signed in. The navigation
 * stays in the sidebar; there is no notification bell until something real
 * would ring it (CLAUDE.md, workspace design standards).
 *
 * Glass over the canvas: it takes the page's own ground, a fine line under it,
 * and the page scrolls softly beneath.
 */
export async function TopBar({
  user,
  roleText,
  siteHref,
  signOutAction,
  pages,
  focus = false,
}: {
  user: StaffUser;
  /** The pages the palette offers (command-shortcuts.tsx), built once by the shell. */
  pages: Shortcut[];
  /** The role in this language; the shell owns the role names. */
  roleText: string;
  /** The public website, from the admin host too. */
  siteHref: string;
  signOutAction: () => Promise<void>;
  focus?: boolean;
}) {
  const { t } = await getI18n();
  const creates: Shortcut[] = createItems(user, t);

  return (
    <header className="sticky top-0 z-30 hidden border-b border-ws-line/70 bg-[color-mix(in_srgb,var(--ws-canvas)_80%,transparent)] backdrop-blur-xl backdrop-saturate-150 lg:block">
      <div className={cn('flex h-14 items-center gap-3', focus ? 'px-6' : 'mx-auto max-w-[calc(1180px+4.5rem)] px-9')}>
        <CommandSearch variant="bar" pages={pages} creates={creates} />
        <div className="ml-auto flex items-center gap-1.5">
          {canAccess(user, 'day') ? <BarLink href="/admin/day" label={t('Tagesplan', 'Day plan')} icon={Icon.calendar} /> : null}
          {creates.length ? <CreateMenu items={creates} /> : null}
          {/* Feedback from any screen (0112): what does not work, what FileMaker has and this lacks. */}
          <FeedbackButton firstName={user.name.trim().split(/\s+/)[0] ?? user.name} canReview={canAccess(user, 'feedback')} />
          <span className="mx-1.5">
            <LangSwitch tone="page" />
          </span>
          <span aria-hidden="true" className="mr-1 h-5 w-px bg-ws-line" />
          <AccountMenu
            name={user.name}
            role={roleText}
            email={user.email}
            siteHref={siteHref}
            signOutAction={signOutAction}
          />
        </div>
      </div>
    </header>
  );
}
