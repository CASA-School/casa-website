import type { ReactNode } from 'react';

import { Breadcrumbs, type BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { Container } from '@/components/ui/container';
import { MediaFrame } from '@/components/ui/media-frame';
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

type HeroSurfaceProps = {
  children: ReactNode;
  className?: string;
  themeClassName?: string;
  breadcrumbs?: BreadcrumbItem[];
  archetype?: string;
};

export function HeroSurface({ children, className, themeClassName, breadcrumbs, archetype }: HeroSurfaceProps) {
  const heightClass =
    archetype === 'A'
      ? 'min-h-[52vh] md:min-h-[58vh]'
      : archetype === 'B' || archetype === 'D'
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
