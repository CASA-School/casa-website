import Link from 'next/link';
import { MediaFrame } from '@/components/ui/media-frame';

import { Button } from '@/components/ui/button';
import { TextCta } from '@/components/ui/text-cta';

import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';

import { HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

type HeroDGalleryProps = {
  eyebrow: string;
  title: string;
  description: string;
  photos: [HeroPhoto, HeroPhoto, HeroPhoto];
  ctas: HeroAction[];
  proofItems?: HeroProofItem[];
  themeClassName?: string;
  /**
   * Forwarded to HeroSurface, which renders them above the h1 like every other
   * hero. Without this prop, /accommodation/become-host had to place its own
   * breadcrumb band BELOW the hero — so the one page using this hero put its
   * breadcrumbs in a different position from its two sibling pages.
   */
  breadcrumbs?: BreadcrumbItem[];
};

export function HeroDGallery({
  eyebrow,
  title,
  description,
  photos,
  ctas,
  themeClassName = 'hero-theme-accommodation',
  breadcrumbs,
}: HeroDGalleryProps) {
  return (
    <HeroSurface themeClassName={themeClassName} archetype="D" breadcrumbs={breadcrumbs}>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-4xl font-black text-[var(--casa-ink)] sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

      {/* Mobile: 1 featured + 2 thumbnail chips. Desktop: asymmetric 3-col */}
      <div className="mt-8 space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-3">
        {/* Featured image — full width on mobile, 2 cols wide on desktop */}
        {/*
          Halo instead of the grey card shadow — see `.casa-media` in
          globals.css. The little accent tick that sat in the bottom-left
          corner of each tile goes with it: a graphic mark stencilled onto a
          photograph is the same instinct globals.css already retired for the
          prismatic sweep, and on a three-photo mosaic it fired three times.
        */}
        <figure className="md:col-span-2 h-60 sm:h-72 md:h-80 lg:h-88 xl:h-96">
          <MediaFrame
            src={photos[0].src}
            alt={photos[0].alt}
            sizes="(min-width: 1280px) 62vw, (min-width: 768px) 64vw, 95vw"
            className="h-full w-full"
            priority
          />
        </figure>

        {/* Secondary pair — side-by-side chips on mobile, stacked in right col on desktop */}
        <div className="grid grid-cols-2 gap-3 md:col-span-1 md:grid-cols-1">
          {photos.slice(1).map((photo, index) => (
            <figure
              key={`${photo.src}-${index}`}
              className="h-36 sm:h-44 md:h-[calc(50%-6px)] md:min-h-36 lg:min-h-40 xl:min-h-44"
            >
              <MediaFrame
                src={photo.src}
                alt={photo.alt}
                sizes="(min-width: 768px) 30vw, 46vw"
                className="h-full w-full"
              />
            </figure>
          ))}
        </div>
      </div>


      <div className="mt-8 flex flex-wrap items-center gap-3">
        {ctas.slice(0, 3).map((cta, index) => {
          if (index === 0) {
            return (
              <Button
                key={`${cta.href}-${cta.label}`}
                asChild
                className="casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]"
                data-casa-track="true"
                data-casa-label={cta.label}
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            );
          }


          /*
            Every CTA after the first is a text link.
          
            There used to be a middle tier here — index 1 rendered an outline button —
            and since no `ctas` array in public-page-config.ts has more than two
            entries, this text-link branch was unreachable on every public route. So
            every hero on the site shipped exactly two button-weight controls, and the
            restrained third tier the ladder was built for never rendered once.
          */
          return (
            <TextCta
              key={`${cta.href}-${cta.label}`}
              href={cta.href}
              data-casa-track="true"
              data-casa-label={cta.label}
            >
              {cta.label}
            </TextCta>
          );
        })}
      </div>


    </HeroSurface>
  );
}
