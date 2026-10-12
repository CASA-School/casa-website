'use client';

import { ArrowRight, Globe } from 'lucide-react';

import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { PREPARED_LOCALES } from '@/config/cms/translation-locales';
import { usePathname } from '@/i18n/navigation';
import { localizeHref } from '@/i18n/pathnames';
import type { ContentLocale } from '@/lib/content/types';

/**
 * „Maschinelle Übersetzung" (Rahman, 2026-10-12): German and English are the
 * site's own languages; Turkish, Arabic, Spanish, Italian, Russian and Ukrainian
 * are machine translations (docs/TRANSLATIONS.md), and a page in one of them
 * says so — a slim strip under the header, in that language, never on a German
 * or English page.
 *
 * Today the six appear only in the website editor's preview; once a language is
 * switched on for visitors, the strip also links to the page's German original.
 * Not in the preview, where the chosen language applies to every address.
 */
export function MachineTranslationNote({ contentLocale }: { contentLocale: ContentLocale }) {
  const { say, language, previewing } = useSiteCopy();
  const pathname = usePathname();
  if (!(PREPARED_LOCALES as readonly string[]).includes(language)) return null;

  const label = say(contentLocale, 'Maschinelle Übersetzung', 'Machine translation');

  return (
    <aside role="note" aria-label={label} className="border-b border-[color:var(--casa-sand)]/70 bg-[var(--casa-warm-panel)] print:hidden">
      <div data-casa-site-frame className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2.5">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--casa-accent-text)] ring-1 ring-[color:var(--casa-sand)]">
          <Globe className="h-3.5 w-3.5" aria-hidden />
          {label}
        </span>
        {/* At least 14rem, so on a phone the sentence wraps under the badge instead of beside it. */}
        <p className="min-w-[14rem] flex-1 text-sm leading-snug text-[var(--casa-muted)]">
          {say(
            contentLocale,
            'Diese Seite wurde automatisch aus dem Deutschen übersetzt. Im Zweifel gilt die deutsche Fassung.',
            'This page was translated automatically from German. If in doubt, the German version applies.'
          )}
        </p>
        {previewing ? null : (
          <a
            href={localizeHref(pathname, 'de')}
            hrefLang="de"
            className="tap-target group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
          >
            {say(contentLocale, 'Zur deutschen Fassung', 'Read the German version')}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180" aria-hidden />
          </a>
        )}
      </div>
    </aside>
  );
}
