/*
 * `server-only` first, so a client component that imports this — directly or
 * through a barrel — fails at build time with a message naming this file.
 *
 * Without it, the failure surfaces as `Can't resolve 'util/types'` inside
 * `node_modules/pg/lib/utils.js`, which is thirty lines of import trace away
 * from the actual mistake. That exact error is how the barrel import in
 * `contact-inquiry-form.tsx` was found; the marker means the next one is
 * obvious instead.
 */
import 'server-only';

import { Pool, type PoolClient, type QueryResultRow } from 'pg';

/**
 * The staff workspace's database connection.
 *
 * THE ONE POOL FOR THE WHOLE APPLICATION.
 *
 * `src/lib/db/server.ts` — the public site's client — is built on this pool
 * too. It used to run `@neondatabase/serverless`, which speaks to Neon's own
 * endpoint and so could reach neither the container in `docker-compose.yml` nor
 * the Azure PostgreSQL Flexible Server (docs/AZURE_DEPLOYMENT_PLAN.md §1).
 * `pg` speaks the plain wire protocol and reaches the container, Azure and Neon
 * alike, which is what let the two halves converge.
 *
 * A POOL, NOT A CLIENT PER REQUEST. Next runs route handlers and server
 * components in one long-lived Node process, and a connection opened per render
 * would exhaust a B1ms Flexible Server's ~50 connections under any real
 * traffic. `max` is small for the same reason, and one shared pool rather than
 * two is why the public site and the workspace do not each claim a slice of it.
 */

const POOL_MAX = Number(process.env.ADMIN_DB_POOL_MAX ?? 5);

/**
 * Cached across hot reloads. Without this, every edit in `next dev` leaks a
 * pool and its sockets until Postgres refuses new connections — which reads as
 * "the dashboard broke" twenty edits into a session.
 */
const globalForPool = globalThis as typeof globalThis & {
  casaAdminPool?: Pool;
};

/**
 * Exported because `src/lib/db/server.ts` builds the public site's client on
 * this same pool. One pool per process, shared by both halves of the
 * application — two pools against a B1ms Flexible Server would double the
 * connection footprint for no benefit, since they read the same tables.
 */
export function isWorkspaceDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return typeof url === 'string' && url.trim().length > 0;
}

export function getPool(): Pool {
  const url = process.env.DATABASE_URL;

  if (!url || url.trim().length === 0) {
    throw new WorkspaceDatabaseError('DATABASE_URL is not set.');
  }

  if (globalForPool.casaAdminPool) {
    return globalForPool.casaAdminPool;
  }

  const pool = new Pool({
    connectionString: url,
    max: Number.isFinite(POOL_MAX) && POOL_MAX > 0 ? POOL_MAX : 5,
    // A stuck connect must fail the request, not hang the render.
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 30_000,
    // `sslmode` in the URL is honoured by pg-connection-string, which is how
    // the managed servers are reached. The local container has no TLS and its
    // URL says nothing, which is right for a loopback socket.
  });

  /*
   * A pool emits `error` for a connection that dies while idle. Unhandled, that
   * event takes the whole Node process down — one dropped socket on the managed
   * server would restart the container.
   *
   * Attached HERE, inside the create branch, and that placement is the point.
   * Written after an `??=` it ran on every call instead of once, and Node
   * started warning about a listener leak eleven requests in
   * ("MaxListenersExceededWarning: 11 error listeners added to [BoundPool]").
   * The early return above makes the one-time path structural rather than
   * something the next edit has to remember.
   */
  pool.on('error', (error) => {
    console.error('[workspace-db] idle client error', redact(error));
  });

  globalForPool.casaAdminPool = pool;
  return pool;
}

/** A driver error can quote the connection string, and that carries the password. */
const CONNECTION_STRING_PATTERN = /postgres(?:ql)?:\/\/\S*/gi;

function redact(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(CONNECTION_STRING_PATTERN, 'postgres://[redacted]');
}

export class WorkspaceDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceDatabaseError';
  }
}

export async function query<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[] = []
): Promise<T[]> {
  try {
    const result = await getPool().query<T>(sql, params as unknown[]);
    return result.rows;
  } catch (error) {
    throw new WorkspaceDatabaseError(redact(error));
  }
}

export async function queryFirst<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[] = []
): Promise<T | undefined> {
  const [row] = await query<T>(sql, params);
  return row;
}

/**
 * Runs `work` inside a transaction on one pooled connection.
 *
 * Needed because `query()` above takes an arbitrary connection out of the pool
 * per statement, so a hand-rolled BEGIN / INSERT / COMMIT through it would send
 * the three statements down three different sessions and commit nothing.
 */
export async function withTransaction<T>(
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
    throw error instanceof WorkspaceDatabaseError
      ? error
      : new WorkspaceDatabaseError(redact(error));
  } finally {
    client.release();
  }
}
