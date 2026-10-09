import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { placementTestEnabled } from '@/lib/placement/availability';

/** Everything that belongs to CASA's own test, and so must close with the switch. */
const GUARDED_PAGES = [
  'src/app/(site)/[locale]/placement-test/test/page.tsx',
  'src/app/(site)/[locale]/placement-test/result/[token]/page.tsx',
];
const GUARDED_HANDLERS = [
  'src/app/api/placement/attempt/route.ts',
  'src/app/api/placement/response/route.ts',
  'src/app/api/placement/resume/route.ts',
  'src/app/api/placement/submit/route.ts',
  'src/app/api/placement/writing/route.ts',
  'src/app/api/placement/writing/prompt/route.ts',
];

const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), 'utf8');

function baseline() {
  vi.stubEnv('CASA_ENABLE_PLACEMENT_TEST', undefined);
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('NODE_ENV', 'development');
}

afterEach(() => vi.unstubAllEnvs());

describe('placementTestEnabled', () => {
  it('is closed on a production build and open in development', () => {
    baseline();
    expect(placementTestEnabled()).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(placementTestEnabled()).toBe(false);
  });

  it('opens or closes on an explicit setting, whatever the build', () => {
    baseline();
    vi.stubEnv('NODE_ENV', 'production');
    for (const on of ['1', 'true', 'YES', ' on ']) {
      vi.stubEnv('CASA_ENABLE_PLACEMENT_TEST', on);
      expect(placementTestEnabled()).toBe(true);
    }
    vi.stubEnv('NODE_ENV', 'development');
    for (const off of ['0', 'false', 'no', 'off']) {
      vi.stubEnv('CASA_ENABLE_PLACEMENT_TEST', off);
      expect(placementTestEnabled()).toBe(false);
    }
  });

});

describe('the guards on CASA\'s own test', () => {
  // The public page has no guard on purpose: it is the Klett page, always open.
  it.each(GUARDED_PAGES)('%s checks the switch per request', (file) => {
    const source = read(file);
    expect(source).toContain("from '@/lib/placement/availability'");
    expect(source).toContain('await connection();');
    expect(source).toMatch(/if \(!placementTestEnabled\(\)\) (await redirectLocalized\('\/placement-test'\)|notFound\(\))/);
  });

  // A route handler is a public endpoint and passes through no page, so each one
  // checks for itself, first, before any parsing or rate limiting.
  it.each(GUARDED_HANDLERS)('%s refuses before doing anything else', (file) => {
    const source = read(file);
    expect(source).toMatch(/export async function POST\([^)]*\)[^{]*\{\n\s*\/\/[^\n]*\n\s*if \(!placementTestEnabled\(\)\) return apiError\('not_found', 'Not found\.', 404\);/);
  });

  it('keeps the public placement page free of any link into our own test', () => {
    const source = read('src/app/(site)/[locale]/placement-test/page.tsx');
    expect(source).not.toContain('/placement-test/test');
    expect(source).toContain('KlettLevelTests');
  });
});
