import {defineConfig} from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      /*
       * `server-only` is a build-time marker, and it enforces itself by
       * throwing from its browser entry point. Vitest runs in `jsdom`, so it
       * resolves that entry and every suite that transitively imports
       * `src/lib/admin/db.ts` — the careers route, the placement flow, the
       * assistant runtime — died on import with "This module cannot be
       * imported from a Client Component module".
       *
       * Aliased to an empty module rather than dropped from the source: the
       * marker's job is to fail the NEXT BUILD when a client component reaches
       * a server-only module, and it does that job (it is what turns the
       * otherwise unreadable `Can't resolve 'util/types'` from inside `pg`
       * into an error naming the right file). Vitest is not React Server
       * Components and has no client boundary to protect.
       */
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
