import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { getStaffUser } from './auth';
import { isWsLang, LANG_COOKIE, translator, type T, type WsLang } from './i18n';

/**
 * The language of this request: the choice made in this browser (the cookie
 * the switch sets), else the signed-in colleague's own (staff_users.language),
 * else German. Read once per request.
 */
export const getWsLang = cache(async (): Promise<WsLang> => {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (isWsLang(chosen)) return chosen;
  const user = await getStaffUser().catch(() => null);
  return user?.language ?? 'de';
});

/** `t('Deutsch', 'English')` and the language, for a server component or action. */
export async function getI18n(): Promise<{ lang: WsLang; t: T }> {
  const lang = await getWsLang();
  return { lang, t: translator(lang) };
}
