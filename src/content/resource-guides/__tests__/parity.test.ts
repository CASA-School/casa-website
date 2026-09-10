import { describe, expect, it } from 'vitest';

import { resourceGuidesDe } from '../de';
import { resourceGuidesEn } from '../en';
import type { ResourceGuideData, ResourceGuideSlug } from '../types';

/**
 * The German set is a TRANSLATION, not a second edition.
 *
 * The guides were English-only until 2026-09-10, and the risk now is the
 * opposite one: an English edit that never reaches the German file, so a German
 * reader gets an older or shorter guide with no sign that anything is missing.
 * These assertions do not compare prose — they compare structure, which is what
 * silently drifts.
 */

const slugs = Object.keys(resourceGuidesEn) as ResourceGuideSlug[];

describe('the German guides mirror the English ones', () => {
  it('covers the same three guides', () => {
    expect(Object.keys(resourceGuidesDe).sort()).toEqual(slugs.slice().sort());
  });

  it.each(slugs)('%s has the same structure in both languages', (slug) => {
    const en = resourceGuidesEn[slug];
    const de = resourceGuidesDe[slug];

    const shape = (guide: ResourceGuideData) => ({
      slug: guide.slug,
      path: guide.path,
      quickFacts: guide.quickFacts.length,
      steps: guide.steps.length,
      stepsWithAction: guide.steps.filter((step) => step.action).length,
      sections: guide.sections.length,
      bulletsPerSection: guide.sections.map((section) => section.bullets.length),
      // A link is a promise about the site's own structure, so both languages
      // must make the same one, to the same internal path.
      sectionLinks: guide.sections.map((section) => section.link?.href ?? null),
      faq: guide.faq.length,
      officialLinks: guide.officialLinks.length,
      heroActions: guide.hero.ctas.map((cta) => cta.href),
      // The same photograph in both languages; only the alt text is translated.
      heroPhoto: guide.hero.photo.src,
    });

    expect(shape(de)).toEqual(shape(en));
  });

  it.each(slugs)('%s is actually written in German, not copied from English', (slug) => {
    const de = resourceGuidesDe[slug];
    const en = resourceGuidesEn[slug];

    // The prose fields a reader sees first. An identical string here means the
    // translation was skipped for that field.
    expect(de.hero.lead).not.toBe(en.hero.lead);
    expect(de.stepsTitle).not.toBe(en.stepsTitle);
    expect(de.metaDescription).not.toBe(en.metaDescription);
    expect(de.hero.photo.alt).not.toBe(en.hero.photo.alt);
    de.steps.forEach((step, index) => {
      expect(step.title, `${slug} step ${index + 1}`).not.toBe(en.steps[index].title);
    });
  });

  it.each(slugs)('%s keeps German diacritics rather than transliterating them', (slug) => {
    const prose = JSON.stringify(resourceGuidesDe[slug])
      // URLs legitimately contain "fuer" and friends.
      .replace(/"url":"[^"]*"/g, '');

    for (const transliteration of ['fuer ', 'ueber ', 'Moebl', 'staedt', 'jaehr', 'Pruef', 'moecht']) {
      expect(prose, `${slug} contains "${transliteration}"`).not.toContain(transliteration);
    }
    expect(prose).toMatch(/[äöüß]/);
  });
});
