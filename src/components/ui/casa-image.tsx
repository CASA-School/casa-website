import NextImage, { type ImageProps } from 'next/image';

import type { LucideIcon } from 'lucide-react';

import type { Meaning } from '@/config/brand/meaning';
import { photoMeaningFor, photoSlotFor } from '@/config/content/photo-numbers';
import { iconMap } from '@/config/icon-map';
import { cn } from '@/lib/utils';

/**
 * Site-wide stand-in for photography.
 *
 * Drop-in for `next/image`: every call site keeps its existing props and simply
 * imports this instead, so switching the whole site back to real photographs is
 * a single change to `PLACEHOLDERS_ENABLED` rather than 40 edits across 19
 * files. Nothing about the surrounding layout moves — the element still fills
 * the same box, honours `fill` vs fixed dimensions, and keeps the caller's
 * `className`, so aspect ratios, object-fit wrappers and rounded corners all
 * behave exactly as they did.
 *
 * A missing photograph renders as a calm panel in the colour of what it is
 * about (see STAND_IN below), never as a grey box that reads as a broken image.
 *
 * ACCESSIBILITY: these are `aria-hidden`. The alt text describes a photograph
 * that is not being shown, and announcing "CASA learners in a classroom" for a
 * blank colour field would be worse than announcing nothing. Alt text is still
 * required by the prop type and still travels with the call site, so it returns
 * intact when the photographs do.
 *
 * NOT used for logos. `proof-band.tsx` renders
 * accreditation and partner marks, which are information rather than decoration
 * — replacing those with colour would delete a claim, not defer it.
 *
 * NUMBERS. Each panel carries its photograph's number in `data-casa-placeholder`
 * (from `src/config/content/photo-numbers.ts`); docs/MEDIA_PHOTO_NUMBERS.md lists
 * the numbers by page. The number is per PHOTOGRAPH, not per slot, so one
 * delivered file fills every place that photograph is used.
 *
 * Master switch below turns placeholders off site-wide. Per-photograph, set
 * `ready: true` on its registry entry instead — that slot renders the real
 * photograph while the rest stay numbered, so photographs can arrive one at a
 * time rather than all at once.
 */
const PLACEHOLDERS_ENABLED = true;

/*
 * THE STAND-IN, SINCE 2026-10-01. Until then a missing photograph showed as a
 * colour gradient with its number on it, which made the gaps visible while the
 * photographs were being chosen. Before go-live the site shows only real
 * photographs, so a missing one is now a calm panel in the colour of what the
 * photograph is about, with that meaning's icon in a white circle. The number
 * stays in the markup (`data-casa-placeholder`) and in the registry, which is
 * where a replacement is identified now; docs/MEDIA_PHOTO_NUMBERS.md lists them.
 */
const STAND_IN: Record<Meaning, { tint: string; icon: string; Icon: LucideIcon }> = {
  orientation: { tint: 'bg-[var(--casa-blue-tint)]', icon: 'text-[var(--casa-accent-text)]', Icon: iconMap.mission },
  courses: { tint: 'bg-[var(--casa-red-tint)]', icon: 'text-[var(--casa-red-text)]', Icon: iconMap.courses },
  exams: { tint: 'bg-[var(--casa-ink-tint)]', icon: 'text-[var(--casa-ink)]', Icon: iconMap.exams },
  arrival: { tint: 'bg-[var(--casa-sun-tint)]', icon: 'text-[var(--casa-sun-text)]', Icon: iconMap.accommodation },
};

export function CasaImage({ src, alt, fill, width, height, className, style, ...rest }: ImageProps) {
  const slot = typeof src === 'string' ? photoSlotFor(src) : undefined;

  if (!PLACEHOLDERS_ENABLED || slot?.ready) {
    return (
      <NextImage
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={className}
        style={style}
        {...rest}
      />
    );
  }

  /*
   * The halo copy in `media-frame.tsx` is the same photograph rendered a second
   * time, blurred, behind the frame — it passes `alt=""` to avoid being
   * announced twice. It gets the tint without the icon, so the icon is not
   * stacked twice. An empty alt is the site's signal for "decorative duplicate".
   */
  const showIcon = alt !== '';
  const standIn = STAND_IN[photoMeaningFor(slot?.n)];
  const { Icon } = standIn;

  return (
    <div
      aria-hidden
      data-casa-placeholder={slot ? String(slot.n) : 'unnumbered'}
      data-casa-media-src={typeof src === 'string' ? src : undefined}
      className={cn(
        // `fill` callers position against a relative parent, exactly as next/image does.
        fill ? 'absolute inset-0 h-full w-full' : undefined,
        standIn.tint,
        // The circle scales with the panel, not the viewport (`cqw`), so it
        // stays in proportion in a small card and in a full-width hero.
        showIcon ? 'grid place-items-center overflow-hidden [container-type:inline-size]' : undefined,
        className
      )}
      style={{
        ...(fill ? null : { width, height }),
        ...style,
      }}
    >
      {showIcon ? (
        <span className="pointer-events-none flex aspect-square w-[clamp(2.75rem,16cqw,5.5rem)] items-center justify-center rounded-full bg-white shadow-[var(--shadow-soft)]">
          <Icon className={cn('h-1/2 w-1/2', standIn.icon)} strokeWidth={1.6} />
        </span>
      ) : null}
    </div>
  );
}
