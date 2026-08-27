'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

/*
 * The CASA modal.
 *
 * Built on the Radix Dialog that `sheet.tsx` already pulls in, so this costs no
 * new dependency and inherits the four things a hand-rolled modal in this repo
 * keeps getting wrong: focus moves into the panel and is trapped, focus returns
 * to the trigger on close, Escape closes, and the scroll lock compensates for
 * the disappearing scrollbar instead of shifting the page under the overlay.
 *
 * `sheet.tsx` is stock shadcn — a side drawer on shadcn's own tokens
 * (bg-background, bg-black/50, shadow-lg). This is a centred panel on CASA
 * tokens. Different shapes for different jobs, so it sits beside it.
 *
 * rounded-3xl is the `feature` tier in globals.css — the one the radius
 * scale names for outer shells, heroes and modals. rounded-2xl is a retired
 * step that now renders identically to a card.
 *
 * z-[1000], matching sheet.tsx and AssistantWidget. Not z-50: the site header is
 * `sticky top-0 z-[900]`, so a z-50 overlay portalled to <body> is painted over
 * by the header. Two hand-rolled modals in this repo still use z-50.
 */

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-[1000] bg-[color:var(--casa-ink-deep)]/65',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        'motion-reduce:animate-none',
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = 'Close',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      {/*
        The positioner scrolls, not the panel, so a tall modal on a short screen
        can be scrolled past its own bottom edge on every browser. Centring with
        flex inside an overflow-y-auto parent (rather than the usual
        top-1/2 + -translate-y-1/2) is what makes that work: a translated panel
        taller than the viewport has its top half clipped and unreachable.

        items-end on mobile makes it a bottom sheet, which is the shape the rest
        of the site already uses for a modal on a phone.
      */}
      <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain px-3 py-4 sm:p-6">
        <div className="flex min-h-full items-end justify-center sm:items-center">
          <DialogPrimitive.Content
            data-slot="dialog-content"
            className={cn(
              'relative w-full max-w-3xl overflow-hidden rounded-t-3xl bg-white shadow-[var(--shadow-modal)] sm:rounded-3xl',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'motion-reduce:animate-none',
              className
            )}
            {...props}
          >
            {children}
            {showCloseButton ? (
              <DialogPrimitive.Close
                aria-label={closeLabel}
                className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-[var(--casa-ink)] backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2"
              >
                <X className="size-4" aria-hidden />
              </DialogPrimitive.Close>
            ) : null}
          </DialogPrimitive.Content>
        </div>
      </div>
    </DialogPrimitive.Portal>
  );
}

/**
 * Radix warns when a Dialog has no Title, and a screen reader announces the
 * dialog by it. Render it visibly, or wrap it in `<VisuallyHidden>` upstream.
 */
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-2xl font-bold leading-snug text-[var(--casa-ink)]', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-base leading-relaxed text-[var(--casa-muted)]', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
};
