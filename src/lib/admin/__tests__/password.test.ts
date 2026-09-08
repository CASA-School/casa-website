import { describe, expect, it } from 'vitest';

import {
  describePasswordProblem,
  hashPassword,
  MIN_PASSWORD_LENGTH,
  needsRehash,
  verifyPassword,
} from '../password';

describe('staff password hashing', () => {
  it('verifies a password against its own hash', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery stapl', hash)).resolves.toBe(false);
  });

  it('salts, so the same password hashes differently every time', async () => {
    const [a, b] = await Promise.all([hashPassword('same input'), hashPassword('same input')]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same input', a)).resolves.toBe(true);
    await expect(verifyPassword('same input', b)).resolves.toBe(true);
  });

  it('carries its parameters in the encoded form', async () => {
    const hash = await hashPassword('parameters please');
    // scrypt$N$r$p$salt$hash — the whole point of the format is that the cost
    // can be raised later without invalidating an existing hash.
    expect(hash.split('$')).toHaveLength(6);
    expect(hash.startsWith('scrypt$65536$8$1$')).toBe(true);
  });

  it('normalises unicode, so the same typed password verifies either way', async () => {
    // "Müller" composed vs decomposed. A macOS keyboard and a Linux one can
    // produce different bytes for the same visible password, and a staff member
    // locked out by their own umlaut has no way to work out why.
    const composed = 'Müller-Passwort';
    const decomposed = 'Müller-Passwort';
    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });

  it.each([
    ['not a hash at all', false],
    ['', false],
    ['scrypt$65536$8$1$onlyfiveparts', false],
    ['bcrypt$65536$8$1$c2FsdA==$aGFzaA==', false],
    ['scrypt$notanumber$8$1$c2FsdA==$aGFzaA==', false],
  ])('fails closed on a malformed stored value: %s', async (stored) => {
    // A corrupt row must fail that one login, not throw and 500 the sign-in
    // page for everybody.
    await expect(verifyPassword('anything', stored)).resolves.toBe(false);
  });

  it('flags a hash made with weaker parameters for rehashing', async () => {
    expect(needsRehash('scrypt$16384$8$1$c2FsdA==$aGFzaA==')).toBe(true);
    expect(needsRehash(await hashPassword('current policy'))).toBe(false);
    expect(needsRehash('garbage')).toBe(true);
  });
});

describe('password policy', () => {
  it('asks only for length', () => {
    expect(describePasswordProblem('x'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    // No composition rule: a long passphrase of only lowercase letters passes,
    // deliberately (NIST 800-63B).
    expect(describePasswordProblem('all lowercase and quite long')).toBeNull();
  });

  it('rejects anything shorter than the floor', () => {
    expect(describePasswordProblem('x'.repeat(MIN_PASSWORD_LENGTH - 1))).toContain(
      String(MIN_PASSWORD_LENGTH)
    );
  });

  it('rejects a password made only of spaces', () => {
    expect(describePasswordProblem(' '.repeat(MIN_PASSWORD_LENGTH + 4))).not.toBeNull();
  });
});
