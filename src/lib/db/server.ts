import type { PoolClient } from 'pg';

import { getPool, isWorkspaceDatabaseConfigured } from '@/lib/admin/db';

/**
 * Database client for the public site.
 *
 * PORTED OFF `@neondatabase/serverless`, 2026-09-08. That driver talks to
 * Neon's own HTTP/WebSocket endpoint and cannot reach a plain Postgres server,
 * which made it the blocker `docs/AZURE_DEPLOYMENT_PLAN.md` §1 named: the
 * public site could not read the Azure Flexible Server, and — once the staff
 * workspace arrived — could not read the local container either. Local
 * development had a real database that half the application could not see.
 *
 * Both halves now share the one `pg` pool in `src/lib/admin/db.ts`. `pg` speaks
 * the plain wire protocol, so the same code reaches the Docker container, Azure
 * Postgres, and Neon.
 *
 * THE SHAPE OF `query` IS DELIBERATELY NEON'S, NOT `pg`'s.
 *
 * `pg` resolves to a `QueryResult` and the rows are on `.rows`; Neon resolved
 * to the rows themselves. Around forty call sites in
 * `src/lib/content/repository.ts` and `src/lib/placement/repository.server.ts`
 * read the result as an array, all of them through `queryRows`/`queryFirst`
 * helpers that were written against the Neon shape. Unwrapping `.rows` here
 * keeps the port to this file plus the one route handler that used the
 * tagged-template API, instead of touching every reader — and there is nothing
 * in `QueryResult` those readers want.
 */

/**
 * Re-exported so `getDb()`'s callers can ask the same question the same way.
 * `src/lib/db/env.ts` exports an identical predicate — both read
 * `DATABASE_URL`, and neither is worth collapsing into the other while the
 * public site and the workspace still have separate entry points.
 */
export const isDatabaseConfigured = isWorkspaceDatabaseConfigured;

type PublicDatabase = {
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
};

export const getDb = (): PublicDatabase | null => {
  if (!isWorkspaceDatabaseConfigured()) {
    return null;
  }

  return {
    query: async <T>(sql: string, params: unknown[] = []) => {
      const result = await getPool().query(sql, params);
      return result.rows as T[];
    },
  };
};

/**
 * Runs `work` inside a transaction on one pooled connection.
 *
 * Replaces Neon's `db.transaction([...])`, which took an array of prepared
 * tagged-template queries. There is no `pg` equivalent, and the reason the
 * careers upload needed one has not changed: the application row and the CV
 * bytes must land together or not at all, or the queue grows an application
 * whose CV does not exist.
 */
export async function withDatabaseTransaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

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
  // Connection failures carry the reachability signal (ECONNREFUSED, DNS) on
  // `cause` rather than in the top-level message.
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
