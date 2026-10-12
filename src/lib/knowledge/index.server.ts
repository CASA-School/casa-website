import 'server-only';

import { loadFacts } from '@/lib/cms/facts.server';

import { crawlSite } from './crawl.server';
import { KnowledgeIndex, type KnowledgeDoc } from './engine';
import { structuredDocs } from './sources.server';

/**
 * The one index search and CLARA share, kept in memory.
 *
 * It is built at once from what needs no page (FAQ, catalogue, CLARA's
 * passages), so the first search answers in milliseconds, and in production it
 * then reads the rendered pages in the background and rebuilds with them. Both
 * halves are refreshed on a timer: the structured part with the live facts
 * (prices, dates), the pages every 20 minutes, so a text published in the
 * website editor is findable within that time.
 *
 * `CASA_KNOWLEDGE_CRAWL=on|off` overrides the default (on in production only,
 * since in development every page read compiles that page).
 */

const STRUCTURED_TTL_MS = 10 * 60_000;
const CRAWL_TTL_MS = 20 * 60_000;
/** After a failed read, wait this long before trying again. */
const CRAWL_RETRY_MS = 2 * 60_000;

type State = {
  index?: KnowledgeIndex;
  structured?: { docs: KnowledgeDoc[]; at: number };
  structuredBuild?: Promise<KnowledgeDoc[]>;
  crawled?: { docs: KnowledgeDoc[]; at: number; pages: number; failed: string[] };
  crawling?: Promise<void>;
  lastCrawlAttempt?: number;
};

const store = globalThis as typeof globalThis & { casaKnowledge?: State };
const state = (): State => (store.casaKnowledge ??= {});

export const crawlEnabled = () => {
  const setting = process.env.CASA_KNOWLEDGE_CRAWL;
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return process.env.NODE_ENV === 'production';
};

const origin = () => process.env.CASA_KNOWLEDGE_ORIGIN ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;

async function buildStructured(): Promise<KnowledgeDoc[]> {
  const [de, en] = await Promise.all([loadFacts('de'), loadFacts('en')]);
  const [deDocs, enDocs] = await Promise.all([structuredDocs('de', de.values), structuredDocs('en', en.values)]);
  return [...deDocs, ...enDocs];
}

function rebuild(current: State) {
  current.index = new KnowledgeIndex([...(current.structured?.docs ?? []), ...(current.crawled?.docs ?? [])]);
}

function startCrawl(current: State) {
  if (current.crawling || !crawlEnabled()) return;
  current.lastCrawlAttempt = Date.now();
  current.crawling = crawlSite(origin())
    .then((result) => {
      if (result.pages > 0) {
        current.crawled = { docs: result.docs, at: Date.now(), pages: result.pages, failed: result.failed };
        rebuild(current);
      }
      if (result.failed.length > 0) console.warn('[knowledge] pages not read', result.failed.slice(0, 10));
      console.info('[knowledge] pages read', { pages: result.pages, sections: result.docs.length });
    })
    .catch((error) => console.error('[knowledge] crawl failed', error))
    .finally(() => {
      current.crawling = undefined;
    });
}

/** The index; never waits for the page read. */
export async function getKnowledgeIndex(): Promise<KnowledgeIndex> {
  const current = state();
  const now = Date.now();

  if (!current.structured || now - current.structured.at > STRUCTURED_TTL_MS) {
    current.structuredBuild ??= buildStructured().finally(() => {
      current.structuredBuild = undefined;
    });
    if (!current.structured) {
      current.structured = { docs: await current.structuredBuild, at: Date.now() };
      rebuild(current);
    } else {
      // Stale: answer with what is there, refresh behind it.
      void current.structuredBuild.then((docs) => {
        current.structured = { docs, at: Date.now() };
        rebuild(current);
      }).catch(() => undefined);
    }
  }

  const crawlStale = !current.crawled || now - current.crawled.at > CRAWL_TTL_MS;
  const mayRetry = !current.lastCrawlAttempt || now - current.lastCrawlAttempt > CRAWL_RETRY_MS;
  if (crawlStale && mayRetry) startCrawl(current);

  if (!current.index) rebuild(current);
  return current.index!;
}

/** For /api/health-style reporting and tests: how much the index holds. */
export function knowledgeStatus() {
  const current = state();
  return {
    documents: current.index?.size ?? 0,
    pagesRead: current.crawled?.pages ?? 0,
    pagesReadAt: current.crawled ? new Date(current.crawled.at).toISOString() : null,
    crawling: Boolean(current.crawling),
    crawlEnabled: crawlEnabled(),
  };
}
