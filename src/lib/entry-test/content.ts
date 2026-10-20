import a2 from './content/a2.json';
import b1 from './content/b1.json';
import b1plus from './content/b1plus.json';
import type { EntryTestId, TestContent } from './types';

/** The booklets' questions, Version A and B (ported from the corrected PDFs, 2026-10-20). Questions only. */
export const CONTENT: Record<EntryTestId, TestContent> = {
  a2: a2 as TestContent,
  b1: b1 as TestContent,
  b1plus: b1plus as TestContent,
};
