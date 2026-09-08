/**
 * One Postgres connection for every CLI script in this directory.
 *
 * Uses `pg` rather than `@neondatabase/serverless`. The Neon driver speaks to
 * Neon's own WebSocket endpoint, so it cannot reach the local container in
 * `docker-compose.yml` or the Azure Flexible Server that replaces it — the two
 * databases the staff workspace actually runs against. `pg` speaks the plain
 * wire protocol and reaches all three, Neon included, so the scripts need one
 * driver rather than a branch on the hostname.
 *
 * TLS comes from the connection string. `sslmode=require` in the URL is honoured
 * by pg-connection-string, which is how the managed servers are reached; the
 * local container has no TLS and its URL says nothing, which is correct for a
 * loopback socket.
 *
 * See the note in `src/lib/db/server.ts`: the public site's request path still
 * runs on the Neon driver. That port is tracked separately in
 * docs/AZURE_DEPLOYMENT_PLAN.md and is not what these scripts wait on.
 */
import pg from 'pg';

export function requireConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.trim().length === 0) {
    console.error('DATABASE_URL is required.');
    console.error('Local: npm run db:up, then export the URL printed by docs/DEV_SETUP.md.');
    process.exit(1);
  }

  return connectionString;
}

/** A connected client. The caller owns `end()`. */
export async function connect() {
  const client = new pg.Client({ connectionString: requireConnectionString() });
  await client.connect();
  return client;
}
