'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Scale } from 'lucide-react';

import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

import type { CompareItem, CompareType } from './compare-utils';
import { getCompareItems, toggleCompareItem } from './compare-utils';

type CompareToggleButtonProps = {
  type: CompareType;
  locale: ContentLocale;
  item: CompareItem;
};

const copy = {
  en: {
    add: 'Save compare',
    remove: 'Saved',
  },
  de: {
    add: 'Vergleich merken',
    remove: 'Gemerkt',
  },
} as const;

export function CompareToggleButton({ type, locale, item }: CompareToggleButtonProps) {
  const [selected, setSelected] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const maxCompareItems = 2;

  useEffect(() => {
    const sync = () => {
      const items = getCompareItems(type);
      setSelected(items.some((entry) => entry.id === item.id));
      setSelectedCount(items.length);
    };

    sync();

    const onUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ type?: CompareType }>;
      if (!customEvent.detail?.type || customEvent.detail.type === type) {
        sync();
      }
    };

    window.addEventListener('casa:compare-updated', onUpdate);

    return () => {
      window.removeEventListener('casa:compare-updated', onUpdate);
    };
  }, [item.id, type]);

  const limitReached = !selected && selectedCount >= maxCompareItems;
  const label = useMemo(() => {
    if (selected) {
      return copy[locale].remove;
    }
    if (limitReached) {
      return locale === 'de' ? 'Limit erreicht' : 'Limit reached';
    }
    return copy[locale].add;
  }, [limitReached, locale, selected]);

  return (
    <button
      type="button"
      onClick={() => {
        toggleCompareItem(type, item);
      }}
      disabled={limitReached}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        selected
          ? 'border-[var(--casa-blue)]/45 bg-[var(--casa-blue)]/12 text-[var(--casa-accent-text)]'
          : limitReached
            ? 'cursor-not-allowed border-[color:var(--casa-sand)] bg-slate-100 text-[var(--casa-text-subtle)]'
            : 'border-[color:var(--casa-sand)] text-[var(--casa-muted)] hover:bg-[var(--casa-warm-soft)]'
      )}
      aria-pressed={selected}
      aria-label={`${label} (${selectedCount}/${maxCompareItems})`}
    >
      {selected ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
