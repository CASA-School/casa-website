import { neon } from '@neondatabase/serverless';

import { getDatabaseUrl, isDatabaseConfigured } from './env';

/**
 * Database client.
 *
 * NOTE FOR THE AZURE MIGRATION (docs/AZURE_DEPLOYMENT_PLAN.md).
 *
 * `@neondatabase/serverless` talks to Neon's own endpoint and will not work
 * against Azure Database for PostgreSQL. Swapping it is not quite a one-file
 * change, because the client is used in two different styles:
 *
 * 1. `src/lib/content/repository.ts` — goes through `queryRows`/`queryFirst`,
 *    which use only `db.query(sql, params)`. Fully portable; a `pg.Pool`
 *    wrapper satisfies it as-is.
 *
 * 2. `src/app/api/careers/apply/route.ts` — uses Neon-specific API directly:
 *    the tagged-template form (`` db`INSERT ...` ``) and `db.transaction([...])`
 *    for the two-statement application + CV insert. This has no `pg` equivalent
 *    and must be rewritten as an explicit
 *    `BEGIN` / `INSERT` / `INSERT` / `COMMIT` on a pooled client.
 *
 * So the Azure port is: this file, plus that one route handler. Everything else
 * is already driver-agnostic. Do not "simplify" this to a `{ query }` wrapper
 * without rewriting the careers route first — that breaks CV upload, which is
 * the only write path on the public site.
 */
let database: ReturnType<typeof neon> | null = null;

export const getDb = () => {
  if (!isDatabaseConfigured()) {
    return null;
  }

  database ??= neon(getDatabaseUrl());
  return database;
};
