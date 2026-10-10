import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The ticket that opens draft mode for the website editor's preview.
 *
 * The editor page (behind the workspace gate and the `website` module) signs a
 * short-lived token; `/api/cms/preview` checks it before switching draft mode
 * on and showing drafts. The route sits on the public host because that is
 * where the iframe's page is served, and the draft-mode cookie has to belong to
 * it; the token is what keeps that route from being a way in for anyone else.
 *
 * The key is `CMS_PREVIEW_SECRET`, or else derived from `DATABASE_URL`, which
 * every replica already holds and nobody outside does.
 */

const TTL_SECONDS = 10 * 60;

function secret(): string {
  return (
    process.env.CMS_PREVIEW_SECRET ??
    createHash('sha256').update(`casa-website-preview|${process.env.DATABASE_URL ?? 'local'}`).digest('hex')
  );
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function createPreviewToken(staffId: string, now: number = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ sub: staffId, exp: Math.floor(now / 1000) + TTL_SECONDS })).toString(
    'base64url'
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyPreviewToken(token: string | null | undefined, now: number = Date.now()): boolean {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 > now;
  } catch {
    return false;
  }
}

/** Only a path on this site, never another origin, and never the workspace. */
export function safePreviewPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/admin') || path.includes('\\')) {
    return '/';
  }
  return path;
}
