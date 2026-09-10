'use client';

import { useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The rest of a form, revealed when the form is ready for it.
 *
 * This replaces a "More / Less" toggle. A toggle asks a colleague to decide
 * whether they want to see fields before they know what the fields are, and
 * then to click; it is the interface admitting it does not know what matters.
 * This watches the fields that DO matter — the ones named in `requires` — and
 * opens once they all have a value. Type a name and an email and the optional
 * details are simply there.
 *
 * It reads the form's DOM rather than holding form state, so the fields it
 * wraps stay server-rendered and uncontrolled: no per-form client state, no
 * duplicated validation, and any form can use it by naming its inputs. That
 * read is a `useSyncExternalStore` snapshot, which is both the honest
 * description of what it is — a subscription to something outside React — and
 * the shape the `react-hooks` rules allow, since setting state inside an
 * effect to mirror the DOM is what they forbid.
 *
 * The server snapshot is `true`, so a no-JavaScript render shows every field:
 * a hidden field nobody can reveal is worse than a long form. `alwaysOpen` is
 * for editing, where the person has already chosen to go deeper, and for a
 * final review step where there is nothing left to earn.
 */
export function OptionalSection({
  requires,
  heading,
  alwaysOpen = false,
  children,
}: {
  /** `name` of each input that must hold a value before this opens. */
  requires: readonly string[];
  heading: string;
  alwaysOpen?: boolean;
  children: ReactNode;
}) {
  const anchor = useRef<HTMLDivElement>(null);

  const subscribe = useCallback((onChange: () => void) => {
    // Capture phase on the document: one listener, and it sees every field in
    // the form regardless of where this section sits in it.
    document.addEventListener('input', onChange, true);
    document.addEventListener('change', onChange, true);
    return () => {
      document.removeEventListener('input', onChange, true);
      document.removeEventListener('change', onChange, true);
    };
  }, []);

  const ready = useSyncExternalStore(
    subscribe,
    () => {
      const form = anchor.current?.closest('form');
      if (!form) return false;
      return requires.every((name) => {
        const field = form.elements.namedItem(name);
        if (!field) return true;
        const value = (field as HTMLInputElement).value;
        return typeof value === 'string' && value.trim() !== '';
      });
    },
    () => true
  );

  const visible = alwaysOpen || ready;

  return (
    <div ref={anchor}>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none',
          visible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-ws-line-soft pt-4">
            <p className="mb-3 text-xs font-medium text-[var(--casa-muted)]">{heading}</p>
            <div className={visible ? '' : 'invisible'} aria-hidden={!visible}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
