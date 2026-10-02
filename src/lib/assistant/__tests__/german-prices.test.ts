import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * German answers write prices the German way: "520 €", "117,50 €" (Rahman,
 * 2026-10-02). The knowledge passages are authored as literals, so this reads
 * the source and checks every `locale: 'de'` passage.
 */
describe('assistant German prices', () => {
  const source = readFileSync(join(__dirname, '..', 'tools', 'search-public-kb.ts'), 'utf8');
  const germanPassages = [...source.matchAll(/locale: 'de',([\s\S]*?)\n {4}\}/g)].map((match) => match[1]);

  it('finds the German passages', () => {
    expect(germanPassages.length).toBeGreaterThan(5);
  });

  it('never writes EUR, a leading €, or a decimal point in a German amount', () => {
    const wrong = germanPassages.flatMap((passage) =>
      [...passage.matchAll(/EUR|€\s?\d|\d\.\d{2}\s?€/g)].map((match) => passage.slice(Math.max(0, match.index - 30), match.index + 10))
    );
    expect(wrong).toEqual([]);
  });

  it('tells the model to answer in German format', () => {
    const prompt = readFileSync(join(__dirname, '..', 'prompt.ts'), 'utf8');
    expect(prompt).toContain('"117,50 €"');
  });
});
