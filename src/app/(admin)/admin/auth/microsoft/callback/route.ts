import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { accountForMicrosoft, openSession, pruneExpiredSessions, writeSessionCookie } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { completeMicrosoftSignIn, MICROSOFT_COOKIE, MicrosoftSignInError, microsoftRedirectUri } from '@/lib/admin/microsoft';

/**
 * Back from Microsoft. The attempt is checked against its cookie, the code
 * redeemed, the id token verified (src/lib/admin/microsoft.ts); then the
 * account linked to that directory object — or, the first time, the account
 * with that Outlook address, which links it — gets a session. Anyone else is
 * told plainly that no workspace account belongs to their Microsoft account:
 * they have already proved who they are, so this reveals nothing.
 */
export async function GET(request: Request) {
  if (!isWorkspaceDatabaseConfigured()) redirect('/admin/sign-in?error=microsoft');

  const url = new URL(request.url);
  const store = await cookies();
  const pending = store.get(MICROSOFT_COOKIE)?.value;
  store.delete(MICROSOFT_COOKIE);

  if (url.searchParams.get('error')) redirect('/admin/sign-in?error=microsoft-cancelled');

  const requestHeaders = await headers();
  let account: { id: string } | null = null;
  try {
    const identity = await completeMicrosoftSignIn({
      code: url.searchParams.get('code'),
      state: url.searchParams.get('state'),
      cookie: pending,
      redirectUri: microsoftRedirectUri(requestHeaders),
    });
    account = await accountForMicrosoft(identity.oid, identity.email);
  } catch (error) {
    if (!(error instanceof MicrosoftSignInError)) console.error('[workspace-auth] Microsoft sign-in failed', error);
    redirect('/admin/sign-in?error=microsoft');
  }

  if (!account) redirect('/admin/sign-in?error=microsoft-unknown');

  await writeSessionCookie(await openSession(account.id, requestHeaders.get('user-agent')));
  await pruneExpiredSessions();
  redirect('/admin');
}
