'use client';

import { useState, type ReactNode } from 'react';

import { DIALOG_OVERLAY, DialogHead, dialogPanel } from '@/components/admin/dialogs';
import { useWsLang } from '@/components/admin/lang';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/**
 * A person's dialog, opened by their whole row (docs/ADMIN_WORKSPACE.md
 * §Lists): the trigger is a transparent button stretched over the row, the
 * way `Cell href` stretches a link, so the list carries no Edit column.
 * Render it in the row's first cell, inside a `TableRow interactive`.
 */
export function RowDialog({
  label,
  title,
  description,
  children,
}: {
  /** What the row opens, for a screen reader. */
  label: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useWsLang();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 z-10 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 focus-visible:ring-inset"
      >
        <span className="sr-only">{label}</span>
      </button>
      <DialogContent className={dialogPanel('lg')} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
        <DialogHead title={title} description={description} />
        <div className="px-6 pt-5 pb-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
