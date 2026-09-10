'use client';

import { useRef, useState, type ReactNode } from 'react';

import { Button } from './ui';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * The workspace's two dialogs.
 *
 * FORM DIALOG — a create or edit form in a popup, opened from a button. The
 * form inside is an ordinary `<form action={serverAction}>`; the dialog only
 * frames it. Lists stay lists, and a form appears when someone asks for one.
 *
 * CONFIRM SUBMIT — the button every destructive action uses. It sits inside
 * the form that performs the action and, instead of submitting, opens a
 * confirmation. Confirming submits the enclosing form with a hidden
 * `confirmed=1`, which the server action checks; so the confirmation is not
 * only visual, and a request that skips the dialog is refused.
 */

const panel = (width: 'md' | 'lg') =>
  `${width === 'lg' ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl p-6 sm:rounded-2xl`;

export function FormDialog({
  trigger,
  title,
  description,
  children,
  triggerVariant = 'secondary',
  size = 'md',
  width = 'md',
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  triggerVariant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  /** `lg` for a multi-step form; the default suits a handful of fields. */
  width?: 'md' | 'lg';
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant={triggerVariant} size={size} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <DialogContent className={panel(width)} closeLabel="Close">
        <DialogTitle className="text-lg">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="mt-1 text-sm">{description}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
        <div className="mt-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmSubmit({
  children,
  title,
  description,
  confirmLabel = 'Delete',
  variant = 'danger',
  size = 'sm',
}: {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLInputElement>(null);

  function confirm() {
    const form = anchor.current?.form;
    if (!form) return;
    anchor.current!.value = '1';
    setOpen(false);
    form.requestSubmit();
  }

  return (
    <>
      <input ref={anchor} type="hidden" name="confirmed" value="" />
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={panel('md')} showCloseButton={false}>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm">{description}</DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="md">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant={variant} size="md" onClick={confirm}>
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
