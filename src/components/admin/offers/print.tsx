'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import type { OfferLetter } from '@/lib/admin/offers/document';

import { LetterSheet, printRootClass } from './letter';

const subscribeNothing = () => () => {};

/**
 * The paper copy: the letter rendered a second time on <body>, hidden on
 * screen; on paper it is the whole document (globals.css, `@page offer`).
 */
export function PrintCopy({ letter }: { letter: OfferLetter }) {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div data-offer-print className={printRootClass}>
      <LetterSheet letter={letter} variant="print" />
    </div>,
    document.body
  );
}

/** Print, with the file named after the offer when it is saved as a PDF. */
export function printOffer(name: string) {
  const title = document.title;
  document.title = name;
  window.addEventListener('afterprint', () => (document.title = title), { once: true });
  window.print();
}
