import {defineConfig, devices} from '@playwright/test';

/**
 * Port, overridable with `E2E_PORT`.
 *
 * `reuseExistingServer` below is what makes this necessary. Several agents and
 * checkouts of this repository run on one machine, and a dev server left on
 * 3001 by a different worktree is silently reused — so the suite tests
 * somebody else's code and reports failures against yours. That happened: three
 * specs failed against a stale server that did not contain the feature they
 * were asserting.
 *
 * `E2E_PORT=3011 npm run test:e2e` gives a run its own server.
 */
const PORT = process.env.E2E_PORT ?? '3001';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    },
  },
});
