/**
 * Creates the first workspace account.
 *
 * There is no bootstrap route and no default password, on purpose. A workspace
 * that ships with `admin / admin` and a "change this later" note in a README is
 * how an admin surface ends up compromised on the day it goes live — and this
 * one will hold enquiries, CVs and placement records for real people.
 *
 * So the first account is created deliberately, from a shell, by someone with
 * the database credentials:
 *
 *   ADMIN_EMAIL=you@casa-bremen.de ADMIN_NAME="Your Name" \
 *   ADMIN_PASSWORD='...' npm run admin:seed
 *
 * With no ADMIN_PASSWORD it generates one and prints it once. That is fine for
 * a laptop and wrong for production, where the password should come from
 * whatever CASA uses to hold secrets.
 *
 * Idempotent: run twice and the second run reports the account already exists
 * rather than resetting its password. Use the Team screen for that.
 *
 * THE WAY BACK IN. When no owner can sign in — a forgotten password, a laptop
 * database nobody wrote down — `npm run admin:password` (`--reset`) sets a new
 * password for the account with ADMIN_EMAIL, generated and printed once unless
 * ADMIN_PASSWORD is given, and closes every session it had. It changes nothing
 * else: not the role, not the name. On Azure: `./infra/azure/db-job.sh password`.
 * Everyone else's password is reset by an owner on the Team screen.
 */
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';

import { connect } from '../db/client.mjs';

/**
 * Kept in step with `src/lib/admin/password.ts` by hand.
 *
 * This script is plain .mjs run by node with no build step, so it cannot import
 * the TypeScript module. The encoded hash carries its own parameters, so a
 * drift here produces a weaker hash, not a broken one — and `needsRehash` in
 * that module is what would catch it.
 */
const PARAMS = { N: 65_536, r: 8, p: 1 };
const KEY_LENGTH = 32;

function scrypt(password, salt, keyLength, options) {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: 256 * PARAMS.N * PARAMS.r,
  });

  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

const reset = process.argv.includes('--reset');
const email = (process.env.ADMIN_EMAIL ?? 'admin@casa-bremen.de').trim().toLowerCase();
const name = (process.env.ADMIN_NAME ?? 'CASA Owner').trim();

// 24 random bytes as base64url: ~32 characters, well past the 8-character
// floor, and safe to paste into a terminal or a password manager.
const generated = !process.env.ADMIN_PASSWORD;
const password = process.env.ADMIN_PASSWORD ?? randomBytes(24).toString('base64url');

// MIN_PASSWORD_LENGTH in src/lib/admin/password.ts.
if (password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const client = await connect();

try {
  const existing = await client.query('SELECT id, role FROM staff_users WHERE lower(email) = $1', [
    email,
  ]);

  if (reset) {
    if (existing.rowCount === 0) {
      console.error(`\nNo account has the address ${email}.\n`);
      process.exit(1);
    }
    const { id, role } = existing.rows[0];
    await client.query('BEGIN');
    await client.query('UPDATE staff_users SET password_hash = $2, password_set_at = now(), updated_at = now() WHERE id = $1', [
      id,
      await hashPassword(password),
    ]);
    await client.query('DELETE FROM staff_sessions WHERE staff_user_id = $1', [id]);
    await client.query('COMMIT');
    console.log(`\nNew password set for ${email} (${role}). Every session it had is closed.\n`);
    if (generated) {
      console.log(`  Password  ${password}`);
      console.log('\nThis is the only time the password is shown. Save it now.\n');
    }
    process.exit(0);
  }

  if (existing.rowCount > 0) {
    console.log(`\n${email} already has an account (${existing.rows[0].role}).`);
    console.log('To change its password: an owner on the Team screen, or `npm run admin:password`.\n');
    process.exit(0);
  }

  // The same folded key as src/lib/admin/sign-in-names.ts: sign in with the full name.
  const username = name.trim().replace(/\s+/g, ' ');
  const usernameKey = username
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[øØ]/g, 'o');

  await client.query(
    `INSERT INTO staff_users (email, name, username, username_key, role, password_hash, password_set_at)
     VALUES ($1, $2, $3, $4, 'owner', $5, now())`,
    [email, name, username, usernameKey, await hashPassword(password)]
  );

  console.log('\nOwner account created.\n');
  console.log(`  Email     ${email}`);
  console.log(`  Name      ${name}`);

  if (generated) {
    console.log(`  Password  ${password}`);
    console.log('\nThis is the only time the password is shown. Save it now.');
  } else {
    console.log('  Password  as provided in ADMIN_PASSWORD');
  }

  console.log('\nSign in at http://localhost:3000/admin\n');
} finally {
  await client.end();
}
