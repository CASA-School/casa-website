import { CasaImage as Image } from '@/components/ui/casa-image';

import { cn } from '@/lib/utils';

type MediaFrameProps = {
  src: string;
  alt: string;
  /** Passed straight to next/image. Defaults to a sensible content-column value. */
  sizes?: string;
  priority?: boolean;
  /** Applied to the outer positioning element, e.g. `h-72 md:h-96`. */
  className?: string;
  /** Applied to the clipped frame — use for a per-surface radius override. */
  frameClassName?: string;
  /**
   * Adds the shared legibility scrim. Opt-in, not default: it exists so text
   * set ON the photograph stays readable, and most surfaces set their text
   * beside the photograph rather than on it.
   */
  scrim?: boolean;
  children?: React.ReactNode;
};

/**
 * A photograph and the light it casts.
 *
 * Renders the image twice: once sharp inside a clipped frame, and once behind
 * it blurred and over-scaled, so the surrounding page picks up the colours of
 * the photograph itself instead of a neutral grey drop shadow. The mechanics
 * and the reasoning live in the `.casa-media` block in globals.css.
 *
 * The halo copy is `aria-hidden` and requested at 64px — it is blurred well
 * past the point where more pixels are visible, so a full-size second fetch
 * would be waste. It is also `alt=""`, which matters: without it every
 * photograph on the site would be announced twice.
 */
export function MediaFrame({
  src,
  alt,
  sizes = '(min-width: 1280px) 38vw, (min-width: 1024px) 46vw, 96vw',
  priority = false,
  className,
  frameClassName,
  scrim = false,
  children,
}: MediaFrameProps) {
  return (
    <div className={cn('casa-media', className)}>
      <div className="casa-media__halo" aria-hidden="true">
        <Image src={src} alt="" fill sizes="64px" quality={30} loading="lazy" />
      </div>

      <div className={cn('casa-media__frame h-full w-full', scrim && 'casa-media-overlay', frameClassName)}>
        <Image
          src={src}
          alt={alt}
          fill
          preload={priority}
          fetchPriority={priority ? 'high' : undefined}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          className="object-cover"
        />
        {children}
      </div>
    </div>
  );
}
