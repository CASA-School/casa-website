'use client';

import { Dialog as Primitive } from 'radix-ui';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import { DIALOG_OVERLAY } from '../dialogs';
import { Icon } from '../icons';
import { useWsLang } from '../lang';

/**
 * A feedback's screenshots on its page (0112): small in the card, full size on a click, ← → between
 * them, and the original in a tab of its own.
 */
export function FeedbackGallery({ pictures }: { pictures: readonly string[] }) {
  const { t } = useWsLang();
  const [open, setOpen] = useState<number | null>(null);
  const count = pictures.length;

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % count));
      if (event.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + count) % count));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, count]);

  return (
    <>
      <ul className={cn('grid gap-3', count === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {pictures.map((src, index) => (
          <li key={src}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={t(`Screenshot ${index + 1} groß ansehen`, `View screenshot ${index + 1} large`)}
              className="group block w-full overflow-hidden rounded-xl bg-ws-sunk ring-1 ring-ws-line outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
            >
              {/* A protected route's picture, not Next's optimiser: it must keep the session's check. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className={cn('w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.015]', count === 1 ? 'max-h-[28rem]' : 'aspect-[16/10]')} />
            </button>
          </li>
        ))}
      </ul>

      <Primitive.Root open={open !== null} onOpenChange={(next) => (next ? null : setOpen(null))}>
        <Primitive.Portal>
          <Primitive.Overlay className={cn('fixed inset-0 z-[1000] data-[state=open]:animate-in data-[state=open]:fade-in-0', DIALOG_OVERLAY, 'bg-[#0d1b33]/80')} />
          <Primitive.Content aria-describedby={undefined} className="casa-ws-dialog fixed inset-3 z-[1000] flex flex-col outline-none sm:inset-6">
            <div className="flex items-center gap-3 pb-3 text-white">
              <Primitive.Title className="text-[0.9rem] font-semibold tabular-nums">
                {t('Screenshot', 'Screenshot')} {open !== null ? open + 1 : ''} / {count}
              </Primitive.Title>
              {open !== null ? (
                <a href={pictures[open]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-white/85 hover:bg-white/10 hover:text-white [&_svg]:size-3.5">
                  {Icon.external}
                  {t('Original öffnen', 'Open original')}
                </a>
              ) : null}
              <Primitive.Close aria-label={t('Schließen', 'Close')} className="ml-auto inline-flex size-9 items-center justify-center rounded-full text-white/85 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 [&_svg]:size-4">
                {Icon.close}
              </Primitive.Close>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              {open !== null ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pictures[open]} alt="" className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl" />
              ) : null}
              {count > 1 ? (
                <>
                  <Step label={t('Vorheriger', 'Previous')} side="left" onClick={() => setOpen((i) => (i === null ? i : (i - 1 + count) % count))} />
                  <Step label={t('Nächster', 'Next')} side="right" onClick={() => setOpen((i) => (i === null ? i : (i + 1) % count))} />
                </>
              ) : null}
            </div>
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </>
  );
}

function Step({ label, side, onClick }: { label: string; side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--casa-ink)] shadow-lg outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-white [&_svg]:size-4',
        side === 'left' ? 'left-2 [&_svg]:rotate-180' : 'right-2'
      )}
    >
      {Icon.chevronRight}
    </button>
  );
}
