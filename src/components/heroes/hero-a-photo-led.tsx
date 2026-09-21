import type { BreadcrumbItem } from '@/components/patterns/breadcrumbs';
import type { ContentLocale } from '@/lib/content/types';

import { HeroHomePhoto } from './hero-home-photo';
import type { HeroAction, HeroFact, HeroPhoto, HeroProofItem } from './shared';

type HeroAPhotoLedProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroAction[];
  photo: HeroPhoto;
  reelPhotos?: HeroPhoto[];
  locale?: ContentLocale;
  facts?: HeroFact[];
  proofItems?: HeroProofItem[];
  breadcrumbs?: BreadcrumbItem[];
};

export function HeroAPhotoLed(props: HeroAPhotoLedProps) {
  return <HeroHomePhoto {...props} themeClassName="hero-theme-plain" />;
}
