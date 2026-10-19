'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Calendar } from '@/components/admin/date-picker';
import { Floating } from '@/components/admin/floating';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { cn } from '@/lib/utils';

/** Any day, picked from a calendar: the Tagesplan's view (`path`) opens on it. */
export function DayJump({ day, today, path }: { day: string; today: string; path: string }) {
  const { t } = useWsLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!anchor.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[0.84rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-ws-sunk focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4 [&_svg]:text-[var(--casa-muted)]',
          open && 'bg-ws-sunk'
        )}
      >
        {Icon.calendar}
        {t('Datum', 'Date')}
      </button>
      {open ? (
        <Floating anchor={anchor} panelRef={panel} role="dialog" label={t('Tag wählen', 'Choose a day')} estimate={340}>
          <div className="rounded-2xl bg-white p-2 shadow-[0_24px_56px_-22px_rgba(15,23,42,0.42),0_0_0_1px_rgba(15,23,42,0.08)]">
            <Calendar
              mode="single"
              value={day}
              today={today}
              onPick={(iso) => {
                setOpen(false);
                if (iso) router.push(iso === today ? path : `${path}?date=${iso}`);
              }}
            />
          </div>
        </Floating>
      ) : null}
    </>
  );
}
