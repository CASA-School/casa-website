import 'server-only';

import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify, type JsonWebKey } from 'node:crypto';

/**
 * Signing in with Microsoft: CASA's own Entra ID tenant, OpenID Connect with
 * the authorization-code flow and PKCE.
 *
 * Microsoft proves who the colleague is (password, MFA, whatever CASA's tenant
 * requires); the workspace then finds the account linked to that directory
 * object, or the account with that Outlook address, and opens a session. No
 * token from Microsoft is kept: only the id token is read, once, after its
 * signature, issuer, audience, tenant, expiry and nonce are checked against
 * Microsoft's published keys. No library: the checks are below and short.
 *
 * Configured by AUTH_MICROSOFT_TENANT_ID, AUTH_MICROSOFT_CLIENT_ID and
 * AUTH_MICROSOFT_CLIENT_SECRET (infra/azure/entra-workspace-app.sh creates the
 * app registration). Without them the button is not shown.
 */

export const MICROSOFT_COOKIE = 'casa_microsoft_sign_in';
const COOKIE_TTL_SECONDS = 10 * 60;
const JWKS_TTL_MS = 60 * 60 * 1000;

type Config = { tenantId: string; clientId: string; clientSecret: string };

export function microsoftConfig(): Config | null {
  const tenantId = process.env.AUTH_MICROSOFT_TENANT_ID;
  const clientId = process.env.AUTH_MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_CLIENT_SECRET;
  return tenantId && clientId && clientSecret ? { tenantId, clientId, clientSecret } : null;
}

export const microsoftEnabled = () => microsoftConfig() !== null;

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

function secret(): string {
  return (
    process.env.AUTH_MICROSOFT_CLIENT_SECRET ??
    createHash('sha256').update(`casa-workspace-microsoft|${process.env.DATABASE_URL ?? 'local'}`).digest('hex')
  );
}

type Pending = { state: string; nonce: string; verifier: string; exp: number };

/** The short-lived, signed record of one sign-in on its way to Microsoft and back. */
function seal(pending: Pending): string {
  const payload = base64url(JSON.stringify(pending));
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}

function unseal(value: string | undefined): Pending | null {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(createHmac('sha256', secret()).update(payload).digest('base64url'));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const pending = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Pending;
    return pending.exp > Date.now() / 1000 ? pending : null;
  } catch {
    return null;
  }
}

/** Where Microsoft sends the colleague to sign in, and the cookie that remembers the attempt. */
export function beginMicrosoftSignIn(redirectUri: string, loginHint?: string): { url: string; cookie: string } {
  const config = microsoftConfig();
  if (!config) throw new Error('Microsoft sign-in is not configured.');

  const pending: Pending = {
    state: base64url(randomBytes(24)),
    nonce: base64url(randomBytes(24)),
    verifier: base64url(randomBytes(32)),
    exp: Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS,
  };
  const url = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: base64url(createHash('sha256').update(pending.verifier).digest()),
    code_challenge_method: 'S256',
    prompt: 'select_account',
    ...(loginHint ? { login_hint: loginHint } : {}),
  }).toString();

  return { url: url.toString(), cookie: seal(pending) };
}

export const microsoftCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: COOKIE_TTL_SECONDS,
};

export type MicrosoftIdentity = { oid: string; email: string; name: string };

export class MicrosoftSignInError extends Error {}

let jwks: { at: number; keys: (JsonWebKey & { kid?: string })[] } | null = null;

async function signingKey(tenantId: string, kid: string) {
  if (!jwks || Date.now() - jwks.at > JWKS_TTL_MS || !jwks.keys.some((key) => key.kid === kid)) {
    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new MicrosoftSignInError('Microsoft keys could not be loaded.');
    jwks = { at: Date.now(), keys: ((await response.json()) as { keys: (JsonWebKey & { kid?: string })[] }).keys };
  }
  const key = jwks.keys.find((candidate) => candidate.kid === kid);
  if (!key) throw new MicrosoftSignInError('Unknown Microsoft signing key.');
  return createPublicKey({ key, format: 'jwk' });
}

/** Checks an id token from CASA's tenant and returns who it names. Exported for the tests. */
export async function readIdToken(
  idToken: string,
  expected: { tenantId: string; clientId: string; nonce: string },
  keyFor: (kid: string) => Promise<ReturnType<typeof createPublicKey>> = (kid) => signingKey(expected.tenantId, kid),
  now: number = Date.now()
): Promise<MicrosoftIdentity> {
  const [headerPart, payloadPart, signaturePart] = idToken.split('.');
  if (!headerPart || !payloadPart || !signaturePart) throw new MicrosoftSignInError('Malformed id token.');

  const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as { alg?: string; kid?: string };
  if (header.alg !== 'RS256' || !header.kid) throw new MicrosoftSignInError('Unexpected token algorithm.');

  const key = await keyFor(header.kid);
  const valid = verify('RSA-SHA256', Buffer.from(`${headerPart}.${payloadPart}`), key, Buffer.from(signaturePart, 'base64url'));
  if (!valid) throw new MicrosoftSignInError('Invalid token signature.');

  const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as Record<string, unknown>;
  const seconds = now / 1000;
  if (claims.iss !== `https://login.microsoftonline.com/${expected.tenantId}/v2.0`) throw new MicrosoftSignInError('Wrong issuer.');
  if (claims.aud !== expected.clientId) throw new MicrosoftSignInError('Wrong audience.');
  if (claims.tid !== expected.tenantId) throw new MicrosoftSignInError('Wrong tenant.');
  if (typeof claims.exp !== 'number' || claims.exp < seconds - 60) throw new MicrosoftSignInError('Token expired.');
  if (typeof claims.nbf === 'number' && claims.nbf > seconds + 60) throw new MicrosoftSignInError('Token not valid yet.');
  if (claims.nonce !== expected.nonce) throw new MicrosoftSignInError('Nonce mismatch.');

  const email = String(claims.email ?? claims.preferred_username ?? '').toLowerCase();
  if (typeof claims.oid !== 'string' || !email) throw new MicrosoftSignInError('The token names no account.');
  return { oid: claims.oid, email, name: String(claims.name ?? email) };
}

/** Back from Microsoft: checks the attempt, redeems the code and reads who signed in. */
export async function completeMicrosoftSignIn(input: {
  code: string | null;
  state: string | null;
  cookie: string | undefined;
  redirectUri: string;
}): Promise<MicrosoftIdentity> {
  const config = microsoftConfig();
  if (!config) throw new MicrosoftSignInError('Microsoft sign-in is not configured.');
  const pending = unseal(input.cookie);
  if (!pending || !input.state || input.state !== pending.state || !input.code) {
    throw new MicrosoftSignInError('This sign-in has expired. Start again.');
  }

  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: pending.verifier,
      scope: 'openid profile email',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new MicrosoftSignInError('Microsoft did not accept the sign-in.');
  const tokens = (await response.json()) as { id_token?: string };
  if (!tokens.id_token) throw new MicrosoftSignInError('Microsoft returned no id token.');

  return readIdToken(tokens.id_token, { tenantId: config.tenantId, clientId: config.clientId, nonce: pending.nonce });
}

/** The callback address on this host: /auth/microsoft/callback on the admin host, /admin/… elsewhere. */
export function microsoftRedirectUri(headers: Headers): string {
  if (process.env.AUTH_MICROSOFT_REDIRECT_URI) return process.env.AUTH_MICROSOFT_REDIRECT_URI;
  const host = (headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost:3000').split(',')[0].trim();
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) || host.split(':')[0].endsWith('.localhost');
  const proto = (headers.get('x-forwarded-proto') ?? (local ? 'http' : 'https')).split(',')[0].trim();
  const prefix = host.startsWith('admin.') ? '' : '/admin';
  return `${proto}://${host}${prefix}/auth/microsoft/callback`;
}
