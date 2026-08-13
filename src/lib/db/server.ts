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

/**
 * A driver error can quote the connection string back, and that string carries
 * the password. Every string taken off an error goes through this first.
 */
const CONNECTION_STRING_PATTERN = /postgres(?:ql)?:\/\/\S*/gi;

function redactConnectionString(message: string) {
  return message.replace(CONNECTION_STRING_PATTERN, 'postgres://[redacted]');
}

/**
 * Reports a database read that failed and fell back to in-repo fixtures.
 *
 * The fallback itself is intended (see "Runtime modes" in CLAUDE.md), but a
 * *silent* fallback makes an unapplied migration or an unreachable Postgres
 * container look exactly like a healthy site — the caller still renders, just
 * from fixtures. Callers keep their fallback; this only names the cause.
 *
 * Server-only in practice: every caller reaches this from a `getDb()` branch,
 * and `getDb()` returns null without `DATABASE_URL`, which is never exposed to
 * the browser. Fallback mode (`DATABASE_URL` unset) skips the query entirely
 * and so never logs — only a real query failure does.
 */
export function logDatabaseFallback(scope: string, error: unknown) {
  const source = error instanceof Error ? error : null;
  // Neon wraps connection failures, so the reachability signal (ECONNREFUSED,
  // DNS) lives on `cause` rather than in the top-level message.
  const cause = source?.cause;

  console.error('[db] query failed, serving fallback content', {
    scope,
    name: source?.name ?? 'UnknownError',
    message: redactConnectionString(source?.message ?? String(error)),
    ...(cause === undefined || cause === null
      ? {}
      : { cause: redactConnectionString(cause instanceof Error ? cause.message : String(cause)) }),
  });
}
