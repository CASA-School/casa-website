'use client';

import { useEffect, useRef, useState } from 'react';

import type { BookingLight } from '@/lib/admin/bookings';
import { cn } from '@/lib/utils';

import { LIGHT_TONE } from './booking-light';
import { Floating } from './floating';
import { Icon } from './icons';
import { useWsLang } from './lang';

/**
 * A booking's colour, changed where it is seen, as in SchoolMan (Rahman, 2026-10-18: "play with colors and
 * dropdown … the staff is used to the colors"; "keep it simple"). The dot — or, in the booking's own head,
 * the pill — opens three colours: in order (ja), under observation (u.B.), cancelled (nein). In order shows
 * what the money says: green once paid in full, grey until then. Cancelled is offered to whoever may
 * cancel, and asks once more; a cancelled booking shows its colour and opens nothing.
 *
 * The panel floats above the page (`Floating`), so the card it sits in cannot cut it off, and holds its
 * own form: a choice posts `light` — `ok`, `watch` or `no` — to the action, which revalidates.
 */
export function BookingLightMenu({
  bookingId,
  light,
  label,
  detail,
  labels,
  canCancel,
  action,
  variant = 'dot',
}: {
  bookingId: string;
  light: BookingLight;
  /** The colour's word, and what goes with it („1.200 € offen"), in the reader's language. */
  label: string;
  detail?: string;
  /** The three choices' words, in the reader's language. */
  labels: { ok: string; watch: string; no: string };
  canCancel: boolean;
  action: (formData: FormData) => Promise<void>;
  variant?: 'dot' | 'pill';
}) {
  const { t } = useWsLang();
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const said = detail ? `${label} · ${detail}` : label;

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!anchor.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const face =
    variant === 'pill' ? (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.76rem] font-semibold whitespace-nowrap ring-1 ring-inset', LIGHT_TONE[light].pill)}>
        <span aria-hidden="true" className={cn('size-2 rounded-full', LIGHT_TONE[light].dot)} />
        {label}
        {detail ? <span className="font-medium opacity-80">· {detail}</span> : null}
        {light !== 'no' ? <span className="-mr-1 opacity-60 [&_svg]:size-3.5">{Icon.chevronDown}</span> : null}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 [&_svg]:size-3 [&_svg]:text-[var(--casa-muted)]">
        <span aria-hidden="true" className={cn('size-3 rounded-full ring-2 ring-white', LIGHT_TONE[light].dot)} />
        {light !== 'no' ? Icon.chevronDown : null}
      </span>
    );

  // A cancelled booking only shows its colour.
  if (light === 'no') {
    return (
      <span role="img" data-light={light} aria-label={said} title={said} className="inline-flex">
        {face}
      </span>
    );
  }

  // In order is green or grey, whichever the money says; it is the current choice unless yellow.
  const current = light === 'watch' ? 'watch' : 'ok';
  const option = (value: 'ok' | 'watch', tone: BookingLight, text: string) =>
    value === current ? (
      <button key={value} type="button" aria-pressed="true" onClick={() => setOpen(false)} className={cn(row, 'bg-[var(--ws-head)] font-semibold')}>
        <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', LIGHT_TONE[tone].dot)} />
        <span className="min-w-0 flex-1 truncate">{text}</span>
        <span aria-hidden="true" className="text-[var(--fm-navy)] [&_svg]:size-4">
          {Icon.check}
        </span>
      </button>
    ) : (
      <button key={value} type="submit" name="light" value={value} aria-pressed="false" className={row}>
        <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', LIGHT_TONE[tone].dot)} />
        <span className="min-w-0 flex-1 truncate">{text}</span>
      </button>
    );

  return (
    <>
      <button
        ref={anchor}
        type="button"
        data-light={light}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t(`Farbe: ${said} – ändern`, `Colour: ${said} – change`)}
        title={said}
        onClick={(e) => {
          // In a row that links to the booking, the dot is its own control.
          e.preventDefault();
          e.stopPropagation();
          setCancelling(false);
          setOpen((v) => !v);
        }}
        className="relative z-10 rounded-full transition-colors outline-none hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
      >
        {face}
      </button>
      {open ? (
        <Floating anchor={anchor} panelRef={panel} role="dialog" label={t('Farbe der Buchung', 'Booking colour')} estimate={200}>
          <div className="w-[232px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white text-sm shadow-[0_24px_56px_-22px_rgba(15,23,42,0.42),0_0_0_1px_rgba(15,23,42,0.08)]">
            <p className="border-b border-ws-line-soft px-3.5 py-2.5 text-xs font-bold text-[var(--casa-muted)]">{t('Farbe der Buchung', 'Booking colour')}</p>
            <form action={action} onSubmit={() => setTimeout(() => setOpen(false), 0)} className="p-1.5">
              <input type="hidden" name="bookingId" value={bookingId} />
              {option('ok', 'ok', labels.ok)}
              {option('watch', 'watch', labels.watch)}
              {canCancel ? (
                cancelling ? (
                  // Red cancels the booking: said once more before it happens.
                  <div className="mt-1 rounded-lg bg-[#fdecec] p-2">
                    <input type="hidden" name="confirmed" value="1" />
                    <p className="mb-2 px-0.5 text-[0.8rem] font-semibold text-[#9b1c1c]">{t('Buchung stornieren?', 'Cancel the booking?')}</p>
                    <div className="flex gap-1.5">
                      <button
                        type="submit"
                        name="light"
                        value="no"
                        className="inline-flex h-8 items-center rounded-lg bg-[#c03434] px-3 text-[0.8rem] font-semibold text-white hover:bg-[#a82b2b]"
                      >
                        {t('Stornieren', 'Cancel booking')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelling(false)}
                        className="inline-flex h-8 items-center rounded-lg px-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] hover:bg-ws-sunk"
                      >
                        {t('Abbrechen', 'Back')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setCancelling(true)} className={row}>
                    <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', LIGHT_TONE.no.dot)} />
                    <span className="min-w-0 flex-1 truncate">{labels.no}</span>
                  </button>
                )
              ) : null}
            </form>
          </div>
        </Floating>
      ) : null}
    </>
  );
}

const row =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.84rem] font-medium text-[var(--casa-ink)] transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]';
