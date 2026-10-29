/**
 * A checked-in legal document (`published-legal.json`) made ready for its page: an id and a
 * set-off number on every numbered section, the clause numbers of the AGB („(5.2)") hung in
 * the margin, and the imprint's lines in their groups. The wording is never touched: the text
 * of the result equals the text of the source (`legal-document.test.ts`), as the baseline import
 * promised (docs/LEGAL_BASELINE.md). Only markup and empty paragraphs change.
 *
 * The input is the allowlisted snapshot and nothing else — never form data, CMS HTML or a fetch.
 */

export type LegalSection = { id: string; number: string; title: string };

export type LegalDocument = {
  html: string;
  /** The numbered sections, in order: the page's table of contents. */
  sections: LegalSection[];
};

const EMPTY_PARAGRAPH = /<p>(?:\s|&nbsp;| )*<\/p>/g;
const HEADING = /<h2([^>]*)>([\s\S]*?)<\/h2>/g;
const NUMBERED = /^(\d+)\.\s+([\s\S]+)$/;
// The clause's text goes into one span: in the hanging grid every loose text run and link
// would otherwise become a grid cell of its own.
const CLAUSE = /<p>\((\d+\.\d+[a-z]?)\)\s+([\s\S]*?)<\/p>/g;

/** Plain text, whitespace collapsed: what a reader and the baseline check compare. */
export function legalText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;| /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base.length <= 48 ? base : base.slice(0, 48).replace(/-[^-]*$/, '');
}

export function prepareLegalDocument(source: string): LegalDocument {
  const sections: LegalSection[] = [];
  const used = new Set<string>();

  let html = source.replace(EMPTY_PARAGRAPH, '');

  html = html.replace(HEADING, (_match, attributes: string, inner: string) => {
    const text = legalText(inner);
    const numbered = NUMBERED.exec(text);
    // An unnumbered heading inside a numbered section („Widerrufsrecht" in § 3) is its sub-heading.
    if (!numbered) {
      return `<h3${attributes}>${inner}</h3>`;
    }
    const [, number, title] = numbered;
    let id = /\bid="([^"]+)"/.exec(attributes)?.[1] ?? slug(title);
    if (used.has(id)) id = `${id}-${number}`;
    used.add(id);
    sections.push({ id, number, title });
    return `<h2 id="${id}" class="legal-heading"><span class="legal-num">${number}.</span> <span>${title}</span></h2>`;
  });

  html = html.replace(
    CLAUSE,
    (_match, number: string, text: string) =>
      `<p class="legal-clause"><span class="legal-clause-num">(${number})</span> <span>${text}</span></p>`,
  );

  return { html, sections };
}

/**
 * The imprint's lines in their groups — address, register, notes — split where the source
 * left an empty paragraph between them.
 */
export function legalGroups(source: string): string[] {
  return source
    .split(EMPTY_PARAGRAPH)
    .map((group) => group.trim())
    .filter(Boolean);
}

/** The date the text itself names as its revision („Stand: 08.08.2023", „as of 08.08.2023"). */
export function statedRevision(source: string): string | null {
  const match = /(?:Stand|as of):?\s*(\d{2})\.(\d{2})\.(\d{4})/i.exec(legalText(source));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
