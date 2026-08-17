import { HeroHomePhoto } from './hero-home-photo';
import type { HeroAction, HeroPhoto, HeroProofItem } from './shared';

type HeroAPhotoLedProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroAction[];
  photo: HeroPhoto;
  proofItems?: HeroProofItem[];
};

export function HeroAPhotoLed(props: HeroAPhotoLedProps) {
  return <HeroHomePhoto {...props} themeClassName="hero-theme-plain" />;
}
