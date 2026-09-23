import { describe, expect, it } from 'vitest';

import { isNonLocalizedPath } from '@/i18n/pathnames';

import { GET } from './route';

describe('health endpoint', () => {
  it('answers in the API envelope, uncached', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ data: { status: 'ok' }, error: null });
  });

  it('is not given a language by the proxy', () => {
    // A probe that got a 308 to /de/... would count every replica as down.
    expect(isNonLocalizedPath('/api/health')).toBe(true);
  });
});
