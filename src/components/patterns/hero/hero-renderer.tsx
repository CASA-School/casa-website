import type { HeroSpec } from '@/lib/content/types';

import { HeroA } from './hero-a';
import { HeroB } from './hero-b';
import { HeroC } from './hero-c';
import { HeroD } from './hero-d';
import { HeroE } from './hero-e';
import { HeroF } from './hero-f';
import type { HeroPatternProps } from './shared';

type HeroRendererProps = Omit<HeroPatternProps, 'spec'> & {
  spec: HeroSpec;
};

export function HeroRenderer({ spec, ...rest }: HeroRendererProps) {
  switch (spec.archetype) {
    case 'A':
      return <HeroA spec={spec} {...rest} />;
    case 'B':
      return <HeroB spec={spec} {...rest} />;
    case 'C':
      return <HeroC spec={spec} {...rest} />;
    case 'D':
      return <HeroD spec={spec} {...rest} />;
    case 'E':
      return <HeroE spec={spec} {...rest} />;
    case 'F':
      return <HeroF spec={spec} {...rest} />;
    default:
      return <HeroB spec={spec} {...rest} />;
  }
}
