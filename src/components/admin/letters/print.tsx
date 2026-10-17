'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import type { Letter } from '@/lib/admin/letters/types';

import { LetterSheet, printManyClass, printNextClass, printRootClass } from './letter-sheet';

const subscribeNothing = () => () => {};

/**
 * The paper copy: the letter rendered a second time on <body>, hidden on
 * screen; on paper it is the whole document (globals.css, `@page letter`).
 */
export function PrintCopy({ letter }: { letter: Letter }) {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div data-letter-print className={printRootClass}>
      <LetterSheet letter={letter} variant="print" />
    </div>,
    document.body
  );
}

/** Print, with the file named after the letter when it is saved as a PDF. */
export function printLetter(name: string) {
  const title = document.title;
  document.title = name;
  window.addEventListener('afterprint', () => (document.title = title), { once: true });
  window.print();
}

/** Several letters as one paper copy, each starting its own page: a sitting's letters to all (0038). */
export function PrintCopies({ letters }: { letters: readonly Letter[] }) {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div data-letter-print className={printManyClass}>
      {letters.map((letter, i) => (
        <div key={i} className={i > 0 ? printNextClass : undefined}>
          <LetterSheet letter={letter} variant="print" />
        </div>
      ))}
    </div>,
    document.body
  );
}
