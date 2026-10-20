'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useWsLang } from '@/components/admin/lang';
import { printLetter } from '@/components/admin/letters/print';
import { Button } from '@/components/admin/ui';

const subscribeNothing = () => () => {};

/**
 * A day-one test's paper (a booklet, a QR poster): shown on screen as an A4 sheet, and rendered a second
 * time on <body> for paper (globals.css, `@page entry-test`), as the class list is.
 */
export function PrintSheet({ name, children }: { name: string; children: ReactNode }) {
  const { t } = useWsLang();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => printLetter(name)}>
          {t('Drucken / PDF', 'Print / PDF')}
        </Button>
      </div>
      <div className="mx-auto max-w-[800px] rounded-2xl border border-ws-line bg-white px-10 py-9 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        {children}
      </div>
      {mounted ? createPortal(<div data-letter-print className="ws-entry-test-print hidden bg-white">{children}</div>, document.body) : null}
    </>
  );
}
