import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { openSession, writeSessionCookie } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured, queryFirst } from '@/lib/admin/db';
import { devLoginAllowedHere } from '@/lib/admin/dev-login';

/**
 * The password-free sign-in for one's own laptop (src/lib/admin/dev-login.ts):
 * on `next dev`, with `ADMIN_DEV_LOGIN` set, asked for by this machine as `localhost`, it opens a
 * session for the first active owner (or the account `ADMIN_DEV_LOGIN` names)
 * and goes to the overview. Anywhere else it does not exist.
 */
export async function GET() {
  const requestHeaders = await headers();
  if (!devLoginAllowedHere(requestHeaders) || !isWorkspaceDatabaseConfigured()) {
    return new Response('Not found', { status: 404 });
  }

  const flag = process.env.ADMIN_DEV_LOGIN ?? '';
  const account = flag.includes('@')
    ? await queryFirst<{ id: string }>(`SELECT id FROM staff_users WHERE is_active AND lower(email) = lower($1)`, [flag])
    : await queryFirst<{ id: string }>(`SELECT id FROM staff_users WHERE is_active AND role = 'owner' ORDER BY created_at LIMIT 1`);
  if (!account) return new Response('No active account for the dev sign-in', { status: 404 });

  await writeSessionCookie(await openSession(account.id, 'dev-login'));
  redirect('/admin');
}
