import { cn } from '@/lib/utils';

/**
 * The workspace's own mark — an app icon, not the school's logo (Rahman,
 * 2026-10-14: "change the logo, don't use the standard logo for this"). CASA's
 * sun rising over its water, drawn for a 30px tile: the motif of the logo
 * people know, in the shape every product's icon takes. It stays when the
 * sidebar folds to icons, where the wide wordmark never could.
 *
 * Drawn here, not cropped from the logo artwork, so CLAUDE.md rule 4 (the brand
 * mark is edited source-faithfully or not at all) is not in play: this is a
 * separate, simple icon in CASA's blue and sun.
 */
export function AppMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[linear-gradient(145deg,#19b2f0_0%,#0388cf_55%,#0567a8_100%)]',
        'shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/10',
        className
      )}
    >
      <svg viewBox="0 0 32 32" className="size-full">
        {/* The sun, half risen. */}
        <path d="M9.4 18.4a6.6 6.6 0 0 1 13.2 0Z" fill="#ffd53d" />
        {/* The water: one bright wave, one fainter under it. */}
        <path d="M6 20.6c1.7-1.3 3.3-1.3 5 0s3.3 1.3 5 0 3.3-1.3 5 0 3.3 1.3 5 0" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M9 24.6c1.4-1 2.8-1 4.2 0s2.8 1 4.2 0 2.8-1 4.2 0" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}
