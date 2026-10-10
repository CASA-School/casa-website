import { generateKeyPairSync, sign } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { beginMicrosoftSignIn, microsoftRedirectUri, readIdToken } from '../microsoft';
import { looksLikeEmail, usernameCandidates, usernameKey } from '../sign-in-names';

const TENANT = '578a68cb-a4d8-4b79-90f3-e853dbd7e639';
const CLIENT = '11111111-2222-3333-4444-555555555555';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(claims: Record<string, unknown>, key = privateKey) {
  const head = encode({ alg: 'RS256', kid: 'k1', typ: 'JWT' });
  const body = encode(claims);
  return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`;
}

const NOW = Date.UTC(2026, 9, 10, 12);
const valid = {
  iss: `https://login.microsoftonline.com/${TENANT}/v2.0`,
  aud: CLIENT,
  tid: TENANT,
  oid: 'object-1',
  preferred_username: 'B.Rick@casa-bremen.de',
  name: 'Bettina Rick',
  nonce: 'n-1',
  exp: NOW / 1000 + 600,
  nbf: NOW / 1000 - 60,
};
const expected = { tenantId: TENANT, clientId: CLIENT, nonce: 'n-1' };
const keyFor = async () => publicKey;

describe('Microsoft id tokens', () => {
  it('names the colleague when everything checks out', async () => {
    await expect(readIdToken(token(valid), expected, keyFor, NOW)).resolves.toEqual({
      oid: 'object-1',
      email: 'b.rick@casa-bremen.de',
      name: 'Bettina Rick',
    });
  });

  it.each([
    ['another tenant', { tid: 'someone-else' }],
    ['another issuer', { iss: 'https://login.microsoftonline.com/common/v2.0' }],
    ['another app', { aud: 'not-our-app' }],
    ['a replayed nonce', { nonce: 'n-0' }],
    ['an expired token', { exp: NOW / 1000 - 3600 }],
    ['no account', { oid: undefined }],
  ])('refuses %s', async (_, change) => {
    await expect(readIdToken(token({ ...valid, ...change }), expected, keyFor, NOW)).rejects.toThrow();
  });

  it('refuses a token signed by any other key', async () => {
    await expect(readIdToken(token(valid, other.privateKey), expected, keyFor, NOW)).rejects.toThrow(/signature/);
  });
});

describe('the sign-in round trip', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_MICROSOFT_TENANT_ID', TENANT);
    vi.stubEnv('AUTH_MICROSOFT_CLIENT_ID', CLIENT);
    vi.stubEnv('AUTH_MICROSOFT_CLIENT_SECRET', 'secret');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('goes to CASA’s tenant with PKCE, state and nonce', () => {
    const { url, cookie } = beginMicrosoftSignIn('https://admin.casa-bremen.de/auth/microsoft/callback');
    const target = new URL(url);
    expect(target.origin + target.pathname).toBe(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`);
    expect(target.searchParams.get('code_challenge_method')).toBe('S256');
    expect(target.searchParams.get('client_id')).toBe(CLIENT);
    expect(target.searchParams.get('state')).toBeTruthy();
    expect(target.searchParams.get('nonce')).toBeTruthy();
    expect(cookie).toMatch(/^[\w-]+\.[\w-]+$/);
  });

  it('comes back to the callback on the host it left from', () => {
    expect(microsoftRedirectUri(new Headers({ host: 'admin.casa-bremen.de' }))).toBe('https://admin.casa-bremen.de/auth/microsoft/callback');
    expect(microsoftRedirectUri(new Headers({ host: 'localhost:3027' }))).toBe('http://localhost:3027/admin/auth/microsoft/callback');
  });
});

describe('sign-in names', () => {
  it('folds case, accents and spacing', () => {
    expect(usernameKey('  Natália   Sostres ')).toBe('natalia sostres');
    expect(usernameKey('Meike Große-Hundrup')).toBe('meike grosse-hundrup');
    expect(usernameKey('Claudia Gröne')).toBe(usernameKey('claudia grone'));
  });

  it('reads ae, oe and ue as umlauts too, and keeps the name as typed first', () => {
    expect(usernameCandidates('Testerin Mueller-Groesse')).toEqual(['testerin mueller-groesse', 'testerin muller-grosse']);
    expect(usernameKey('Testerin Müller-Größe')).toBe('testerin muller-grosse');
    expect(usernameCandidates('Samuel Rick')).toEqual(['samuel rick', 'samul rick']);
    expect(usernameCandidates('Bettina Rick')).toEqual(['bettina rick']);
  });

  it('tells an address from a name', () => {
    expect(looksLikeEmail('b.rick@casa-bremen.de')).toBe(true);
    expect(looksLikeEmail('Bettina Rick')).toBe(false);
  });
});
