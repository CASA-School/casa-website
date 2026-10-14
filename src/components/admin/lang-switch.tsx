'use client';

import { usePathname } from 'next/navigation';

import { WS_LANGS } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

import { useWsLang } from './lang';

/**
 * DE | EN — the workspace's language, for this colleague. A link to the switch
 * (`/admin/lang`), which remembers the choice and comes back to this page. On
 * the admin host the browser's path has no `/admin`, so it is put back.
 */
export function LangSwitch({ tone = 'rail' }: { tone?: 'rail' | 'page' }) {
  const pathname = usePathname() ?? '/admin';
  const { lang, t } = useWsLang();
  const back = pathname.startsWith('/admin') ? pathname : `/admin${pathname === '/' ? '' : pathname}`;

  return (
    <span
      data-rail-hide
      role="group"
      aria-label={t('Sprache', 'Language')}
      className={cn('inline-flex shrink-0 rounded-md p-0.5 text-[0.66rem] font-bold tracking-[0.04em]', tone === 'rail' ? 'bg-white/[0.07]' : 'bg-ws-sunk ring-1 ring-ws-line ring-inset')}
    >
      {WS_LANGS.map((l) => (
        <a
          key={l}
          href={`/admin/lang?to=${l}&back=${encodeURIComponent(back)}`}
          aria-current={l === lang ? 'true' : undefined}
          lang={l}
          title={l === 'de' ? 'Deutsch' : 'English'}
          className={cn(
            'rounded-[4px] px-1.5 py-0.5 transition-colors outline-none focus-visible:ring-2',
            tone === 'rail'
              ? l === lang
                ? 'bg-white/[0.16] text-white'
                : 'text-white/50 hover:text-white focus-visible:ring-white/40'
              : l === lang
                ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(15,23,42,0.12)]'
                : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)] focus-visible:ring-[var(--casa-blue)]/40'
          )}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </span>
  );
}
