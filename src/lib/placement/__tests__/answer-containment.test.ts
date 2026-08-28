import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PLACEMENT_ITEMS } from '@/config/placement/content/items.server';
import { PLACEMENT_STIMULI } from '@/config/placement/content/stimuli.server';
import { findForbiddenFields, sanitiseItem, sanitiseStimulus } from '@/lib/placement/sanitise';

/**
 * The one non-negotiable the placement feature cannot fail quietly: no answer
 * key, accepted-answer list, or listening transcript may reach a browser.
 *
 * Two independent guards, because either alone is defeatable:
 *
 *  1. Structural — run the real sanitiser over the real bank and assert the
 *     output carries no protected field. Catches a future field added upstream
 *     and passed through by a spread.
 *  2. Import-graph — assert no `'use client'` module can transitively reach an
 *     answer-bearing module. Catches someone importing the bank directly and
 *     never touching the sanitiser at all.
 */

const SRC = resolve(__dirname, '../../..');

/** Modules that carry answer keys or protected transcripts. */
const ANSWER_BEARING = [
  'config/placement/content/items.server',
  'config/placement/content/stimuli.server',
  'config/placement/content/production.server',
  'lib/placement/content.server',
  'lib/placement/attempt.server',
  'lib/placement/repository.server',
  'lib/placement/score-item',
  'lib/placement/route',
  'lib/placement/finalise',
];

function walk(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full));
      continue;
    }
    if (/\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

const ALL_SOURCE_FILES = walk(SRC).filter((file) => !file.includes('__tests__'));

/** Resolves an `@/...` or relative import to a repo-relative module path. */
function resolveImport(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) return specifier.slice(2);
  if (!specifier.startsWith('.')) return null;

  const absolute = resolve(fromFile, '..', specifier);
  return absolute.startsWith(SRC) ? absolute.slice(SRC.length + 1) : null;
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specifiers: string[] = [];

  // Static imports and re-exports. Dynamic `import()` is matched too, since a
  // client component could lazily pull the bank in.
  const patterns = [
    /(?:^|\n)\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*export\s[^;]*?from\s+['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const resolved = resolveImport(file, match[1]);
      if (resolved) specifiers.push(resolved.replace(/\.tsx?$/, ''));
    }
  }

  return specifiers;
}

/** Every module path -> its resolved imports. */
const IMPORT_GRAPH = new Map<string, string[]>(
  ALL_SOURCE_FILES.map((file) => [file.slice(SRC.length + 1).replace(/\.tsx?$/, ''), importsOf(file)])
);

const CLIENT_MODULES = ALL_SOURCE_FILES.filter((file) => {
  const source = readFileSync(file, 'utf8');
  // The directive must be the first statement; a mention inside a comment or a
  // string is not a client boundary.
  return /^\s*(?:\/\*[\s\S]*?\*\/\s*)?['"]use client['"]/.test(source);
}).map((file) => file.slice(SRC.length + 1).replace(/\.tsx?$/, ''));

/** Depth-first reachability through the import graph. */
function reaches(from: string, targets: readonly string[]): string[] {
  const seen = new Set<string>();
  const stack = [from];
  const hits: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);

    if (targets.includes(current)) hits.push(current);

    // Directory imports resolve to `index`; try both spellings.
    for (const next of IMPORT_GRAPH.get(current) ?? IMPORT_GRAPH.get(`${current}/index`) ?? []) {
      stack.push(next);
    }
  }

  return hits;
}

describe('answer containment — import graph', () => {
  it('finds client modules to check', () => {
    // A zero-length list would make the next assertion vacuously true.
    expect(CLIENT_MODULES.length).toBeGreaterThan(0);
  });

  it('no client module can reach an answer-bearing module', () => {
    const violations = CLIENT_MODULES.flatMap((module) => {
      const hits = reaches(module, ANSWER_BEARING);
      return hits.map((hit) => `${module} -> ${hit}`);
    });

    expect(violations).toEqual([]);
  });

  it('the generated bank is marked server-only in its own banner', () => {
    const items = readFileSync(
      resolve(SRC, 'config/placement/content/items.server.ts'),
      'utf8'
    );
    expect(items).toContain('SERVER ONLY');
  });
});

describe('answer containment — sanitiser output', () => {
  it('strips every protected field from every item in the bank', () => {
    const leaks: string[] = [];

    for (const item of PLACEMENT_ITEMS) {
      const stimulus = item.stimulusId
        ? (PLACEMENT_STIMULI.find((candidate) => candidate.id === item.stimulusId) ?? null)
        : null;

      const client = sanitiseItem(item, {
        stimulus,
        optionOrder: item.options?.map((option) => option.key) ?? null,
        tokenOrder: item.tokens?.map((token) => token.id) ?? null,
      });

      const found = findForbiddenFields(client, item.id);
      if (found.length > 0) leaks.push(...found);
    }

    expect(leaks).toEqual([]);
  });

  it('never serialises a listening transcript', () => {
    const listening = PLACEMENT_STIMULI.filter((stimulus) => stimulus.kind === 'listening');
    expect(listening.length).toBeGreaterThan(0);

    for (const stimulus of listening) {
      const client = sanitiseStimulus(stimulus);
      const serialised = JSON.stringify(client);

      expect(serialised).not.toContain(stimulus.transcript);
      // A short transcript could in principle appear by coincidence; the field
      // names are the real assertion.
      expect(serialised).not.toContain('transcript');
      expect(serialised).not.toContain('recordingDirection');
    }
  });

  it('never serialises an accepted typed answer', () => {
    const typed = PLACEMENT_ITEMS.filter((item) => item.responseType === 'short_text');
    expect(typed.length).toBeGreaterThan(0);

    for (const item of typed) {
      const client = sanitiseItem(item, { stimulus: null, optionOrder: null, tokenOrder: null });
      const serialised = JSON.stringify(client);

      if (item.answer.type !== 'short_text') throw new Error('unexpected answer type');
      for (const accepted of item.answer.accepted) {
        expect(serialised.toLowerCase()).not.toContain(accepted.toLowerCase());
      }
    }
  });

  it('drops the construct, which names the answer in reviewer shorthand', () => {
    // "accusative after brauchen" tells a learner exactly which option to pick.
    const item = PLACEMENT_ITEMS[0];
    const client = sanitiseItem(item, { stimulus: null, optionOrder: null, tokenOrder: null });
    expect(JSON.stringify(client)).not.toContain(item.construct);
  });

  it('shuffles token order away from the authored correct order', () => {
    // The bank stores order_tokens in the correct sequence, so an unshuffled
    // render would print the answer.
    const item = PLACEMENT_ITEMS.find((candidate) => candidate.responseType === 'order_tokens');
    expect(item).toBeDefined();
    if (!item?.tokens) throw new Error('no order_tokens item in the bank');

    const shuffled = ['t2', 't1', 't4', 't3'].filter((id) =>
      item.tokens?.some((token) => token.id === id)
    );
    const client = sanitiseItem(item, { stimulus: null, optionOrder: null, tokenOrder: shuffled });
    expect(client.tokens?.map((token) => token.id)).toEqual(shuffled);
  });
});
