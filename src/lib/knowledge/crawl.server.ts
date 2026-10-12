import 'server-only';

import sitemap from '@/app/sitemap';
import { toInternalPath } from '@/i18n/pathnames';

import type { DocType, KnowledgeDoc } from './engine';
import { extractPage } from './html';

/**
 * Reads the site's own pages, as rendered, into the index: every page in the
 * sitemap, both languages. What a visitor sees is what search finds — the
 * website editor's published texts, today's prices and dates, every section.
 *
 * It asks the server it runs in (`http://127.0.0.1:$PORT`), a few pages at a
 * time, in the background; a page that fails is left out until the next read.
 */

/** Pages whose text is a form or a legal notice, not an answer to anything. */
const LEFT_OUT = [/^\/registration\//, /^\/calculator$/, /^\/search$/];

function typeOf(path: string): DocType {
  if (path.startsWith('/courses/')) return 'course';
  if (path.startsWith('/exams/')) return 'exam';
  if (path.startsWith('/accommodation')) return 'accommodation';
  if (path.startsWith('/resources/')) return 'guide';
  if (path.startsWith('/news/')) return 'news';
  if (path.startsWith('/careers')) return 'career';
  if (path === '/faq') return 'faq';
  return 'page';
}

function boostOf(path: string): number {
  if (/^\/(imprint|privacy|terms)$/.test(path)) return 0.45;
  if (path === '/') return 0.8;
  if (path.startsWith('/news/')) return 0.75;
  if (/^\/(courses|exams|accommodation)\/[^/]+$/.test(path)) return 1.2;
  return 1;
}

export async function crawlSite(origin: string, { concurrency = 4, timeoutMs = 15_000 } = {}): Promise<{ docs: KnowledgeDoc[]; pages: number; failed: string[] }> {
  const entries = await sitemap();
  const paths = [...new Set(entries.map((entry) => new URL(entry.url).pathname))];
  const docs: KnowledgeDoc[] = [];
  const failed: string[] = [];
  let read = 0;

  const queue = [...paths];
  const worker = async () => {
    for (let publicPath = queue.shift(); publicPath; publicPath = queue.shift()) {
      const { locale, internalPath } = toInternalPath(publicPath);
      if (LEFT_OUT.some((pattern) => pattern.test(internalPath))) continue;
      try {
        const response = await fetch(`${origin}${publicPath}`, {
          headers: { accept: 'text/html', 'x-casa-knowledge': '1' },
          cache: 'no-store',
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          failed.push(`${publicPath} (${response.status})`);
          continue;
        }
        const page = extractPage(await response.text());
        read += 1;
        // The page's <title>, written to say what the page is about ("Deutsch-Einstufungstest"),
        // rather than its h1, which is often a line ("Finde dein Deutschniveau").
        const title = page.title || page.sections.find((section) => section.heading)?.heading || internalPath;
        page.sections.forEach((section, index) => {
          docs.push({
            id: `page:${locale}:${internalPath}:${index}`,
            locale,
            type: typeOf(internalPath),
            url: section.anchor ? `${internalPath}#${section.anchor}` : internalPath,
            page: title,
            heading: section.heading && section.heading !== title ? section.heading : undefined,
            text: section.text,
            boost: boostOf(internalPath),
          });
        });
      } catch (error) {
        failed.push(`${publicPath} (${error instanceof Error ? error.name : 'error'})`);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { docs, pages: read, failed };
}
