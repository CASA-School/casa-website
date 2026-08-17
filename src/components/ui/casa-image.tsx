import NextImage, { type ImageProps } from 'next/image';

import { photoSlotFor } from '@/config/content/photo-numbers';
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
 * Colour rather than grey: a grey box reads as a broken image, a coloured field
 * reads as a decision not yet made. The palette is CASA's own, mixed toward
 * white so the fields sit calmly on the white page and still register on the
 * ink-deep bands.
 *
 * The colour is derived from `src`, not from call order. That means the same
 * photograph is always the same colour everywhere it appears — a course keeps
 * its identity across the homepage, the course index and its detail page — and
 * two different photographs next to each other reliably differ.
 *
 * ACCESSIBILITY: these are `aria-hidden`. The alt text describes a photograph
 * that is not being shown, and announcing "CASA learners in a classroom" for a
 * blank colour field would be worse than announcing nothing. Alt text is still
 * required by the prop type and still travels with the call site, so it returns
 * intact when the photographs do.
 *
 * NOT used for logos. `proof-band.tsx` and `partner-strip.tsx` render
 * accreditation and partner marks, which are information rather than decoration
 * — replacing those with colour would delete a claim, not defer it.
 *
 * NUMBERS. Each field shows the photograph's number from
 * `src/config/content/photo-numbers.ts`, which is how a replacement is
 * identified: read "24" off the page, name the file `24.jpg`. The number is
 * per PHOTOGRAPH, not per slot, so the same number appears in every place that
 * photograph is used and one delivered file fills all of them.
 *
 * Master switch below turns placeholders off site-wide. Per-photograph, set
 * `ready: true` on its registry entry instead — that slot renders the real
 * photograph while the rest stay numbered, so photographs can arrive one at a
 * time rather than all at once.
 */
const PLACEHOLDERS_ENABLED = true;

const FIELDS = [
  'linear-gradient(135deg, color-mix(in srgb, var(--casa-blue) 34%, #fff) 0%, color-mix(in srgb, var(--casa-blue) 72%, #fff) 100%)',
  'linear-gradient(135deg, color-mix(in srgb, var(--casa-sun) 46%, #fff) 0%, color-mix(in srgb, var(--casa-amber) 74%, #fff) 100%)',
  'linear-gradient(135deg, color-mix(in srgb, var(--casa-coral) 34%, #fff) 0%, color-mix(in srgb, var(--casa-red) 52%, #fff) 100%)',
  'linear-gradient(135deg, color-mix(in srgb, var(--casa-warm-soft) 90%, #fff) 0%, color-mix(in srgb, var(--casa-amber) 56%, #fff) 100%)',
  'linear-gradient(135deg, color-mix(in srgb, var(--casa-blue) 22%, #fff) 0%, color-mix(in srgb, var(--casa-ink-deep) 46%, #fff) 100%)',
  'linear-gradient(135deg, color-mix(in srgb, var(--casa-coral) 24%, #fff) 0%, color-mix(in srgb, var(--casa-sun) 58%, #fff) 100%)',
];

/** Stable, order-independent index so a given photo always gets a given field. */
function fieldFor(src: ImageProps['src']) {
  const key = typeof src === 'string' ? src : JSON.stringify(src);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }

  return FIELDS[hash % FIELDS.length];
}

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
   * announced twice. Numbering it would stack a second, blurred copy of the
   * same number behind the real one. An empty alt is the site's existing signal
   * for "decorative duplicate", so it is the signal used here.
   */
  const showNumber = alt !== '';

  return (
    <div
      aria-hidden
      data-casa-placeholder={slot ? String(slot.n) : 'unnumbered'}
      data-casa-media-src={typeof src === 'string' ? src : undefined}
      className={cn(
        // `fill` callers position against a relative parent, exactly as next/image does.
        fill ? 'absolute inset-0 h-full w-full' : undefined,
        // Lets the number scale with the field rather than the viewport, so it
        // stays readable in a 74px avatar and does not become a billboard in a
        // full-bleed hero. `cqw` below resolves against this.
        showNumber ? 'grid place-items-center overflow-hidden [container-type:inline-size]' : undefined,
        className
      )}
      style={{
        backgroundImage: fieldFor(src),
        ...(fill ? null : { width, height }),
        ...style,
      }}
    >
      {showNumber ? (
        <span
          className={cn(
            'pointer-events-none select-none rounded-[0.25em] bg-[var(--casa-ink-deep)]/85 px-[0.45em] py-[0.12em]',
            'font-bold tabular-nums leading-none text-white',
            // Padding and radius are in `em`, so the whole chip scales with this.
            'text-[clamp(0.625rem,8cqw,2.25rem)]'
          )}
        >
          {slot ? slot.n : '??'}
        </span>
      ) : null}
    </div>
  );
}
