'use client';

import type { ReactNode } from 'react';

import { DialogBody } from '@/components/admin/dialogs';
import { SidePanel } from '@/components/admin/side-panel';

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
  return (
    <SidePanel
      triggerAsChild
      trigger={<button type="button" className="absolute inset-0 z-10 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 focus-visible:ring-inset"><span className="sr-only">{label}</span></button>}
      title={title}
      subtitle={description}
      width="lg"
      className="casa-form-panel sm:max-w-2xl [&>header]:bg-white"
    >
      <DialogBody>{children}</DialogBody>
    </SidePanel>
  );
}
