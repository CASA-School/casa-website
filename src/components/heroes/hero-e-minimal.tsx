import { HeroMinimalUtility } from './hero-minimal-utility';
import type { HeroAction } from './shared';
import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';

type HeroEMinimalProps = {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  cta?: HeroAction;
  meta?: string[];
};

export function HeroEMinimal({ eyebrow, title, description, breadcrumbs, cta, meta }: HeroEMinimalProps) {
  return (
    <HeroMinimalUtility
      eyebrow={eyebrow}
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      cta={cta}
      meta={meta}
      themeClassName="hero-theme-default"
    />
  );
}
