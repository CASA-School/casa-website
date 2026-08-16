import Link from 'next/link';
import Image from 'next/image';

import { Button } from '@/components/ui/button';

import { HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

type HeroDGalleryProps = {
  eyebrow: string;
  title: string;
  description: string;
  photos: [HeroPhoto, HeroPhoto, HeroPhoto];
  ctas: HeroAction[];
  proofItems?: HeroProofItem[];
  themeClassName?: string;
};

export function HeroDGallery({
  eyebrow,
  title,
  description,
  photos,
  ctas,
  themeClassName = 'hero-theme-accommodation',
}: HeroDGalleryProps) {
  return (
    <HeroSurface themeClassName={themeClassName} archetype="D">
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-4xl font-black text-[var(--casa-ink)] sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

      {/* Mobile: 1 featured + 2 thumbnail chips. Desktop: asymmetric 3-col */}
      <div className="mt-8 space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-3">
        {/* Featured image — full width on mobile, 2 cols wide on desktop */}
        <figure className="md:col-span-2 overflow-hidden rounded-3xl bg-white/70 shadow-[var(--shadow-card)]">
          <div className="casa-media-overlay relative h-60 sm:h-72 md:h-80 lg:h-88 xl:h-96">
            <Image
              src={photos[0].src}
              alt={photos[0].alt}
              fill
              sizes="(min-width: 1280px) 62vw, (min-width: 768px) 64vw, 95vw"
              className="object-cover"
              priority
            />
            <div className="casa-tricolor-rule pointer-events-none absolute bottom-3 left-3 h-1 w-16 rounded-full" />
          </div>
        </figure>

        {/* Secondary pair — side-by-side chips on mobile, stacked in right col on desktop */}
        <div className="grid grid-cols-2 gap-3 md:col-span-1 md:grid-cols-1">
          {photos.slice(1).map((photo, index) => (
            <figure
              key={`${photo.src}-${index}`}
              className="overflow-hidden rounded-3xl bg-white/70 shadow-[var(--shadow-card)]"
            >
              <div className="casa-media-overlay relative h-36 sm:h-44 md:h-[calc(50%-6px)] md:min-h-36 lg:min-h-40 xl:min-h-44">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 768px) 30vw, 46vw"
                  className="object-cover"
                />
                <div className="casa-tricolor-rule pointer-events-none absolute bottom-3 left-3 h-1 w-10 rounded-full" />
              </div>
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

          if (index === 1) {
            return (
              <Button
                key={`${cta.href}-${cta.label}`}
                asChild
                variant="outline"
                className="casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]"
                data-casa-track="true"
                data-casa-label={cta.label}
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            );
          }

          return (
            <Link
              key={`${cta.href}-${cta.label}`}
              href={cta.href}
              className="casa-cta-link text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text-hover)] hover:underline"
              data-casa-track="true"
            >
              {cta.label}
            </Link>
          );
        })}
      </div>


    </HeroSurface>
  );
}
