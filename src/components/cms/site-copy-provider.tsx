'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { resolvers, type IntlFor, type Pick, type PickTree, type Say, type WithFacts } from '@/lib/cms/copy';
import type { FactValues } from '@/lib/cms/facts';

/**
 * `say`, `pick` and `pickTree` for client components (src/lib/cms/copy.ts).
 *
 * The site layout passes this language's edited texts, its live values and
 * whether the page is in the editor's preview; client components read them here, so the server's
 * render and the browser's agree and no state is shared between visitors.
 * Without a provider — a test, the workspace — every text is its default.
 */

type SiteCopy = {
  say: Say;
  pick: Pick;
  pickTree: PickTree;
  withFacts: WithFacts;
  intl: IntlFor;
  /** The language the page speaks: its own, or in the editor's preview the previewed one. */
  language: string;
  /** True in the website editor's preview of a prepared language. */
  previewing: boolean;
};

const defaults: SiteCopy = { ...resolvers(new Map(), false), language: 'de', previewing: false };
const SiteCopyContext = createContext<SiteCopy>(defaults);

export function SiteCopyProvider({
  locale,
  editing,
  values,
  facts,
  display = null,
  children,
}: {
  locale: string;
  editing: boolean;
  /** Key → edited text, for `locale`. */
  values: Record<string, string>;
  /** Live value → its text in `locale` (src/lib/cms/facts.ts). */
  facts: FactValues;
  /** The prepared language the editor previews, for dates and numbers. */
  display?: string | null;
  children: ReactNode;
}) {
  const copy = useMemo(
    (): SiteCopy => ({
      ...resolvers(
        new Map(Object.entries(values).map(([key, value]) => [`${key}|${locale}`, value])),
        editing,
        () => facts,
        display
      ),
      language: display ?? locale,
      previewing: Boolean(display),
    }),
    [values, editing, locale, facts, display]
  );
  return <SiteCopyContext.Provider value={copy}>{children}</SiteCopyContext.Provider>;
}

export const useSiteCopy = (): SiteCopy => useContext(SiteCopyContext);
