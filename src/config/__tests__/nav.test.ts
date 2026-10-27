import { describe, expect, it } from 'vitest';

import { navConfig, type NavDropdown } from '@/config/nav';

const dropdownItems = navConfig.main
  .filter((item): item is NavDropdown => 'sections' in item)
  .flatMap((dropdown) => dropdown.sections.flatMap((section) => section.items));

describe('menu labels', () => {
  // Bildungszeit is the legal name of Bremen's paid training leave; the English
  // menu calls it by that name, as the course pages do.
  it('names Bildungszeit by its German name in English too', () => {
    const bildungszeit = dropdownItems.find((item) => item.href === '/courses/bildungszeit');

    expect(bildungszeit?.label).toBe('Bildungszeit');
  });
});
