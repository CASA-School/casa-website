import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { HeroPhotoCard, HeroSurface, type HeroAction, type HeroPhoto, type HeroProofItem } from './shared';

type HeroHomePhotoProps = {
  eyebrow: string;
  title: string;
  description: string;
  proofLine: string;
  badge: string;
  ctas: HeroAction[];
  photo: HeroPhoto;
  trustBadges?: string[];
  proofItems?: HeroProofItem[];
  themeClassName?: string;
};

export function HeroHomePhoto({
  eyebrow,
  title,
  description,
  proofLine,
  badge,
  ctas,
  photo,
  trustBadges = [],
  themeClassName = 'hero-theme-home',
}: HeroHomePhotoProps) {
  return (
    <HeroSurface themeClassName={themeClassName} archetype="A">
      <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.04] text-[var(--casa-ink)] sm:text-5xl lg:text-[3.3rem]">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)]">
            <span className="h-2 w-2 rounded-full bg-[var(--casa-amber)]" aria-hidden />
            {proofLine}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
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

          {trustBadges.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-3">
              {trustBadges.slice(0, 4).map((item) => (
                <li
                  key={item}
                  className="text-xs font-semibold text-[var(--casa-muted)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-4 lg:pt-2">
          <div className="inline-flex rounded-full bg-[var(--casa-ink-deep)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white">
            {badge}
          </div>
          <HeroPhotoCard photo={photo} className="min-h-[310px]" priority />
        </div>
      </div>
    </HeroSurface>
  );
}
