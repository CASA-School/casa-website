import type { CefrBand } from '@/config/content/newsflash';
import { cn } from '@/lib/utils';

/**
 * The printed NewsFlash tags every item "NIVEAU: A, B, C" so a reader can find
 * what they can actually read. That is the single most useful idea in the
 * newsletter and the one thing a generic blog layout cannot express, so it is
 * the part that had to survive the port.
 *
 * Colours come from CASA's existing CEFR ramp (--level-*) rather than new
 * values. The ramp runs light-to-dark with difficulty, so three bands sitting
 * together read as a scale rather than as three unrelated chips — and a learner
 * who has seen the level colours on /courses meets the same language here.
 *
 * A/B/C are broader than the ramp's A1..C1 steps, so each band borrows the
 * ramp's mid-point for its range: A -> a2, B -> b1plus, C -> c1. The paired
 * `-ink` token carries the tested foreground for each, which is why the text
 * colour is never hardcoded.
 */
const BAND_TOKENS: Record<CefrBand, { bg: string; ink: string }> = {
  A: { bg: 'var(--level-a2)', ink: 'var(--level-a2-ink)' },
  B: { bg: 'var(--level-b1plus)', ink: 'var(--level-b1plus-ink)' },
  C: { bg: 'var(--level-c1)', ink: 'var(--level-c1-ink)' },
};

export function CefrBandBadge({ bands, className }: { bands: CefrBand[]; className?: string }) {
  if (bands.length === 0) {
    return null;
  }

  return (
    <p className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
        Niveau
      </span>
      {bands.map((band) => (
        <span
          key={band}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] font-bold leading-none"
          style={{ backgroundColor: BAND_TOKENS[band].bg, color: BAND_TOKENS[band].ink }}
        >
          {band}
        </span>
      ))}
    </p>
  );
}
