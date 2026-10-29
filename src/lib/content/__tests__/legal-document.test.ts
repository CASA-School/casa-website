import { describe, expect, it } from 'vitest';

import publishedLegal from '@/lib/content/published-legal.json';
import { legalGroups, legalText, prepareLegalDocument, statedRevision } from '@/lib/content/legal-document';

const documents = Object.entries(publishedLegal).flatMap(([name, byLocale]) =>
  Object.entries(byLocale).map(([locale, content]) => ({ label: `${name} ${locale}`, html: content.html })),
);

describe('prepareLegalDocument', () => {
  it.each(documents)('keeps the wording of $label word for word', ({ html }) => {
    expect(legalText(prepareLegalDocument(html).html)).toBe(legalText(html));
    expect(legalText(legalGroups(html).join(''))).toBe(legalText(html));
  });

  it('lists the numbered sections, each with a unique id on its heading', () => {
    for (const { html } of documents) {
      const { html: prepared, sections } = prepareLegalDocument(html);
      expect(new Set(sections.map((section) => section.id)).size).toBe(sections.length);
      for (const section of sections) expect(prepared).toContain(`<h2 id="${section.id}"`);
    }
    expect(prepareLegalDocument(publishedLegal.privacy.de.html).sections).toHaveLength(25);
    expect(prepareLegalDocument(publishedLegal.terms.de.html).sections.map((section) => section.number)).toEqual(
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
    );
  });

  it('keeps the ids the privacy policy already gives its sections', () => {
    const { sections } = prepareLegalDocument(publishedLegal.privacy.de.html);
    expect(sections[0]).toEqual({ id: 'definitions', number: '1', title: 'Begriffsbestimmungen' });
  });

  it('makes an unnumbered heading inside a section its sub-heading', () => {
    const { html } = prepareLegalDocument(publishedLegal.terms.de.html);
    expect(html).toContain('<h3>Widerrufsrecht</h3>');
  });

  it('hangs a clause number and keeps the clause, links included, in one cell', () => {
    const { html } = prepareLegalDocument('<p>(2.1) Siehe <a href="https://casa-bremen.de">casa-bremen.de</a> dazu.</p>');
    expect(html).toBe(
      '<p class="legal-clause"><span class="legal-clause-num">(2.1)</span> <span>Siehe <a href="https://casa-bremen.de">casa-bremen.de</a> dazu.</span></p>',
    );
  });
});

describe('legalGroups', () => {
  it('splits the imprint into its address, register and notes', () => {
    const groups = legalGroups(publishedLegal.imprint.de.html);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toContain('Am Dobben 14–16');
    expect(groups[1]).toContain('HRB 32761 HB');
  });
});

describe('statedRevision', () => {
  it('reads the date the terms name as their revision, in both languages', () => {
    expect(statedRevision(publishedLegal.terms.de.html)).toBe('2023-08-08');
    expect(statedRevision(publishedLegal.terms.en.html)).toBe('2023-08-08');
    expect(statedRevision(publishedLegal.imprint.de.html)).toBeNull();
  });
});
