import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

type HeroHomePhotoProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroAction[];
  photo: HeroPhoto;
  proofItems?: HeroProofItem[];
  themeClassName?: string;
};

/**
 * Editorial photo hero — copy left, photograph bleeding off the right edge.
 *
 * Three things were removed rather than restyled, and the removals are the
 * point:
 *
 *   - The pill chip under the description ("Course advice, telc preparation…")
 *     restated the description in a smaller, harder-to-read box.
 *   - The trust-badge row (Bremen · Community-first · Exam pathways · …) was
 *     four unlinked words that promised navigation and delivered none.
 *   - The second CTA. Two buttons do not offer a choice, they defer one — see
 *     the TextCta doc comment for the rule this site already follows.
 *
 * What is left is one eyebrow, one headline, one sentence, one button.
 */
export function HeroHomePhoto({
  eyebrow,
  title,
  description,
  ctas,
  photo,
  themeClassName = 'hero-theme-plain',
}: HeroHomePhotoProps) {
  const [primaryCta] = ctas;

  return (
    <HeroSurface themeClassName={themeClassName} archetype="A" className="overflow-x-clip">
      <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
        <div className="lg:py-6">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--casa-ink)] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
            {description}
          </p>

          {primaryCta ? (
            <Button
              asChild
              className="casa-button-prism mt-8 bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]"
              data-casa-track="true"
              data-casa-label={primaryCta.label}
            >
              <Link href={primaryCta.href}>{primaryCta.label}</Link>
            </Button>
          ) : null}
        </div>

        {/*
          The photograph stops at the site frame, not the viewport.

          It used to bleed right on a negative margin sized to the frame surplus.
          Inset instead, so its right edge sits on the same gutter the copy's
          left edge sits on and the hero reads as one balanced block. No margin
          class at all now — Container's own padding does the work, which is why
          this cannot drift from the left inset.
        */}
        <div className="relative h-[19rem] sm:h-[24rem] lg:h-[33rem]">
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              /*
                Masked, not cropped. A rounded rectangle on a background is a
                PLACED object; fading the left edge to transparent means there is
                no boundary at all, so the hero's warm grain field reads as
                continuous behind the photograph.

                Two ramps composited: left-to-right for the dissolve, and a
                gentler top/bottom so the photo does not butt into the section's
                own border. `-webkit-` duplicated for Safari.
              */
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 34%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
              maskImage:
                'linear-gradient(to right, transparent 0%, black 34%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
              WebkitMaskComposite: 'source-in',
              maskComposite: 'intersect',
            }}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 56vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          {/*
            A soft focal fall-off on the leading edge. The mask alone fades
            opacity; this also softens detail as the photo dissolves, so the
            transition reads as depth rather than as a fade. Cheap — it blurs
            what is already painted rather than loading a second image — and
            `pointer-events-none` keeps it out of the way.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-[34%] backdrop-blur-[5px]"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, black 10%, transparent 100%)',
              maskImage: 'linear-gradient(to right, black 10%, transparent 100%)',
            }}
          />
        </div>
      </div>
    </HeroSurface>
  );
}
