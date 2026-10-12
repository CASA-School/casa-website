/**
 * A rendered page → its title and sections, as plain text.
 *
 * Reads the page's `<main>` the way a visitor reads it: headings h1–h3 open a
 * section, everything up to the next one is its text. Scripts, styles, SVG,
 * navigation, forms and anything `aria-hidden` stay out (the drawn heroes'
 * labels are aria-hidden and repeat what the page says). No HTML library: the
 * production image installs runtime dependencies only, and Next renders
 * well-formed markup.
 */

export type PageSection = { heading?: string; anchor?: string; text: string };
export type ExtractedPage = { title: string; sections: PageSection[] };

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'template', 'nav', 'form', 'button', 'select', 'textarea', 'iframe', 'video', 'audio', 'dialog']);
const BLOCK = new Set(['p', 'li', 'div', 'section', 'article', 'aside', 'dd', 'dt', 'td', 'th', 'tr', 'br', 'figcaption', 'blockquote', 'ul', 'ol', 'dl', 'table', 'header', 'footer', 'h4', 'h5', 'h6']);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', ndash: '–', mdash: '—', hellip: '…', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', euro: '€', middot: '·' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const attribute = (attributes: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(attributes)?.[1];

/** Words a layout element joined without a space ("MonateGruppen") are split again. */
const clean = (text: string) =>
  decodeEntities(text)
    .replace(/([a-zäöüß])([A-ZÄÖÜ][a-zäöüß])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

/** Long sections are cut at sentence ends so a document stays about one thing. */
function chunk(text: string, max = 900): string[] {
  if (text.length <= max) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > max) {
      out.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) out.push(current);
  return out;
}

export function extractPage(html: string): ExtractedPage {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = clean(titleMatch?.[1] ?? '').replace(/\s+[|–—-]\s+CASA.*$/i, '');

  const mainStart = html.search(/<main[\s>]/i);
  const mainEnd = html.lastIndexOf('</main>');
  let body = mainStart >= 0 && mainEnd > mainStart ? html.slice(mainStart, mainEnd) : html;
  body = body.replace(/<!--[\s\S]*?-->/g, '');

  const sections: PageSection[] = [];
  let current: { heading?: string; anchor?: string; parts: string[] } = { parts: [] };
  let heading: { level: string; parts: string[]; anchor?: string } | null = null;
  let lastSectionId: string | undefined;
  /** Depth inside a skipped element; while above zero, nothing is read. */
  let skipDepth = 0;
  const skipStack: string[] = [];

  const flush = () => {
    const text = clean(current.parts.join(''));
    if (text || current.heading) sections.push({ heading: current.heading, anchor: current.anchor, text });
  };

  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:="[^"]*"|='[^']*'|=[^\s>]*)?)*)\s*(\/?)>|([^<]+)|(<)/g;
  for (const match of body.matchAll(tag)) {
    const [, closing, rawName, attributes = '', selfClosing, text, stray] = match;
    if (text !== undefined || stray !== undefined) {
      if (skipDepth > 0) continue;
      const value = text ?? '<';
      if (heading) heading.parts.push(value);
      else current.parts.push(value);
      continue;
    }
    const name = rawName.toLowerCase();
    const isVoid = VOID.has(name) || Boolean(selfClosing);

    if (skipDepth > 0) {
      if (isVoid) continue;
      if (closing) {
        skipDepth -= 1;
        skipStack.pop();
      } else {
        skipDepth += 1;
        skipStack.push(name);
      }
      continue;
    }

    if (!closing && !isVoid && (SKIP.has(name) || attribute(attributes, 'aria-hidden') === 'true' || attribute(attributes, 'hidden') !== undefined)) {
      skipDepth = 1;
      skipStack.push(name);
      continue;
    }

    if (!closing && (name === 'section' || name === 'article')) {
      const id = attribute(attributes, 'id');
      if (id) lastSectionId = id;
    }

    if (/^h[1-3]$/.test(name)) {
      if (!closing) {
        flush();
        heading = { level: name, parts: [], anchor: attribute(attributes, 'id') ?? lastSectionId };
        lastSectionId = undefined;
      } else if (heading) {
        current = { heading: clean(heading.parts.join('')), anchor: heading.anchor, parts: [] };
        heading = null;
      }
      continue;
    }

    if (BLOCK.has(name) || (/^(span|a|strong|p)$/.test(name) && /\bclass="[^"]*\b(block|flex|grid|inline-flex|inline-block)\b/.test(attributes))) {
      if (heading) heading.parts.push(' ');
      else current.parts.push(' ');
    }
  }
  flush();

  const out: PageSection[] = [];
  for (const section of sections) {
    for (const piece of chunk(section.text)) out.push({ heading: section.heading, anchor: section.anchor, text: piece });
  }
  return { title, sections: out.filter((section) => section.text.length >= 20 || section.heading) };
}
