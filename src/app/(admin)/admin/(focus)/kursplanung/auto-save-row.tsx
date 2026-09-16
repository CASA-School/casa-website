'use client';

import type { ReactNode } from 'react';

/**
 * A table row whose controls save themselves: a dropdown when it changes, an
 * input when it is left with a new value. Each control names its form through
 * the `form` attribute — a form element cannot span table cells — so the row
 * only has to ask the control's form to submit. Without JavaScript the same
 * controls still post through Enter, which the hidden submit button allows.
 */
export function AutoSaveRow({ children }: { children: ReactNode }) {
  return (
    <tr
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) e.target.form?.requestSubmit();
      }}
      onBlur={(e) => {
        const t = e.target;
        if (t instanceof HTMLInputElement && t.type !== 'hidden' && t.value !== t.defaultValue) t.form?.requestSubmit();
      }}
    >
      {children}
    </tr>
  );
}
