import { describe, expect, it } from 'vitest';

import { CONTENT } from '@/lib/entry-test/content';
import { KEYS } from '@/lib/entry-test/keys.server';
import { ENTRY_TEST_IDS, cleanAnswers, entryTestFor, scoreAnswers, slotKinds, slotLabels } from '@/lib/entry-test/tests';
import type { Answer } from '@/lib/entry-test/types';
import { buildXlsx, crc32 } from '@/lib/xlsx';

/**
 * The day-one test (0075): which class writes which test, and that each booklet's questions and its key
 * agree — one answer slot per multiple-choice task and per reading statement, 40 in all, marked at two
 * points each — so a learner who answers like the key scores 80.
 */
describe('entry test', () => {
  it('gives the A2, B1 and B1+ classes their test on the first part of the level only', () => {
    expect(entryTestFor('A2.1')).toBe('a2');
    expect(entryTestFor('B1.1')).toBe('b1');
    expect(entryTestFor('B1+.1')).toBe('b1plus');
    expect(entryTestFor('B1+')).toBe('b1plus');
    expect(entryTestFor('A2.2')).toBeNull();
    expect(entryTestFor('A1.1')).toBeNull();
    expect(entryTestFor('B2.1')).toBeNull();
    expect(entryTestFor(null)).toBeNull();
  });

  for (const test of ENTRY_TEST_IDS) {
    for (const version of ['A', 'B'] as const) {
      it(`${test} ${version}: questions and key agree, the key scores 80`, () => {
        const kinds = slotKinds(CONTENT[test][version]);
        const key = KEYS[test][version];
        expect(kinds).toHaveLength(40);
        expect(key).toHaveLength(kinds.length);
        kinds.forEach((kind, i) => expect(kind === 'mc' ? ['A', 'B', 'C', 'D'] : ['richtig', 'falsch'], `${test} ${version} slot ${i + 1}`).toContain(key[i]));
        for (const task of CONTENT[test][version]) {
          if (task.type === 'mc') expect(Object.values(task.options).every((o) => o.trim().length > 0), `${test} ${version} task ${task.n}`).toBe(true);
        }
        const perfect = scoreAnswers(key as Answer[], key);
        expect(perfect).toMatchObject({ total: 80, max: 80, blank: 0 });
        expect(perfect.grammarMax + perfect.readingMax).toBe(80);
      });
    }
    it(`${test}: Version A and B have the same structure`, () => {
      expect(slotKinds(CONTENT[test].A)).toEqual(slotKinds(CONTENT[test].B));
    });
  }

  it('names the answers as the booklet does', () => {
    const labels = slotLabels(CONTENT.b1.A);
    expect(labels).toHaveLength(40);
    expect(labels.slice(15, 20)).toEqual(['16', '17.1', '17.2', '17.3', '18']);
    expect(labels.at(-1)).toBe('36.3');
  });

  it('marks right, wrong and blank, with no minus points', () => {
    const key = ['A', 'B', 'richtig', 'falsch'];
    const result = scoreAnswers(['A', 'C', '', 'falsch'], key);
    expect(result.marks).toEqual(['right', 'wrong', 'blank', 'right']);
    expect(result).toMatchObject({ total: 4, max: 8, grammar: 2, grammarMax: 4, reading: 2, readingMax: 4, blank: 1 });
  });

  it('keeps only answers that fit their slot', () => {
    expect(cleanAnswers(['A', 'richtig', 'x', 'falsch'], ['mc', 'mc', 'rf', 'rf'])).toEqual(['A', '', '', 'falsch']);
    expect(cleanAnswers(['A'], ['mc', 'mc'])).toBeNull();
    expect(cleanAnswers('A', ['mc'])).toBeNull();
  });

  it('ships no answer with the questions', () => {
    const json = JSON.stringify(CONTENT);
    expect(json).not.toMatch(/"(answer|answers|key|solution|correct|richtig|falsch)"\s*:/i);
  });
});

describe('xlsx', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes a zip with the workbook parts', () => {
    const bytes = buildXlsx([{ name: 'Auswertung', rows: [['Name', 'Punkte'], ['Ada <&>', 58], [{ value: 'B', fill: 'wrong' }, null]] }]);
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    for (const part of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) expect(text).toContain(part);
    expect(text).toContain('Ada &lt;&amp;&gt;');
    expect(text).toContain('<v>58</v>');
    // The end-of-central-directory record closes the file.
    expect([...bytes.slice(-22, -18)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });
});
