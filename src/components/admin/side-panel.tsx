'use client';

import { Dialog as Primitive } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { DIALOG_OVERLAY } from './dialogs';
import { Icon } from './icons';
import { useWsLang } from './lang';
import { IconChip, type Tint } from './ui';

/**
 * A panel that slides in from the right (2026-10-19, Rahman: "side popups … when clicked it opens a
 * beautiful side-popup"): the detail behind a tile or a row, without leaving the page or laying it
 * all out at once. A head with what it is about, a body that scrolls on its own, and an optional
 * foot. It is a dialog — focus stays in it, Escape closes it — and carries the dialog's slot, so a
 * date field's calendar inside it opens over it (`Floating`).
 *
 * With `trigger` it opens itself from that (a tile, a row); without, its `open` is the page's.
 */
export function SidePanel({
  trigger,
  triggerClassName,
  triggerLabel,
  open,
  defaultOpen,
  onOpenChange,
  title,
  subtitle,
  icon,
  tint = 'ink',
  footer,
  width = 'md',
  children,
}: {
  trigger?: ReactNode;
  triggerClassName?: string;
  /** The trigger's accessible name, when its content does not say it plainly. */
  triggerLabel?: string;
  open?: boolean;
  /** Open on arrival, as from a link that names the panel (`/admin/day?termine=1`). */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tint?: Tint;
  footer?: ReactNode;
  width?: 'md' | 'lg';
  children: ReactNode;
}) {
  const { t } = useWsLang();
  return (
    <Primitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? (
        <Primitive.Trigger aria-label={triggerLabel} className={triggerClassName}>
          {trigger}
        </Primitive.Trigger>
      ) : null}
      <Primitive.Portal>
        <Primitive.Overlay
          className={cn(
            'fixed inset-0 z-[1000] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
            DIALOG_OVERLAY
          )}
        />
        <Primitive.Content
          data-slot="dialog-content"
          aria-describedby={undefined}
          className={cn(
            // `casa-ws-dialog`: the workspace's type (globals.css), the panel being portalled out of the shell.
            'casa-ws-dialog fixed inset-y-0 right-0 z-[1000] flex w-full flex-col bg-white shadow-[-24px_0_60px_-28px_rgba(15,23,42,0.45)] outline-none sm:inset-y-2 sm:right-2 sm:rounded-3xl',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300',
            width === 'lg' ? 'sm:max-w-[560px]' : 'sm:max-w-[440px]'
          )}
        >
          <header className="flex items-start gap-3 border-b border-ws-card-line bg-ws-card-head px-6 pt-5 pb-4 sm:rounded-t-3xl">
            {icon ? <IconChip icon={icon} tint={tint} size="md" /> : null}
            <div className="min-w-0 flex-1 pt-0.5">
              <Primitive.Title className="text-[1.08rem] leading-snug font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">{title}</Primitive.Title>
              {subtitle ? <div className="mt-0.5 text-[0.84rem] text-[var(--casa-muted)]">{subtitle}</div> : null}
            </div>
            <Primitive.Close
              aria-label={t('Schließen', 'Close')}
              className="-mt-1 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--casa-muted)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4"
            >
              {Icon.close}
            </Primitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? <footer className="border-t border-ws-line bg-ws-card-head px-6 py-3.5 sm:rounded-b-3xl">{footer}</footer> : null}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
