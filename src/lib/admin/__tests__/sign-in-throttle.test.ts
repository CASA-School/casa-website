import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryFirst: vi.fn(),
  verifyPassword: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock('../db', () => ({ query: mocks.query, queryFirst: mocks.queryFirst }));
vi.mock('../password', () => ({ verifyPassword: mocks.verifyPassword }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));

import {
  getStaffUser,
  signIn,
  SIGN_IN_MAX_CONCURRENT_VERIFICATIONS,
  SIGN_IN_MAX_FAILURES_PER_ADDRESS,
  SIGN_IN_MAX_FAILURES_PER_EMAIL,
  SIGN_IN_WINDOW_MS,
} from '../auth';

const ACCOUNT = {
  id: 'u1',
  email: 'colleague@casa-bremen.de',
  name: 'Colleague',
  role: 'staff',
  password_hash: 'scrypt$…',
  is_active: true,
};

type Failure = { id: string; email: string; client_address: string };

const failures = (count: number, row: (index: number) => Omit<Failure, 'id'>) =>
  Array.from({ length: count }, (_, index) => row(index));

/**
 * `staff_sign_in_failures` and the account lookup, as one store shared by
 * every call. Each statement waits `latency(n)` ms first, as a round trip to
 * Postgres does, so concurrent sign-ins interleave between statements.
 */
function database({
  existing = [] as Omit<Failure, 'id'>[],
  account = ACCOUNT as typeof ACCOUNT | undefined,
  latency = (() => 0) as (statement: number) => number,
} = {}) {
  let nextId = 1;
  let statement = 0;
  const rows: Failure[] = existing.map((row) => ({ id: String(nextId++), ...row }));
  const roundTrip = () =>
    new Promise((resolve) => setTimeout(resolve, latency(statement++)));
  const remove = (match: (row: Failure) => boolean) =>
    rows.splice(0, rows.length, ...rows.filter((row) => !match(row)));

  mocks.queryFirst.mockImplementation(async (sql: string, params: unknown[] = []) => {
    await roundTrip();

    if (sql.startsWith('INSERT INTO staff_sign_in_failures')) {
      const row = { id: String(nextId++), email: String(params[0]), client_address: String(params[1]) };
      rows.push(row);
      return { id: row.id };
    }

    if (sql.includes('FROM staff_sign_in_failures')) {
      return {
        by_email: String(rows.filter((row) => row.email === params[0]).length),
        by_address: String(rows.filter((row) => row.client_address === params[1]).length),
      };
    }

    return account;
  });

  mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    await roundTrip();

    if (sql.startsWith('DELETE FROM staff_sign_in_failures WHERE id')) {
      remove((row) => row.id === params[0]);
    } else if (sql.startsWith('DELETE FROM staff_sign_in_failures WHERE email')) {
      remove((row) => row.email === params[0]);
    }

    return [];
  });

  return rows;
}

const sqlOf = (mock: typeof mocks.query) => mock.mock.calls.map(([sql]) => String(sql));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => vi.clearAllMocks());

describe('staff sign-in throttle', () => {
  it('counts failures over fifteen minutes, per address typed and per client', async () => {
    database();
    mocks.verifyPassword.mockResolvedValue(true);

    await signIn(' Colleague@CASA-Bremen.de ', 'correct', 'vitest', '203.0.113.9');

    const [sql, params] =
      mocks.queryFirst.mock.calls.find(([sql]) => String(sql).includes('count(*)')) ?? [];
    expect(sql).toContain('FROM staff_sign_in_failures');
    expect(params).toEqual(['colleague@casa-bremen.de', '203.0.113.9', SIGN_IN_WINDOW_MS]);
    expect(SIGN_IN_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it('refuses before any password is verified once the address typed is over its limit', async () => {
    const rows = database({
      existing: failures(SIGN_IN_MAX_FAILURES_PER_EMAIL, (i) => ({
        email: ACCOUNT.email,
        client_address: `198.51.100.${i}`,
      })),
    });
    mocks.verifyPassword.mockResolvedValue(true);

    // The right password, and still refused: the limit is checked first.
    await expect(signIn(ACCOUNT.email, 'correct', 'vitest', '203.0.113.9')).resolves.toBeNull();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    // And the refused attempt left nothing behind.
    expect(rows).toHaveLength(SIGN_IN_MAX_FAILURES_PER_EMAIL);
  });

  it('refuses once the client is over its limit, whatever address it types', async () => {
    const rows = database({
      existing: failures(SIGN_IN_MAX_FAILURES_PER_ADDRESS, (i) => ({
        email: `guess-${i}@casa-bremen.de`,
        client_address: '203.0.113.9',
      })),
    });

    await expect(signIn('someone-else@casa-bremen.de', 'x', null, '203.0.113.9')).resolves.toBeNull();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(rows).toHaveLength(SIGN_IN_MAX_FAILURES_PER_ADDRESS);
  });

  it('still lets a colleague in one failure short of either limit', async () => {
    database({
      existing: [
        ...failures(SIGN_IN_MAX_FAILURES_PER_EMAIL - 1, (i) => ({
          email: ACCOUNT.email,
          client_address: `198.51.100.${i}`,
        })),
        ...failures(SIGN_IN_MAX_FAILURES_PER_ADDRESS - 1, (i) => ({
          email: `guess-${i}@casa-bremen.de`,
          client_address: '203.0.113.9',
        })),
      ],
    });
    mocks.verifyPassword.mockResolvedValue(true);

    const result = await signIn(ACCOUNT.email, 'correct', 'vitest', '203.0.113.9');
    expect(result?.user.email).toBe(ACCOUNT.email);
  });

  it('allows exactly the limit of wrong passwords one after another, then refuses', async () => {
    const rows = database();
    mocks.verifyPassword.mockResolvedValue(false);

    for (let i = 0; i < SIGN_IN_MAX_FAILURES_PER_EMAIL + 3; i += 1) {
      await signIn(ACCOUNT.email, `wrong-${i}`, null, `198.51.100.${i}`);
    }

    expect(mocks.verifyPassword).toHaveBeenCalledTimes(SIGN_IN_MAX_FAILURES_PER_EMAIL);
    expect(rows).toHaveLength(SIGN_IN_MAX_FAILURES_PER_EMAIL);
  });

  it.each([
    ['address typed', SIGN_IN_MAX_FAILURES_PER_EMAIL, (i: number) => [ACCOUNT.email, `198.51.100.${i}`]],
    ['client', SIGN_IN_MAX_FAILURES_PER_ADDRESS, (i: number) => [`guess-${i}@casa-bremen.de`, '203.0.113.9']],
  ] as const)(
    'lets no more than the limit per %s reach a password check, however many arrive at once',
    async (_key, limit, attempt) => {
      // Uneven round trips, so the attempts interleave between statements.
      const rows = database({ latency: (n) => (n * 7) % 4 });
      mocks.verifyPassword.mockResolvedValue(false);

      const results = await Promise.all(
        Array.from({ length: limit * 3 }, (_, i) => {
          const [email, address] = attempt(i);
          return signIn(email, `wrong-${i}`, null, address);
        })
      );

      expect(results.every((result) => result === null)).toBe(true);
      expect(mocks.verifyPassword.mock.calls.length).toBeLessThanOrEqual(limit);
      expect(rows.length).toBeLessThanOrEqual(limit);
    }
  );

  it('does not let two attempts arriving together share the last failure left', async () => {
    // Counting first and recording after the password check let both through.
    const rows = database({
      existing: failures(SIGN_IN_MAX_FAILURES_PER_EMAIL - 1, (i) => ({
        email: ACCOUNT.email,
        client_address: `198.51.100.${i}`,
      })),
    });
    mocks.verifyPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(false), 5))
    );

    await Promise.all([
      signIn(ACCOUNT.email, 'wrong-a', null, '203.0.113.1'),
      signIn(ACCOUNT.email, 'wrong-b', null, '203.0.113.2'),
    ]);

    expect(mocks.verifyPassword.mock.calls.length).toBeLessThanOrEqual(1);
    expect(rows.length).toBeLessThanOrEqual(SIGN_IN_MAX_FAILURES_PER_EMAIL);
  });

  it('refuses at once, and records nothing, while this replica runs its password checks', async () => {
    const rows = database();
    const pending: ((matches: boolean) => void)[] = [];
    mocks.verifyPassword.mockImplementation(
      () => new Promise<boolean>((resolve) => pending.push(resolve))
    );

    const attempts = Array.from({ length: SIGN_IN_MAX_CONCURRENT_VERIFICATIONS + 1 }, (_, i) =>
      signIn(`person-${i}@casa-bremen.de`, 'x', null, `203.0.113.${i}`)
    );

    // The last one is refused while the others are still in scrypt.
    await expect(attempts[SIGN_IN_MAX_CONCURRENT_VERIFICATIONS]).resolves.toBeNull();
    expect(mocks.verifyPassword).toHaveBeenCalledTimes(SIGN_IN_MAX_CONCURRENT_VERIFICATIONS);
    expect(rows).toHaveLength(SIGN_IN_MAX_CONCURRENT_VERIFICATIONS);

    pending.forEach((resolve) => resolve(false));
    await Promise.all(attempts);

    // The slots are free again.
    mocks.verifyPassword.mockResolvedValue(false);
    await signIn('later@casa-bremen.de', 'x', null, '203.0.113.99');
    expect(mocks.verifyPassword).toHaveBeenCalledTimes(SIGN_IN_MAX_CONCURRENT_VERIFICATIONS + 1);
  });

  it('records a failure with the address typed and the client, never the password', async () => {
    const rows = database({ account: undefined });
    mocks.verifyPassword.mockResolvedValue(false);

    await signIn('Nobody@casa-bremen.de', 'hunter2-hunter2', 'vitest', '203.0.113.9');

    expect(rows).toEqual([
      { id: expect.any(String), email: 'nobody@casa-bremen.de', client_address: '203.0.113.9' },
    ]);
    expect(JSON.stringify([mocks.query.mock.calls, mocks.queryFirst.mock.calls])).not.toContain(
      'hunter2'
    );
  });

  it('clears the address typed on a successful sign-in', async () => {
    const rows = database({
      existing: failures(3, (i) => ({ email: ACCOUNT.email, client_address: `198.51.100.${i}` })),
    });
    mocks.verifyPassword.mockResolvedValue(true);

    await signIn(ACCOUNT.email, 'correct', 'vitest', '203.0.113.9');

    expect(rows).toEqual([]);
    expect(sqlOf(mocks.query).some((sql) => sql.includes('INSERT INTO staff_sessions'))).toBe(true);
  });

  it('fails closed when the failures cannot be recorded', async () => {
    mocks.queryFirst.mockRejectedValue(new Error('relation "staff_sign_in_failures" does not exist'));
    mocks.verifyPassword.mockResolvedValue(true);

    await expect(signIn(ACCOUNT.email, 'correct', 'vitest', '203.0.113.9')).resolves.toBeNull();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it('fails closed when the failures cannot be counted, and takes its row back', async () => {
    const rows = database();
    const store = mocks.queryFirst.getMockImplementation()!;
    mocks.queryFirst.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('count(*)')) {
        throw new Error('connection terminated');
      }
      return store(sql, params);
    });
    mocks.verifyPassword.mockResolvedValue(true);

    await expect(signIn(ACCOUNT.email, 'correct', 'vitest', '203.0.113.9')).resolves.toBeNull();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });
});

describe('staff sessions', () => {
  it('end twelve hours after sign-in, however often they are used', async () => {
    database({});
    mocks.verifyPassword.mockResolvedValue(true);
    const before = Date.now();

    await signIn(ACCOUNT.email, 'correct', 'vitest', '203.0.113.9');

    const [, params] =
      mocks.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO staff_sessions')) ?? [];
    const expiresAt = (params as unknown[])[2] as Date;
    expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(12 * 60 * 60 * 1000 - 1000);
    expect(expiresAt.getTime() - before).toBeLessThanOrEqual(12 * 60 * 60 * 1000 + 1000);
  });

  it('are not extended by use: a request touches last_used_at and nothing else', async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: 'token' }) });
    mocks.queryFirst.mockResolvedValue({
      session_id: 's1',
      last_used_at: new Date(Date.now() - 60 * 60 * 1000),
      ...ACCOUNT,
      exceptions: null,
    });

    await getStaffUser();

    const [lookup] = mocks.queryFirst.mock.calls[0];
    expect(lookup).toContain('s.expires_at > now()');
    const touch = sqlOf(mocks.query).find((sql) => sql.includes('UPDATE staff_sessions'));
    expect(touch).toBeDefined();
    expect(touch).not.toContain('expires_at');
  });
});
