import { NextResponse, type NextRequest } from 'next/server';

import { getStaffUser } from '@/lib/admin/auth';
import { query } from '@/lib/admin/db';
import { isWsLang, LANG_COOKIE } from '@/lib/admin/i18n';

/**
 * The language switch: `/admin/lang?to=en&back=/admin/enquiries`. Remembers the
 * choice in this browser (a cookie, so the sign-in page knows it too) and, for
 * a signed-in colleague, on their account so it follows them to any computer.
 * Then back to the page it was chosen on — only ever a workspace path.
 *
 * A link, not a form: switching the language changes nothing anyone else sees,
 * so it needs no confirmation and works from the sign-in page.
 */
const BACK = /^\/admin(?:\/[A-Za-z0-9\-_/.]*)?(?:\?[A-Za-z0-9\-_=&%.]*)?$/;

export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to');
  const back = request.nextUrl.searchParams.get('back') ?? '/admin';
  if (!isWsLang(to)) return new NextResponse('Unknown language', { status: 400 });

  const user = await getStaffUser().catch(() => null);
  if (user && user.language !== to) {
    await query(`UPDATE staff_users SET language = $1 WHERE id = $2`, [to, user.id]).catch((error) =>
      console.error('[workspace] language not saved', error)
    );
  }

  const response = new NextResponse(null, { status: 303, headers: { Location: BACK.test(back) ? back : '/admin' } });
  response.cookies.set(LANG_COOKIE, to, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
