/**
 * One-time setup of a new website database server (2026-10-09).
 *
 * Connects as the server admin (ADMIN_DATABASE_URL, to the `postgres` database)
 * and creates what the site runs as: the login role `casa_web` with
 * APP_DB_PASSWORD, the database `casa_website` owned by it, and pgcrypto in that
 * database (allow-listed on the server through `azure.extensions`), and hands it
 * the public schema. The site and
 * the migrations then use casa_web, never the admin. Safe to run twice.
 */
import pg from 'pg';

const adminUrl = process.env.ADMIN_DATABASE_URL;
const appPassword = process.env.APP_DB_PASSWORD;
if (!adminUrl || !appPassword) {
  console.error('ADMIN_DATABASE_URL and APP_DB_PASSWORD are required.');
  process.exit(1);
}

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
const role = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = 'casa_web'");
if (role.rowCount === 0) {
  await admin.query(`CREATE ROLE casa_web LOGIN PASSWORD ${pg.escapeLiteral(appPassword)}`);
  console.log('role casa_web created');
} else {
  console.log('role casa_web exists');
}
const db = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'casa_website'");
if (db.rowCount === 0) {
  await admin.query('CREATE DATABASE casa_website OWNER casa_web');
  console.log('database casa_website created');
} else {
  console.log('database casa_website exists');
}
await admin.end();

const url = new URL(adminUrl);
url.pathname = '/casa_website';
const inDb = new pg.Client({ connectionString: url.toString() });
await inDb.connect();
await inDb.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
console.log('pgcrypto ready');
// On Azure's Postgres 17 a new database's public schema is not the owner's, so
// casa_web could not create a table in its own database until this.
await inDb.query('ALTER SCHEMA public OWNER TO casa_web');
console.log('schema public owned by casa_web');
await inDb.end();
