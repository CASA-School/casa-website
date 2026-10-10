'use client';

import type { CmsLocale } from '@/lib/cms/locales';
import { cn } from '@/lib/utils';

import styles from './editor.module.css';
import { I } from './parts';

/**
 * The language being edited.
 *
 * A language the site serves switches the preview to that page in that
 * language. One still being prepared keeps the German preview and opens every
 * text on its own tab, so a new language can be written page by page before it
 * is routed. Each row shows how much of this page is written and current.
 */

export function LanguageMenu({
  locales,
  current,
  completion,
  onPick,
  onClose,
}: {
  locales: CmsLocale[];
  current: string;
  completion: Record<string, number | null>;
  onPick: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={onClose} />
      <div
        role="menu"
        aria-label="Language"
        className={cn(
          'absolute left-1/2 top-[calc(100%+8px)] z-40 w-[320px] -translate-x-1/2 overflow-hidden rounded-2xl border border-ws-line bg-white p-2 shadow-[0_28px_64px_-24px_rgba(15,23,42,0.38)]',
          styles.pop
        )}
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
      >
        {locales.map((locale) => {
          const done = completion[locale.code];
          const active = locale.code === current;
          return (
            <button
              key={locale.code}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => onPick(locale.code)}
              className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', active ? 'bg-ws-sunk' : 'hover:bg-ws-sunk')}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[0.7rem] font-bold uppercase text-[var(--casa-muted)] ring-1 ring-ws-line">
                {locale.code}
              </span>
              <span className="min-w-0 flex-1">
                <span dir={locale.dir} className="block text-sm font-semibold text-[var(--casa-ink)]">
                  {locale.label}
                </span>
                <span className="block text-xs text-[var(--casa-text-subtle)]">
                  {locale.source ? 'Source' : locale.routed ? 'On the site' : 'In preparation'}
                </span>
              </span>
              {done !== null && done !== undefined ? (
                <span className="flex w-16 flex-col items-end gap-1">
                  <span className="text-xs font-semibold tabular-nums text-[var(--casa-muted)]">{done}%</span>
                  <span className="h-1 w-full overflow-hidden rounded-full bg-ws-line-soft">
                    <span
                      className={cn('block h-full rounded-full', done === 100 ? 'bg-[#2f9e5e]' : 'bg-[#d4a800]')}
                      style={{ width: `${done}%` }}
                    />
                  </span>
                </span>
              ) : null}
              {active ? <span className="text-[var(--casa-accent-text)]">{I.check}</span> : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
