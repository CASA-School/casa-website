import 'server-only';

import type { Answer, EntryTestId, EntryTestVersion } from './types';

/**
 * The answer keys of the corrected booklets (24/25 Sep 2026), from each test's Antwortschlüssel A und B.
 * One answer per slot, in slot order: slot order is task order, a multiple-choice task is one slot (A–D) and
 * a reading task one slot per statement (richtig/falsch). Server only: never send a key to a browser.
 */
export const KEYS: Record<EntryTestId, Record<EntryTestVersion, Exclude<Answer, ''>[]>> = {
  a2: {
    A: [
      'A', 'B', 'D', 'B', 'B', 'C', 'D', 'D', 'B', 'B', // 1–10
      'A', 'C', 'B', 'A', 'D', 'C', 'A', 'C', 'B', 'A', // 11–20
      'D', 'C', 'A', 'C', 'B', 'C', 'A', 'C', 'A', 'D', // 21–30
      'D', 'D', 'B', 'C', 'D', 'A', 'falsch', 'richtig', 'richtig', 'falsch', // 31–38.2
    ],
    B: [
      'B', 'A', 'D', 'C', 'A', 'B', 'C', 'B', 'B', 'D', // 1–10
      'A', 'C', 'D', 'D', 'A', 'B', 'D', 'D', 'C', 'D', // 11–20
      'A', 'A', 'D', 'B', 'B', 'B', 'C', 'A', 'C', 'B', // 21–30
      'A', 'D', 'A', 'C', 'C', 'C', 'richtig', 'richtig', 'falsch', 'falsch', // 31–38.2
    ],
  },
  b1: {
    A: [
      'A', 'B', 'B', 'C', 'B', 'D', 'A', 'B', 'A', 'C', // 1–10
      'B', 'D', 'D', 'B', 'A', 'C', 'richtig', 'falsch', 'richtig', 'D', // 11–18
      'D', 'C', 'D', 'A', 'C', 'B', 'D', 'C', 'A', 'D', // 19–28
      'B', 'C', 'A', 'D', 'B', 'A', 'C', 'richtig', 'falsch', 'richtig', // 29–36.3
    ],
    B: [
      'C', 'A', 'A', 'B', 'D', 'C', 'B', 'D', 'C', 'B', // 1–10
      'A', 'C', 'B', 'A', 'C', 'A', 'richtig', 'falsch', 'richtig', 'A', // 11–18
      'B', 'D', 'C', 'B', 'D', 'D', 'A', 'D', 'D', 'C', // 19–28
      'A', 'B', 'D', 'C', 'A', 'C', 'B', 'richtig', 'falsch', 'richtig', // 29–36.3
    ],
  },
  b1plus: {
    A: [
      'C', 'A', 'D', 'C', 'B', 'A', 'A', 'C', 'D', 'D', // 1–10
      'D', 'C', 'D', 'B', 'A', 'C', 'C', 'A', 'B', 'A', // 11–20
      'B', 'B', 'D', 'B', 'D', 'C', 'A', 'A', 'B', 'B', // 21–30
      'B', 'D', 'C', 'C', 'A', 'D', 'falsch', 'richtig', 'richtig', 'falsch', // 31–38.2
    ],
    B: [
      'C', 'A', 'C', 'A', 'B', 'A', 'B', 'D', 'D', 'D', // 1–10
      'C', 'B', 'D', 'C', 'B', 'C', 'D', 'A', 'C', 'B', // 11–20
      'A', 'A', 'C', 'B', 'C', 'D', 'B', 'D', 'B', 'A', // 21–30
      'D', 'A', 'B', 'C', 'D', 'A', 'richtig', 'falsch', 'falsch', 'richtig', // 31–38.2
    ],
  },
};
