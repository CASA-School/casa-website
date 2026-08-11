import type { ReactNode } from 'react';
import Image from 'next/image';

import { Breadcrumbs, type BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { Container } from '@/components/ui/container';
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
    <figure
      className={cn(
        'relative overflow-hidden rounded-3xl bg-[var(--casa-warm-soft)]/35 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="casa-media-overlay relative h-72 md:h-96">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          preload={priority}
          fetchPriority={priority ? 'high' : undefined}
          loading={priority ? 'eager' : 'lazy'}
          sizes="(min-width: 1280px) 38vw, (min-width: 1024px) 46vw, 96vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute bottom-8 left-8 h-14 w-14 rotate-45 border border-white/65" />
        <div className="pointer-events-none absolute bottom-8 left-24 right-10 h-px bg-white/50" />
        <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--casa-red)]/90" />
          <span className="h-2 w-2 rounded-full bg-[var(--casa-sun)]/90" />
          <span className="h-2 w-2 rounded-full bg-[var(--casa-blue)]/90" />
        </div>
        <div className="casa-tricolor-rule pointer-events-none absolute bottom-4 left-4 h-1 w-28 rounded-full" />
      </div>
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
          <p className={cn('mt-1 font-semibold text-slate-600', compact ? 'text-[11px]' : 'text-xs')}>{item.label}</p>
        </article>
      ))}
    </div>
  );
}
