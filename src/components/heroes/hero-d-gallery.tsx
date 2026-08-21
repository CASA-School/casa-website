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
  /**
   * One photograph is rendered. The prop was a fixed 3-tuple for the old mosaic;
   * it is a plain array now so a call site passes the single image it means.
   */
  photos: HeroPhoto[];
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
  /*
   * ONE PHOTOGRAPH, AND A TWO-COLUMN COMPOSITION.
   *
   * This hero used to render a three-image mosaic: one featured tile two columns
   * wide plus two stacked thumbnails. Three arbitrary crops of the same subject
   * say less than one photograph does, and while the media library is still
   * numbered placeholders they read as three empty rectangles with numbers in
   * them. Every other hero on the site — home, courses, course detail, exams,
   * accommodation detail — is copy on one side and a single image on the other,
   * so this was the only page type composing itself differently, and it was the
   * one composing itself worst.
   *
   * `photos` stays an array rather than a single `photo` prop so the archetype
   * registry and the e2e assertion are untouched (/accommodation is pinned to
   * archetype D). Only the first photograph is rendered, and both call sites now
   * pass one instead of three.
   */
  const [lead] = photos;

  return (
    <HeroSurface themeClassName={themeClassName} archetype="D" breadcrumbs={breadcrumbs}>
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h1 className="mt-3 text-balance text-4xl font-black leading-tight text-[var(--casa-ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-measure text-pretty text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {ctas.slice(0, 3).map((cta, index) =>
              index === 0 ? (
                <Button
                  key={`${cta.href}-${cta.label}`}
                  asChild
                  className="casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]"
                  data-casa-track="true"
                  data-casa-label={cta.label}
                >
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ) : (
                /* Every CTA after the first is a text link — one solid control per band. */
                <TextCta key={`${cta.href}-${cta.label}`} href={cta.href}>
                  {cta.label}
                </TextCta>
              )
            )}
          </div>
        </div>

        {lead ? (
          <figure className="h-64 sm:h-80 lg:h-[26rem]">
            <MediaFrame
              src={lead.src}
              alt={lead.alt}
              sizes="(min-width: 1024px) 46vw, 95vw"
              className="h-full w-full"
              priority
            />
            {lead.caption ? (
              <figcaption className="mt-3 text-xs leading-relaxed text-[var(--casa-muted)]">
                {lead.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
    </HeroSurface>
  );

}
