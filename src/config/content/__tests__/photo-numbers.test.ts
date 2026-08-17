import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { photoSlots, photoSlotFor } from '../photo-numbers';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SRC_ROOT = join(REPO_ROOT, 'src');
const PUBLIC_ROOT = join(REPO_ROOT, 'public');

/**
 * Photographs that are deliberately NOT numbered, with the reason. Anything
 * else found in the source tree must carry a number, so adding a photograph
 * without registering it fails here rather than shipping as a "??" field.
 */
const INTENTIONALLY_UNNUMBERED = new Map([
  [
    '/media/casa/newsflash-editor-lisa-dao.jpg',
    'Real, verified photograph — renders through next/image directly, never the placeholder wrapper.',
  ],
  [
    '/media/casa/newsflash-kicktipp-winners.jpg',
    'Real, verified photograph — renders through next/image directly, never the placeholder wrapper.',
  ],
]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === 'node_modules' ? [] : walk(full);
    }

    return /\.(ts|tsx)$/.test(full) ? [full] : [];
  });
}

function referencedPhotoPaths(): Set<string> {
  const found = new Set<string>();

  for (const file of walk(SRC_ROOT)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\/media\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp|avif)/g)) {
      found.add(match[0]);
    }
  }

  return found;
}

describe('photo number registry', () => {
  it('numbers every photograph the site references', () => {
    const unregistered = [...referencedPhotoPaths()]
      .filter((path) => !photoSlotFor(path) && !INTENTIONALLY_UNNUMBERED.has(path))
      .sort();

    expect(
      unregistered,
      `These photographs are used in src/ but have no number, so they render as "??" fields.\n` +
        `Append them to src/config/content/photo-numbers.ts with the next free number ` +
        `(never renumber existing entries), or add them to INTENTIONALLY_UNNUMBERED with a reason:\n` +
        unregistered.map((path) => `  ${path}`).join('\n')
    ).toEqual([]);
  });

  it('keeps numbers unique and contiguous from 1', () => {
    const numbers = photoSlots.map((slot) => slot.n);

    expect(new Set(numbers).size, 'two entries share a number').toBe(numbers.length);
    expect(numbers, 'numbers must run 1..n in order — append, never resort or renumber').toEqual(
      Array.from({ length: numbers.length }, (_, index) => index + 1)
    );
  });

  it('never points two numbers at the same photograph', () => {
    const paths = photoSlots.map((slot) => slot.src);

    // One photograph, one number — otherwise a single delivered file would have
    // two possible names and the slots would disagree about which it filled.
    expect(new Set(paths).size, 'two numbers point at the same src').toBe(paths.length);
  });

  it('points every number at a file that exists', () => {
    const missing = photoSlots
      .filter((slot) => !existsSync(join(PUBLIC_ROOT, slot.src)))
      .map((slot) => `${slot.n} -> ${slot.src}`);

    expect(missing, `numbered paths with nothing in public/:\n${missing.join('\n')}`).toEqual([]);
  });

  it('describes what each photograph should show', () => {
    // `subject` is the brief for whoever sources the photograph. An empty or
    // placeholder-length one makes the number useless to them.
    const thin = photoSlots.filter((slot) => slot.subject.trim().length < 20).map((slot) => slot.n);

    expect(thin, `numbers with no usable subject brief: ${thin.join(', ')}`).toEqual([]);
  });
});
