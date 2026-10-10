import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { beginMicrosoftSignIn, MICROSOFT_COOKIE, microsoftCookieOptions, microsoftEnabled, microsoftRedirectUri } from '@/lib/admin/microsoft';

/**
 * "Sign in with Microsoft": off to CASA's tenant, with a signed record of the
 * attempt (state, nonce, PKCE verifier) in a ten-minute cookie. Public by
 * nature, like the sign-in page; nothing is opened until the callback has
 * checked what Microsoft sends back (src/lib/admin/microsoft.ts).
 */
export async function GET(request: Request) {
  if (!isWorkspaceDatabaseConfigured() || !microsoftEnabled()) {
    redirect('/admin/sign-in?error=microsoft-off');
  }
  const hint = new URL(request.url).searchParams.get('hint')?.slice(0, 254) || undefined;
  const { url, cookie } = beginMicrosoftSignIn(microsoftRedirectUri(await headers()), hint);
  (await cookies()).set(MICROSOFT_COOKIE, cookie, microsoftCookieOptions);
  redirect(url);
}
