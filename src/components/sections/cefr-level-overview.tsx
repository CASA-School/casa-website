import type { CSSProperties } from 'react';

import { levelTokens } from '@/config/brand/tokens';
import { CEFR_BANDS, CEFR_LEVELS, type CefrBand } from '@/config/content/cefr-levels';
import type { ContentLocale } from '@/lib/content/types';
import { pick, say } from '@/lib/cms/copy';
import { cn } from '@/lib/utils';

/**
 * The six levels at a glance, on the levels page: one bar per level, rising
 * from A1 to C1 in the CEFR colour ramp, each a link to its section below,
 * and the CEFR's three bands underneath. The rise is the point — a reader finds
 * where they stand and sees what comes next — so it is drawn, not listed.
 *
 * Bars step up by a fixed amount (`--step`), smaller on a phone, where six
 * columns share 280px; the band names sit under their bars from `lg` and as a
 * short legend below that.
 */

const BAND_ORDER: CefrBand[] = ['basic', 'independent', 'proficient'];
const BAND_SPAN: Record<CefrBand, string> = { basic: 'col-span-2', independent: 'col-span-3', proficient: 'col-span-1' };

export function CefrLevelOverview({ locale, className }: { locale: ContentLocale; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <ol
        className="grid grid-cols-6 items-end gap-1.5 [--base:2.75rem] [--step:1.05rem] sm:gap-4 sm:[--base:3.25rem] sm:[--step:1.5rem] lg:[--base:3.5rem] lg:[--step:1.9rem]"
        aria-label={say(locale, 'Die Niveaustufen von A1 bis C1', 'The levels from A1 to C1')}
      >
        {CEFR_LEVELS.map((level, index) => (
          <li key={level.id} className="min-w-0">
            <a
              href={`#${level.anchor}`}
              className="group flex h-[calc(var(--base)+var(--step)*var(--i))] flex-col justify-end rounded-t-xl rounded-b-md px-1 pb-2.5 text-center transition-[filter,transform] duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5"
              style={{ '--i': index, background: levelTokens[level.id].surface, color: levelTokens[level.id].ink } as CSSProperties}
            >
              <span className="text-sm font-bold leading-none sm:text-lg">{level.label}</span>
            </a>
          </li>
        ))}
      </ol>

      {/* Under the bars from lg: each band beneath its own levels. */}
      <div className="mt-3 hidden grid-cols-6 gap-4 lg:grid">
        {BAND_ORDER.map((band) => (
          <div key={band} className={cn(BAND_SPAN[band], 'border-t-2 border-[color:var(--casa-sand)] pt-2.5 text-center')}>
            <p className="text-sm font-semibold leading-snug text-[var(--casa-ink)]">{pick(locale, CEFR_BANDS[band])}</p>
            <p className="mt-0.5 text-xs text-[var(--casa-muted)]">{CEFR_BANDS[band].levels}</p>
          </div>
        ))}
      </div>

      {/* Below lg "Sprachverwendung" is wider than C1's column: a short legend instead. */}
      <dl className="mx-auto mt-5 w-fit space-y-2 lg:hidden">
        {BAND_ORDER.map((band) => (
          <div key={band} className="flex gap-3 text-sm">
            <dt className="w-16 shrink-0 font-semibold tabular-nums text-[var(--casa-ink)]">{CEFR_BANDS[band].levels}</dt>
            <dd className="min-w-0 text-[var(--casa-muted)]">{pick(locale, CEFR_BANDS[band])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
