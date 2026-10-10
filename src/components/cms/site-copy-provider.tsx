'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { resolvers, type Pick, type PickTree, type Say } from '@/lib/cms/copy';

/**
 * `say`, `pick` and `pickTree` for client components (src/lib/cms/copy.ts).
 *
 * The site layout passes this language's edited texts and whether the page is
 * in the editor's preview; client components read them here, so the server's
 * render and the browser's agree and no state is shared between visitors.
 * Without a provider — a test, the workspace — every text is its default.
 */

type SiteCopy = { say: Say; pick: Pick; pickTree: PickTree };

const defaults = resolvers(new Map(), false);
const SiteCopyContext = createContext<SiteCopy>(defaults);

export function SiteCopyProvider({
  locale,
  editing,
  values,
  children,
}: {
  locale: string;
  editing: boolean;
  /** Key → edited text, for `locale`. */
  values: Record<string, string>;
  children: ReactNode;
}) {
  const copy = useMemo(
    () => resolvers(new Map(Object.entries(values).map(([key, value]) => [`${key}|${locale}`, value])), editing),
    [values, editing, locale]
  );
  return <SiteCopyContext.Provider value={copy}>{children}</SiteCopyContext.Provider>;
}

export const useSiteCopy = (): SiteCopy => useContext(SiteCopyContext);
