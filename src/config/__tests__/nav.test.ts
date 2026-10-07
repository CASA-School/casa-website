import { describe, expect, it } from 'vitest';

import { localizeNavDescription, navConfig, type NavDropdown } from '@/config/nav';

const dropdownItems = navConfig.main
  .filter((item): item is NavDropdown => 'sections' in item)
  .flatMap((dropdown) => dropdown.sections.flatMap((section) => section.items));

describe('menu descriptions', () => {
  /*
   * The bug this guards: the English description was cut to the length cap
   * before the German lookup, so a description over the cap matched no key and
   * the German menu showed "Meet teachers and staff guiding each learner jour...".
   */
  it('shows every description in German on the German site, uncut', () => {
    for (const item of dropdownItems) {
      const german = localizeNavDescription(item.description, 'de');

      expect(german, item.href).not.toBe(localizeNavDescription(item.description, 'en'));
      expect(german, item.href).not.toMatch(/\.\.\.$/);
    }
  });
});
