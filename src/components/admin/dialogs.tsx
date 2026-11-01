'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { Icon } from './icons';
import { DIALOG_OVERLAY, SidePanel } from './side-panel';
export { DIALOG_OVERLAY } from './side-panel';
import { useWsLang } from './lang';
import { Button, IconChip, type Tint } from './ui';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * The workspace's two dialogs (docs/ADMIN_WORKSPACE.md §Dialogs).
 *
 * FORM DIALOG — a create or edit form at the side, opened from a button. Wide
 * worksheets can opt into the centred layout. The
 * form inside is an ordinary `<form action={serverAction}>`; the dialog only
 * frames it: a head (title, what it is about, an optional icon), the form,
 * and the form's own `DialogFooter` — Cancel and the one primary action,
 * pinned to the foot of the window while a long form scrolls, and busy while
 * the form is being sent. Lists stay lists, and a form appears when someone
 * asks for one.
 *
 * CONFIRM SUBMIT — the button every destructive action uses. It sits inside
 * the form that performs the action and, instead of submitting, opens a
 * confirmation. Confirming submits the enclosing form with a hidden
 * `confirmed=1`, which the server action checks; so the confirmation is not
 * only visual, and a request that skips the dialog is refused.
 *
 * The panel lets what opens inside it overflow (a date picker's calendar, a
 * room picker): the window scrolls, not the panel.
 */

const WIDTHS = { sm: 'max-w-[440px]', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;
export const dialogPanel = (width: keyof typeof WIDTHS) => cn('casa-ws-dialog overflow-visible rounded-ws-card sm:rounded-ws-card', WIDTHS[width]);

/** Inside a dialog: the footer brings Cancel and pins itself to the foot. */
const InDialog = createContext(false);

export function DialogHead({ title, description, icon, tint, titleClassName }: { title: string; description?: string; icon?: ReactNode; tint?: Tint; titleClassName?: string }) {
  return (
    <div className="flex items-start gap-3.5 px-6 pt-6 pr-16">
      {icon ? <IconChip icon={icon} tint={tint ?? 'ink'} size="md" /> : null}
      <div className="min-w-0 pt-0.5">
        <DialogTitle className={cn('text-[1.08rem] leading-snug font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]', titleClassName)}>{title}</DialogTitle>
        {description ? (
          <DialogDescription className="mt-1 text-[0.86rem] leading-relaxed text-[var(--casa-muted)]">{description}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
      </div>
    </div>
  );
}

export function FormDialog({
  trigger,
  title,
  description,
  icon,
  tint,
  children,
  triggerVariant = 'secondary',
  size = 'md',
  width = 'md',
  defaultOpen = false,
  titleClassName,
  presentation = width === 'xl' ? 'dialog' : 'side',
}: {
  trigger: ReactNode;
  /** Standard forms edit at the side; broad worksheets can keep the centred layout. */
  presentation?: 'side' | 'dialog';
  title: string;
  description?: string;
  /** A subject icon beside the title, on its tint: what the record is about. */
  icon?: ReactNode;
  tint?: Tint;
  children: ReactNode;
  triggerVariant?: 'primary' | 'secondary' | 'ghost' | 'tertiary';
  size?: 'sm' | 'md';
  /** `lg` for a multi-step form or two columns, `xl` for a grid (a week's plan); the default suits a handful of fields. */
  width?: 'sm' | 'md' | 'lg' | 'xl';
  /** Open on first render — for a screen that names the record in its URL. */
  defaultOpen?: boolean;
  /** For a module with its own type — the dialog is portalled out of the module's scope. */
  titleClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useWsLang();
  if (presentation === 'side') {
    return <SidePanel
      open={open}
      onOpenChange={setOpen}
      triggerAsChild
      trigger={<Button type="button" variant={triggerVariant} size={size} aria-haspopup="dialog" data-dialog="form">{trigger}</Button>}
      title={title}
      subtitle={description}
      icon={icon}
      tint={tint}
      width={width === 'sm' ? 'md' : 'lg'}
      className={cn('casa-form-panel [&>header]:bg-white [&_label]:font-medium [&_.grid-cols-2]:grid-cols-1 sm:[&_.grid-cols-2]:grid-cols-2', width === 'lg' && 'sm:max-w-2xl', width === 'xl' && 'sm:max-w-4xl')}
    >
      <DialogBody>{children}</DialogBody>
    </SidePanel>;
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant={triggerVariant} size={size} onClick={() => setOpen(true)} aria-haspopup="dialog" data-dialog="form">
        {trigger}
      </Button>
      <DialogContent className={dialogPanel(width)} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
        <DialogHead title={title} description={description} icon={icon} tint={tint} titleClassName={titleClassName} />
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/** The body of a dialog that holds its own form: its padding, and a `DialogFooter` pinned to the foot with Cancel. */
export function DialogBody({ children }: { children: ReactNode }) {
  return (
    <InDialog.Provider value>
      <div className="px-6 pt-5 pb-6">{children}</div>
    </InDialog.Provider>
  );
}

/**
 * A form's actions: the primary button (and anything before it), with Cancel in a dialog. In a dialog
 * it is the panel's foot — a rule above, pinned to the window's foot while a long form scrolls — and
 * while the form is being sent its submit button shows it and takes no second click. `start` sits on
 * the left: a quiet secondary action such as „Entfernen".
 */
export function DialogFooter({ children, start, cancel = true }: { children: ReactNode; start?: ReactNode; cancel?: boolean }) {
  const inDialog = useContext(InDialog);
  const { pending } = useFormStatus();
  const { t } = useWsLang();
  return (
    <div
      data-pending={pending || undefined}
      aria-busy={pending || undefined}
      className={cn(
        'ws-dialog-foot flex flex-wrap items-center gap-2',
        inDialog
          ? 'sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 rounded-b-ws-card border-t border-ws-line bg-white/95 px-6 py-3.5 backdrop-blur-sm'
          : 'mt-4'
      )}
    >
      {start ? <div className="mr-auto flex items-center gap-2">{start}</div> : null}
      <div className="ml-auto flex items-center gap-2">
        {inDialog && cancel ? (
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="md">
              {t('Abbrechen', 'Cancel')}
            </Button>
          </DialogClose>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function ConfirmSubmit({
  children,
  title,
  description,
  confirmLabel,
  variant = 'danger',
  size = 'sm',
  disabled = false,
}: {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  /** `primary` for a confirmed action that is the screen's one (sending a mail). */
  variant?: 'danger' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const { t } = useWsLang();
  const anchor = useRef<HTMLInputElement>(null);
  const danger = variant === 'danger';

  function confirm() {
    const form = anchor.current?.form;
    if (!form) return;
    anchor.current!.value = '1';
    setSending(true);
    setOpen(false);
    form.requestSubmit();
  }

  return (
    <>
      <input ref={anchor} type="hidden" name="confirmed" value="" />
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={sending || disabled}
        aria-haspopup="dialog"
        data-dialog="confirm"
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={dialogPanel('sm')} overlayClassName={DIALOG_OVERLAY} showCloseButton={false}>
          <div className="flex items-start gap-3.5 px-6 pt-6">
            <IconChip icon={danger ? Icon.attention : Icon.check} tint={danger ? 'red' : 'ink'} size="md" />
            <div className="min-w-0 pt-0.5">
              <DialogTitle className="text-[1.04rem] leading-snug font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">{title}</DialogTitle>
              <DialogDescription className="mt-1.5 text-[0.86rem] leading-relaxed text-[var(--casa-muted)]">{description}</DialogDescription>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2 rounded-b-ws-card border-t border-ws-line bg-ws-sunk/50 px-6 py-3.5">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="md">
                {t('Abbrechen', 'Cancel')}
              </Button>
            </DialogClose>
            <Button type="button" variant={danger ? 'destructive' : 'primary'} size="md" onClick={confirm}>
              {confirmLabel ?? t('Löschen', 'Delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
