import Link from 'next/link';

import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import { Button } from '@/components/ui/button';
import { TextCta } from '@/components/ui/text-cta';

import { HeroSurface, type HeroAction } from './shared';

type HeroMinimalUtilityProps = {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  cta?: HeroAction;
  meta?: string[];
  themeClassName?: string;
};

export function HeroMinimalUtility({
  eyebrow,
  title,
  description,
  breadcrumbs,
  cta,
  meta = [],
  themeClassName = 'hero-theme-default',
}: HeroMinimalUtilityProps) {
  return (
    <HeroSurface
      themeClassName={themeClassName}
      breadcrumbs={breadcrumbs}
      className="min-h-0 py-10 md:py-12 lg:py-10"
      archetype="E"
    >
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--casa-ink)] sm:text-4xl lg:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

        {meta.length > 0 ? (
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {meta.map((item) => (
              <li
                key={item}
                className="rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1 text-xs font-semibold text-[var(--casa-muted)]"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {/*
          Honours `cta.kind`. It previously rendered the solid prism button
          unconditionally and never read the field, so /search — which passes
          `kind: 'secondary'` for a plain "Contact" link (src/app/search/page.tsx)
          — put the site's heaviest button on a utility page whose actual job is
          the search box beneath it.
        */}
        {cta ? (
          <div className="mt-5">
            {cta.kind === 'primary' ? (
              <Button
                asChild
                className="casa-button-prism bg-[var(--casa-ink-deep)] text-white hover:bg-[var(--casa-ink-deep-hover)]"
                data-casa-track="true"
                data-casa-label={cta.label}
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            ) : (
              <TextCta href={cta.href} data-casa-track="true" data-casa-label={cta.label}>
                {cta.label}
              </TextCta>
            )}
          </div>
        ) : null}
      </div>
    </HeroSurface>
  );
}
