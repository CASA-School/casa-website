import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLdScript, serializeJsonLd } from '@/components/seo/json-ld';

describe('serializeJsonLd', () => {
  it('cannot close the script element it is written into', () => {
    const data = { name: 'Deutsch</script><script>alert(1)</script>' };
    const markup = renderToStaticMarkup(<JsonLdScript id="course-schema" data={data} />);

    expect(markup.match(/<\/script>/gi)).toHaveLength(1);
    expect(markup).not.toContain('<script>alert');
  });

  it('escapes the line and paragraph separators', () => {
    const serialized = serializeJsonLd({ description: 'a\u2028b\u2029c' });

    expect(serialized).not.toMatch(/[\u2028\u2029]/);
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
  });

  it('parses back to the same data', () => {
    const data = { name: 'A < B </script> & „Kurs“', lines: 'x\u2028y\u2029z', count: 3 };

    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(full);
    }
    return /\.tsx$/.test(full) ? [full] : [];
  });
}

describe('inline JSON-LD', () => {
  it('goes through serializeJsonLd everywhere, never a bare JSON.stringify', () => {
    const offenders = sourceFiles(join(__dirname, '..', '..', '..'))
      .filter((file) => /__html:\s*JSON\.stringify\(/.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(file.indexOf('/src/') + 1));

    expect(offenders).toEqual([]);
  });
});
