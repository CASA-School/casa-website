'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { translator, type T, type WsLang } from '@/lib/admin/i18n';

/**
 * The workspace's language for client components: the shell (and the sign-in
 * page, and the focused editors) put it here once; `useWsLang()` reads it.
 */
const LangContext = createContext<WsLang>('de');

export function WsLangProvider({ lang, children }: { lang: WsLang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useWsLang(): { lang: WsLang; t: T } {
  const lang = useContext(LangContext);
  return useMemo(() => ({ lang, t: translator(lang) }), [lang]);
}

/** A word in both languages where a server component cannot ask: `<Tr de="Öffnen" en="Open" />`. */
export function Tr({ de, en }: { de: string; en: string }) {
  const { lang } = useWsLang();
  return <>{lang === 'en' ? en : de}</>;
}
