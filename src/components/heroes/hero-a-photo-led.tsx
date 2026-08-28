import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';

import { HeroHomePhoto } from './hero-home-photo';
import type { HeroAction, HeroFact, HeroPhoto, HeroProofItem } from './shared';

type HeroAPhotoLedProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroAction[];
  photo: HeroPhoto;
  facts?: HeroFact[];
  proofItems?: HeroProofItem[];
  breadcrumbs?: BreadcrumbItem[];
};

export function HeroAPhotoLed(props: HeroAPhotoLedProps) {
  return <HeroHomePhoto {...props} themeClassName="hero-theme-plain" />;
}
