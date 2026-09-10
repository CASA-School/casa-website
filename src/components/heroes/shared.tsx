import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

import { CasaImage as Image } from '@/components/ui/casa-image';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { MediaFrame } from '@/components/ui/media-frame';
import { TextCta } from '@/components/ui/text-cta';
import { cn } from '@/lib/utils';

export type HeroAction = {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
};

export type HeroPhoto = {
  src: string;
  alt: string;
  caption?: string;
};

export type HeroQuickLink = {
  label: string;
  href: string;
};

export type HeroProofItem = {
  value: string;
  label: string;
};

/**
 * A decision fact for the hero rail — a label, a figure, and a short qualifier.
 *
 * `hint` is not decoration. On /accommodation the deposit and the weekly rate
 * are both EUR 580 and EUR 145 figures that mean nothing on their own: without
 * "refundable" the deposit reads as a second charge, and without "host family or
 * shared flat" the base rate reads as if one option were cheaper. Keep it to a
 * few words; the conditions belong in the page body.
 */
export type HeroFact = {
  label: string;
  value: string;
  hint?: string;
};

type HeroSurfaceProps = {
  children: ReactNode;
  className?: string;
  themeClassName?: string;
  breadcrumbs?: BreadcrumbItem[];
  archetype?: string;
};

export function HeroSurface({ children, className, themeClassName, breadcrumbs, archetype }: HeroSurfaceProps) {
  /*
   * D shares A's floor, not B's.
   *
   * D used to be a three-image mosaic and then a framed photo card, and it was
   * grouped with B on 48/54vh accordingly. It is now A's composition exactly —
   * the same HeroLede beside the same HeroBleedPhoto — so leaving it a step
   * shorter meant the one dimension HeroSurface still controls was the one
   * dimension where the accommodation hero and the homepage hero disagreed.
   */
  const heightClass =
    archetype === 'A' || archetype === 'D'
      ? 'min-h-[52vh] md:min-h-[58vh]'
      : archetype === 'B'
        ? 'min-h-[48vh] md:min-h-[54vh]'
        : archetype === 'C' || archetype === 'E'
          ? 'min-h-[40vh] md:min-h-[46vh]'
          : 'min-h-[46vh] md:min-h-[52vh]';

  return (
    <section
      className={cn(
        'hero-grain border-b border-[color:var(--casa-sand)] py-10 md:py-12 lg:py-14',
        heightClass,
        themeClassName,
        className
      )}
      data-hero-archetype={archetype}
    >
      <Container className="hero-grain-content">
        {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} className="mb-5" /> : null}
        {children}
      </Container>
    </section>
  );
}

export function HeroPhotoCard({
  photo,
  className,
  priority = false,
}: {
  photo: HeroPhoto;
  className?: string;
  priority?: boolean;
}) {
  return (
    /*
      The hero photograph, and the largest surface the halo runs on.
      Previously `rounded-3xl` + `shadow-[var(--shadow-card)]` + a warm tint
      behind it + the shared ink scrim — a floating grey-shadowed card, which
      is what made the hero read as a stock template. The figure now carries
      no frame of its own: the radius belongs to `.casa-media__frame` and the
      elevation comes from the photograph's own colours.

      No scrim here. Nothing is set on top of this image — the eyebrow,
      headline, lead and CTAs all sit in the column beside it — so a scrim was
      only ever darkening a photograph for no one's benefit.

      (Earlier passes also removed four decorations that sat on top of this
      photo: a rotated square outline, a hairline rule, a tricolour rule and
      three dots that read as macOS traffic lights. Review doc §4.2.)
    */
    <figure className={cn('h-72 md:h-96', className)}>
      <MediaFrame src={photo.src} alt={photo.alt} priority={priority} className="h-full w-full" />
    </figure>
  );
}

type HeroProofStripProps = {
  items: HeroProofItem[];
  className?: string;
  compact?: boolean;
};

export function HeroProofStrip({ items, className, compact = false }: HeroProofStripProps) {
  if (items.length === 0) {
    return null;
  }

  const colCount = Math.min(items.length, 4);
  const layoutClass = {
    1: 'grid-cols-1 max-w-xs',
    2: 'grid-cols-2 max-w-lg',
    3: 'grid-cols-3 max-w-2xl',
    4: 'grid-cols-2 md:grid-cols-4 max-w-3xl',
  }[colCount as 1 | 2 | 3 | 4] || 'grid-cols-2 md:grid-cols-4 max-w-3xl';

  return (
    <div
      className={cn(
        'grid gap-3 rounded-xl border border-[color:var(--casa-sand)] bg-white/90 p-3 shadow-[var(--shadow-soft)]',
        layoutClass,
        compact && 'p-2',
        className
      )}
    >
      {items.slice(0, 4).map((item) => (
        <article key={`${item.value}-${item.label}`} className="rounded-xl bg-white px-3 py-2.5 shadow-[var(--shadow-soft)]">
          <p className={cn('font-black text-[var(--casa-ink)]', compact ? 'text-lg' : 'text-xl')}>{item.value}</p>
          <p className={cn('mt-1 font-semibold text-[var(--casa-muted)]', compact ? 'text-xs' : 'text-xs')}>{item.label}</p>
        </article>
      ))}
    </div>
  );
}

/**
 * THE HERO LEDE — eyebrow, headline, lead sentence, calls to action.
 *
 * One component, for every hero on the site. This exists because the three
 * heroes a visitor is most likely to see in one session did not agree with each
 * other. Measured at 1440px before this:
 *
 *   /                          h1 64px    weight 700   line-height 1.25
 *   /courses/german-for-groups h1 51.2px  weight 900   line-height 1.05
 *   /accommodation             h1 51.2px  weight 900   line-height 1.25
 *
 * Three sizes, two weights, three line-heights, and each one written out again
 * in its own hero file — so "make the hero bigger" was a three-file edit that
 * nobody would remember to finish. The scale below is the homepage's, because
 * the homepage is the surface the rest of the site is measured against.
 *
 * CTA policy is part of the design, not a call-site choice: the first action is
 * the solid button and every action after it is a text link. Two filled buttons
 * do not offer a choice, they defer one — see the TextCta doc comment for the
 * rule the rest of the site already follows.
 */
export function HeroLede({
  eyebrow,
  title,
  description,
  ctas,
  facts,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroAction[];
  /** Decision figures, set as an editorial rail under the actions. */
  facts?: HeroFact[];
  className?: string;
}) {
  const [primaryCta, ...secondaryCtas] = ctas;

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
        {eyebrow}
      </p>

      {/* `text-wrap: balance` comes from the [data-hero-archetype] h1 rule in globals.css. */}
      <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--casa-ink)] sm:text-5xl lg:text-6xl">
        {title}
      </h1>

      <p className="mt-6 max-w-measure text-pretty text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
        {description}
      </p>

      {primaryCta ? (
        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Button
            asChild
            className="casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]"
            data-casa-track="true"
            data-casa-label={primaryCta.label}
          >
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
          </Button>

          {secondaryCtas.slice(0, 2).map((cta) => (
            <TextCta key={`${cta.href}-${cta.label}`} href={cta.href}>
              {cta.label}
            </TextCta>
          ))}
        </div>
      ) : null}

      {/*
        The fact rail carries no card, no border box and no shadow — a top
        hairline and the site's micro-label scale, so it reads as part of the
        lede rather than as a widget dropped into it. 2x2 rather than 4 across:
        four cells in a 46% column give each label ~150px, which wraps every
        qualifier onto three lines. `max-w-measure` is the lead paragraph's own
        token, so the hairline ends exactly where the sentence above it does.
      */}
      {facts && facts.length > 0 ? (
        <dl className="mt-9 grid max-w-measure grid-cols-2 gap-x-8 gap-y-5 border-t border-[color:var(--casa-sand)] pt-6">
          {facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`}>
              <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                {fact.label}
              </dt>
              <dd className="mt-2 text-2xl font-bold leading-none text-[var(--casa-ink)]">
                {fact.value}
              </dd>
              {fact.hint ? (
                <dd className="mt-1.5 text-xs leading-snug text-[var(--casa-muted)]">{fact.hint}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/**
 * THE HERO PHOTOGRAPH — masked into the page ground rather than framed on it.
 *
 * Lifted out of HeroHomePhoto unchanged so /accommodation renders the homepage's
 * photograph treatment by sharing its implementation, not by copying its
 * classes. Before this, the accommodation hero put the same subject in a rounded
 * MediaFrame with a caption under it, which is the "floating card on a
 * background" composition every other pass on this site has been removing.
 *
 * The photograph stops at the site frame, not the viewport: the grid column's
 * right edge sits on the same gutter the copy's left edge sits on, so the hero
 * reads as one balanced block. No margin class at all — Container's own padding
 * does the work, which is why this cannot drift from the left inset.
 */
export function HeroBleedPhoto({
  photo,
  className,
  sizes = '(min-width: 1024px) 56vw, 100vw',
}: {
  photo: HeroPhoto;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn('relative h-[19rem] sm:h-[24rem] lg:h-[33rem]', className)}>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          /*
            Masked, not cropped. A rounded rectangle on a background is a PLACED
            object; fading the left edge to transparent means there is no
            boundary at all, so the hero's ground reads as continuous behind the
            photograph.

            Two ramps composited: left-to-right for the dissolve, and a gentler
            top/bottom so the photo does not butt into the section's own border.
            `-webkit-` duplicated for Safari.
          */
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 34%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 34%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
        }}
      >
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} className="object-cover" priority />
      </div>

      {/*
        A soft focal fall-off on the leading edge. The mask alone fades opacity;
        this also softens detail as the photo dissolves, so the transition reads
        as depth rather than as a fade. Cheap — it blurs what is already painted
        rather than loading a second image — and `pointer-events-none` keeps it
        out of the way.
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
  );
}
