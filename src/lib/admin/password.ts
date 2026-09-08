import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

/**
 * `promisify(scrypt)` resolves to the three-argument overload and drops the one
 * that takes options, so the cost parameters below would not type-check through
 * it. Wrapped by hand instead, with the options argument required — passing
 * none would silently use Node's defaults, which is exactly the mistake this
 * module exists to avoid.
 */
const scrypt = (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derived);
    });
  });

/**
 * Staff password hashing.
 *
 * scrypt from `node:crypto`, not bcrypt or argon2. Both of those are native
 * addons that would have to be compiled into the container image for the one
 * thing they do better than scrypt here, and scrypt is memory-hard, in the
 * standard library, and recommended by OWASP for exactly this.
 *
 * The encoded form carries its own parameters:
 *
 *   scrypt$N$r$p$<salt base64>$<hash base64>
 *
 * so the cost can be raised later without a migration: an old hash still
 * verifies against the parameters it was made with, and `needsRehash` says
 * which rows are due. `password_hash` in 0006_admin_workspace.sql is plain text
 * for this reason.
 */

/**
 * N = 2^16, which is ~64 MiB per hash at r=8. Login is rare and interactive, so
 * the ~100 ms this costs is invisible to a person and expensive at scale to an
 * attacker with the table. Raise N, never r, if this needs to get harder.
 */
const PARAMS = { N: 65_536, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * scrypt needs `maxmem` above 128 * N * r or it refuses outright; Node's
 * default is 32 MiB, well under the 64 MiB the parameters above want.
 */
const maxmemFor = (n: number, r: number) => 256 * n * r;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: maxmemFor(PARAMS.N, PARAMS.r),
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

/**
 * Constant-time verification.
 *
 * Returns false rather than throwing on a malformed stored value: a corrupt
 * hash must fail the login, not 500 the sign-in page for everyone.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');

  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let expected: Buffer;
  try {
    expected = Buffer.from(rawHash, 'base64');
  } catch {
    return false;
  }

  if (expected.length === 0) {
    return false;
  }

  try {
    const derived = await scrypt(
      password.normalize('NFKC'),
      Buffer.from(rawSalt, 'base64'),
      expected.length,
      { N, r, p, maxmem: maxmemFor(N, r) }
    );

    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash was made with weaker parameters than current policy. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split('$');

  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return true;
  }

  return Number(parts[1]) < PARAMS.N || Number(parts[2]) < PARAMS.r;
}

/**
 * The one password rule.
 *
 * Length only. Composition rules ("one digit, one symbol") measurably push
 * people towards `Casa2026!` and are not in NIST 800-63B any more; 12
 * characters of anything is the floor that actually helps.
 */
export const MIN_PASSWORD_LENGTH = 12;

export function describePasswordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password.trim().length === 0) {
    return 'Password cannot be only spaces.';
  }

  return null;
}
