import { describe, expect, it } from 'vitest';

import { localizeNavText, navConfig, type NavDropdown } from '@/config/nav';
import { resolvers } from '@/lib/cms/copy';
import { fillFacts } from '@/lib/cms/facts';

// The menu always renders through `say`, which fills live values ("20 lessons a week").
const facts = { 'course.intensive-german.lessons': '20' };
const { say } = resolvers(new Map(), false, () => facts);

const dropdownItems = navConfig.main
  .filter((item): item is NavDropdown => 'sections' in item)
  .flatMap((dropdown) => dropdown.sections.flatMap((section) => section.items));

describe('menu descriptions', () => {
  it('shows every description in German on the German site', () => {
    for (const item of dropdownItems) {
      expect(localizeNavText(item.description, 'de', say), item.href).not.toBe(localizeNavText(item.description, 'en', say));
    }
  });

  /*
   * One line each on the desktop dropdowns (Rahman 2026-10-28), measured to fit
   * at 1280px in both languages; the longest is "Host learners from all over the
   * world.", 38 characters. The line truncates rather than wrap.
   */
  it('keeps every description to one short line in both languages', () => {
    for (const item of dropdownItems) {
      for (const locale of ['de', 'en'] as const) {
        const line = fillFacts(localizeNavText(item.description, locale, say) ?? '', facts);
        expect(line.length, `${item.href} ${locale}`).toBeLessThanOrEqual(38);
      }
    }
  });
});

describe('menu labels', () => {
  // Bildungszeit is the legal name of Bremen's paid training leave; the English
  // menu calls it by that name, as the course pages do.
  it('names Bildungszeit by its German name in English too', () => {
    const bildungszeit = dropdownItems.find((item) => item.href === '/courses/bildungszeit');

    expect(bildungszeit?.label).toBe('Bildungszeit');
  });
});
