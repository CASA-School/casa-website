'use client';

import { useEffect, useRef, useState } from 'react';

import type { BookingLight, ObservationReason } from '@/lib/admin/bookings';
import { cn } from '@/lib/utils';

import { LIGHT_TONE } from './booking-light';
import { Floating } from './floating';
import { Icon } from './icons';
import { useWsLang } from './lang';

/**
 * A booking's colour, changed where it is seen (Rahman, 2026-10-18: "play with colors and dropdown …
 * instead of the whole word, the staff is used to the colors"). The dot — or, in the booking's own head,
 * the pill — opens the colours SchoolMan's team knows: the money's own (green when paid in full, grey
 * until then), or yellow with its reason. Red is a cancellation, which has its own way on the booking's
 * page; a cancelled booking shows its dot and opens nothing.
 *
 * The panel floats above the page (`Floating`), so the card it sits in cannot cut it off, and holds its
 * own form: choosing posts `light` — `plain` or `watch:<reason>` — to the action, which revalidates.
 * „Sonstiges" asks for a short note first, as the booking's own form always has.
 */
export function BookingLightMenu({
  bookingId,
  light,
  label,
  detail,
  plain,
  reason,
  reasons,
  action,
  variant = 'dot',
}: {
  bookingId: string;
  light: BookingLight;
  /** The colour's word, and what goes with it („Niveau", „1.200 € offen"), in the reader's language. */
  label: string;
  detail?: string;
  /** The booking's colour without an observation: what the money says. */
  plain: { light: Extract<BookingLight, 'ok' | 'unclear'>; label: string };
  reason: ObservationReason | null;
  reasons: readonly { value: ObservationReason; label: string }[];
  action: (formData: FormData) => Promise<void>;
  variant?: 'dot' | 'pill';
}) {
  const { t } = useWsLang();
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState(false);
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

  // Red is not chosen here, so a cancelled booking only shows its colour.
  if (light === 'no') {
    return (
      <span role="img" data-light={light} aria-label={said} title={said} className="inline-flex">
        {face}
      </span>
    );
  }

  const option = (value: string, tone: BookingLight, text: string, current: boolean) =>
    current ? (
      <button key={value} type="button" aria-pressed="true" onClick={() => setOpen(false)} className={cn(row, 'bg-[var(--ws-head)]')}>
        <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', LIGHT_TONE[tone].dot)} />
        <span className="min-w-0 flex-1 truncate">{text}</span>
        <span aria-hidden="true" className="text-[var(--fm-navy)] [&_svg]:size-4">
          {Icon.check}
        </span>
      </button>
    ) : (
      <button key={value} type="submit" name="light" value={value} aria-pressed="false" formNoValidate className={row}>
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
          setOther(false);
          setOpen((v) => !v);
        }}
        className="relative z-10 rounded-full transition-colors outline-none hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
      >
        {face}
      </button>
      {open ? (
        <Floating anchor={anchor} panelRef={panel} role="dialog" label={t('Farbe der Buchung', 'Booking colour')} estimate={300}>
          <div className="w-[264px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white text-sm shadow-[0_24px_56px_-22px_rgba(15,23,42,0.42),0_0_0_1px_rgba(15,23,42,0.08)]">
            <p className="border-b border-ws-line-soft px-3.5 py-2.5 text-xs font-bold text-[var(--casa-muted)]">{t('Farbe der Buchung', 'Booking colour')}</p>
            <form action={action} onSubmit={() => setTimeout(() => setOpen(false), 0)} className="p-1.5">
              <input type="hidden" name="bookingId" value={bookingId} />
              {option('plain', plain.light, plain.label, light !== 'watch')}
              <p className="mt-1.5 flex items-center gap-2 px-2.5 pt-1 pb-0.5 text-[0.72rem] font-bold text-[var(--casa-muted)]">{t('Unter Beobachtung', 'Under observation')}</p>
              {reasons
                .filter((r) => r.value !== 'other')
                .map((r) => option(`watch:${r.value}`, 'watch', r.label, light === 'watch' && reason === r.value))}
              {other ? (
                <div className="mt-1 rounded-lg bg-[#fff8e6] p-2">
                  <label htmlFor={`observation-note-${bookingId}`} className="mb-1 flex items-center gap-2 text-[0.8rem] font-semibold text-[var(--casa-ink)]">
                    <span aria-hidden="true" className={cn('size-2.5 rounded-full', LIGHT_TONE.watch.dot)} />
                    {reasons.find((r) => r.value === 'other')?.label}
                  </label>
                  <textarea
                    id={`observation-note-${bookingId}`}
                    name="note"
                    required
                    rows={2}
                    maxLength={300}
                    autoFocus
                    className="w-full rounded-md border border-ws-line-firm bg-white px-2 py-1.5 text-[0.84rem] outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                  />
                  <button
                    type="submit"
                    name="light"
                    value="watch:other"
                    className="mt-1.5 inline-flex h-8 items-center rounded-lg bg-[var(--fm-navy)] px-3 text-[0.8rem] font-semibold text-white hover:opacity-90"
                  >
                    {t('Speichern', 'Save')}
                  </button>
                </div>
              ) : (
                // „Sonstiges" asks what first; when it is the reason already, the note can be said again.
                <button
                  type="button"
                  aria-pressed={light === 'watch' && reason === 'other'}
                  onClick={() => setOther(true)}
                  className={cn(row, light === 'watch' && reason === 'other' && 'bg-[var(--ws-head)]')}
                >
                  <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', LIGHT_TONE.watch.dot)} />
                  <span className="min-w-0 flex-1 truncate">{reasons.find((r) => r.value === 'other')?.label} …</span>
                  {light === 'watch' && reason === 'other' ? (
                    <span aria-hidden="true" className="text-[var(--fm-navy)] [&_svg]:size-4">
                      {Icon.check}
                    </span>
                  ) : null}
                </button>
              )}
            </form>
          </div>
        </Floating>
      ) : null}
    </>
  );
}

const row =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.84rem] font-medium text-[var(--casa-ink)] transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]';
