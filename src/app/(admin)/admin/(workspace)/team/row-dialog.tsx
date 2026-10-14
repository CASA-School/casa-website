'use client';

import { useState, type ReactNode } from 'react';

import { useWsLang } from '@/components/admin/lang';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

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
      <DialogContent className="casa-ws-dialog max-w-2xl rounded-3xl p-6 sm:rounded-3xl" closeLabel={t('Schließen', 'Close')}>
        <DialogTitle className="text-lg font-extrabold">{title}</DialogTitle>
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
