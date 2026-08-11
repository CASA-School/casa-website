import { HeroRenderer } from '@/components/patterns/hero/hero-renderer';
import type { HeroSpec } from '@/lib/content/types';

type PageHeroProps = {
  spec: HeroSpec;
  showDraftClaims?: boolean;
  className?: string;
  dataTestId?: string;
  breadcrumbs?: { label: string; href?: string }[];
  quickLinks?: { label: string; href: string }[];
  utilityItems?: { label: string; value: string }[];
};

export function PageHero({
  spec,
  showDraftClaims = false,
  className,
  dataTestId,
  breadcrumbs,
  quickLinks,
  utilityItems,
}: PageHeroProps) {
  return (
    <HeroRenderer
      spec={spec}
      showDraftClaims={showDraftClaims}
      className={className}
      dataTestId={dataTestId}
      breadcrumbs={breadcrumbs}
      quickLinks={quickLinks}
      utilityItems={utilityItems}
    />
  );
}
