'use client';

import { useState, useTransition } from 'react';

import { useWsLang } from './lang';
import { cn } from '@/lib/utils';

/**
 * A book line on the booking, coloured as in SchoolMan (0087, Rahman 2026-10-23): red until the learner
 * has their books, green after. Learners from abroad pay online and pick them up on the first day or a
 * few days before; the colleague at the desk clicks the line. The colour says it; the words are on hover.
 */
export function BookLine({
  id,
  label,
  handedOut,
  detail,
  canEdit,
  onSet,
}: {
  id: string;
  label: string;
  handedOut: boolean;
  /** When and by whom, for the hover. */
  detail?: string | null;
  canEdit: boolean;
  onSet: (input: { chargeId: string; handedOut: boolean }) => Promise<{ ok: boolean }>;
}) {
  const { t } = useWsLang();
  const [on, setOn] = useState(handedOut);
  const [pending, start] = useTransition();
  const title = on ? [t('Bücher ausgegeben', 'Books handed out'), detail].filter(Boolean).join(' · ') : t('Bücher noch nicht ausgegeben', 'Books not handed out yet');
  const look = cn(
    'max-w-full shrink-0 truncate rounded-md px-1.5 py-0.5 font-semibold ring-1 ring-inset transition-colors',
    on ? 'bg-[#e5f5eb] text-[#137a3c] ring-[#bfe3c9]' : 'bg-[#fdecee] text-[#a3050f] ring-[#f5c2c7]'
  );
  if (!canEdit) {
    return (
      <span className={look} title={title}>
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t(`${label}: ausgegeben`, `${label}: handed out`) : t(`${label}: nicht ausgegeben`, `${label}: not handed out`)}
      title={title}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          if (!(await onSet({ chargeId: id, handedOut: next })).ok) setOn(!next);
        });
      }}
      className={cn(look, 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40', on ? 'hover:bg-[#d6efdf]' : 'hover:bg-[#fadadd]')}
    >
      {label}
    </button>
  );
}
