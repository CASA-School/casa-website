import type { ReactNode } from 'react';

/**
 * The foot of a record: where its destructive actions live — cancel, delete —
 * out of the head, where they stood beside the routine ones at the same
 * weight. Each child is a form holding a `ConfirmSubmit` (variant `danger`, so
 * the confirmation's own button stays red); here its trigger is quiet, grey
 * until hovered.
 */
export function RecordFoot({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-1 [&_form>button]:border-transparent [&_form>button]:bg-transparent [&_form>button]:text-[var(--casa-text-subtle)] [&_form>button:hover]:text-[var(--casa-danger-text)]">
      {children}
    </div>
  );
}
