import type { ReactNode } from 'react';
import { CasaImage as Image } from '@/components/ui/casa-image';

import { Container } from '@/components/ui/container';
import type { HeroSpec } from '@/lib/content/types';
import { cn } from '@/lib/utils';

export type HeroQuickLink = {
  label: string;
  href: string;
};

export type HeroUtilityItem = {
  label: string;
  value: string;
};

export type HeroPatternProps = {
  spec: HeroSpec;
  showDraftClaims?: boolean;
  className?: string;
  dataTestId?: string;
  breadcrumbs?: { label: string; href?: string }[];
  quickLinks?: HeroQuickLink[];
  utilityItems?: HeroUtilityItem[];
};

const heroThemeClassByKey: Record<HeroSpec['themeKey'], string> = {
  home: 'hero-theme-home',
  courses: 'hero-theme-courses',
  exams: 'hero-theme-exams',
  accommodation: 'hero-theme-accommodation',
  about: 'hero-theme-about',
  default: 'hero-theme-default',
};

export function heroThemeClass(themeKey: HeroSpec['themeKey']) {
  return heroThemeClassByKey[themeKey];
}

const heroArchetypeClassByKey: Record<HeroSpec['archetype'], string> = {
  A: 'hero-archetype-a',
  B: 'hero-archetype-b',
  C: 'hero-archetype-c',
  D: 'hero-archetype-d',
  E: 'hero-archetype-e',
  F: 'hero-archetype-f',
};

const heroSpacingByArchetype: Record<HeroSpec['archetype'], string> = {
  A: 'py-10 md:py-12 lg:py-14',
  B: 'py-8 md:py-10 lg:py-12',
  C: 'py-6 md:py-8 lg:py-9',
  D: 'py-8 md:py-10 lg:py-12',
  E: 'py-7 md:py-10 lg:py-11',
  F: 'py-9 md:py-11 lg:py-13',
};

type HeroShellProps = {
  spec: HeroSpec;
  className?: string;
  dataTestId?: string;
  children: ReactNode;
};

export function HeroShell({ spec, className, dataTestId, children }: HeroShellProps) {
  return (
    <section
      className={cn(
        'hero-grain relative overflow-hidden border-b border-[color:var(--casa-sand)]/70',
        heroThemeClass(spec.themeKey),
        heroArchetypeClassByKey[spec.archetype],
        heroSpacingByArchetype[spec.archetype],
        className
      )}
      data-testid={dataTestId}
      data-hero-archetype={spec.archetype}
    >
      <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-[var(--casa-sun)]/16 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[var(--casa-coral)]/12 blur-3xl" />
      <Container className="hero-grain-content">{children}</Container>
    </section>
  );
}

type HeroMediaCardProps = {
  spec: HeroSpec;
  className?: string;
  compact?: boolean;
};

export function HeroMediaCard({ spec, className, compact = false }: HeroMediaCardProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-[color:var(--casa-sand)]/80 bg-white/95 p-2 shadow-[var(--shadow-soft)]', compact ? 'min-h-[230px]' : 'min-h-[320px]', className)}>
      <div className="absolute inset-2 overflow-hidden rounded-xl">
        <Image
          src={spec.visual.src}
          alt={spec.visual.alt}
          fill
          sizes="(min-width: 1280px) 36vw, (min-width: 1024px) 44vw, 94vw"
          className="object-cover"
        />
      </div>
      <div className="absolute inset-2 rounded-xl bg-gradient-to-t from-[var(--casa-ink-deep)]/60 via-[var(--casa-ink-deep)]/10 to-transparent" />
      <div className="absolute bottom-0 left-0 p-5 text-white">
        <p className="text-sm font-semibold">{spec.visual.alt}</p>
      </div>
    </div>
  );
}
