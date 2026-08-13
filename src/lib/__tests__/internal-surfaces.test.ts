import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { internalSurfacesEnabled } from '@/lib/internal-surfaces';

/** Every route whose layout must 404 when the guard is off. */
const guardedRoutes = [
  'design-alternatives',
  'design-system',
  'homepage-reorganized',
  'landing-page-alt',
] as const;

function readLayout(route: string) {
  // Vitest runs from the repo root, where vitest.config.ts lives.
  return readFileSync(path.resolve(process.cwd(), 'src/app', route, 'layout.tsx'), 'utf8');
}

/** Start from a clean slate: no flag, no Vercel env, and not production. */
function baseline() {
  vi.stubEnv('CASA_ENABLE_INTERNAL_SURFACES', undefined);
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('NODE_ENV', 'development');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('internalSurfacesEnabled', () => {
  it('closes the internal surfaces on a production build', () => {
    baseline();
    vi.stubEnv('NODE_ENV', 'production');
    expect(internalSurfacesEnabled()).toBe(false);
  });

  it('closes them on a Vercel production deployment even if NODE_ENV disagrees', () => {
    // A production deployment is production regardless of how it was built —
    // either signal alone is enough to close the routes.
    baseline();
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(internalSurfacesEnabled()).toBe(false);
  });

  it('keeps them open on local dev, where neither signal says production', () => {
    baseline();
    expect(internalSurfacesEnabled()).toBe(true);

    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(internalSurfacesEnabled()).toBe(true);
  });

  it('still closes them on a deployed Vercel preview, which the docstring does not expect', () => {
    // KNOWN GAP, pinned deliberately rather than papered over. The module
    // docstring promises "enabled by default on local dev and Vercel previews",
    // but the check requires BOTH signals to be non-production, and a preview is
    // built and served with NODE_ENV=production. So previews 404 as well and
    // need CASA_ENABLE_INTERNAL_SURFACES=true. If that is fixed, this
    // expectation must be flipped on purpose.
    baseline();
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('NODE_ENV', 'production');
    expect(internalSurfacesEnabled()).toBe(false);
  });

  it('accepts exactly four truthy spellings of the override, case- and space-insensitive', () => {
    baseline();
    vi.stubEnv('NODE_ENV', 'production');

    for (const value of ['1', 'true', 'yes', 'on', 'TRUE', 'On', '  yes  ']) {
      vi.stubEnv('CASA_ENABLE_INTERNAL_SURFACES', value);
      expect(internalSurfacesEnabled(), `${JSON.stringify(value)} should open the surfaces`).toBe(
        true
      );
    }
  });

  it('treats any other non-empty override as an explicit off switch', () => {
    baseline();

    // Dev would otherwise open them; a set-but-not-truthy flag wins.
    for (const value of ['0', 'false', 'no', 'off', 'enabled']) {
      vi.stubEnv('CASA_ENABLE_INTERNAL_SURFACES', value);
      expect(internalSurfacesEnabled(), `${JSON.stringify(value)} should close the surfaces`).toBe(
        false
      );
    }
  });

  it('ignores a blank override and falls back to the environment', () => {
    // An unset variable in a .env file arrives as '' — that must not read as
    // "explicitly off" in dev, nor as "explicitly on" in production.
    baseline();
    for (const blank of ['', '   ']) {
      vi.stubEnv('CASA_ENABLE_INTERNAL_SURFACES', blank);
      expect(internalSurfacesEnabled()).toBe(true);

      vi.stubEnv('NODE_ENV', 'production');
      expect(internalSurfacesEnabled()).toBe(false);
      vi.stubEnv('NODE_ENV', 'development');
    }
  });
});

describe('internal surface route layouts', () => {
  it.each(guardedRoutes)('src/app/%s/layout.tsx still calls the guard', (route) => {
    const source = readLayout(route);

    // noindex metadata is not access control, so the 404 is the only thing
    // keeping these routes off a production deployment. Deleting the guard must
    // fail here rather than silently exposing the route.
    expect(source).toContain("from '@/lib/internal-surfaces'");
    expect(source).toMatch(/if\s*\(\s*!\s*internalSurfacesEnabled\(\)\s*\)\s*\{\s*notFound\(\)/);
    expect(source).toContain("from 'next/navigation'");
  });
});
