import type { ReactNode } from 'react';

import type { BookingLight } from '@/lib/admin/bookings';
import { cn } from '@/lib/utils';

/**
 * A booking's colour, as the team knows it from SchoolMan (docs/schoolman/bookings.md): green all
 * good, yellow under observation, grey unclear (not paid in full), red cancelled. A pill in a record's
 * head, a dot in a list with its word on hover (2026-10-18); `BookingLightMenu` changes it. The words
 * come from the page, in the reader's language.
 */
export const LIGHT_TONE: Record<BookingLight, { pill: string; dot: string; text: string }> = {
  ok: { pill: 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]', dot: 'bg-[#1f9d55]', text: 'text-[#14653a]' },
  watch: { pill: 'bg-[#fff2d6] text-[#6e4700] ring-[#ebd298]', dot: 'bg-[#d99a00]', text: 'text-[#6e4700]' },
  unclear: { pill: 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]', dot: 'bg-[#8792a3]', text: 'text-[#3c4657]' },
  no: { pill: 'bg-[#fdecec] text-[#9b1c1c] ring-[#f3c4c4]', dot: 'bg-[#d14343]', text: 'text-[#9b1c1c]' },
};

export function BookingLightPill({ light, label, detail }: { light: BookingLight; label: string; detail?: ReactNode }) {
  return (
    <span
      data-light={light}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.76rem] font-semibold whitespace-nowrap ring-1 ring-inset', LIGHT_TONE[light].pill)}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', LIGHT_TONE[light].dot)} />
      {label}
      {detail ? <span className="font-medium opacity-80">· {detail}</span> : null}
    </span>
  );
}

/**
 * Just the colour, its word on hover (Rahman, 2026-10-18: the team reads the colours, not the words): in
 * lists, and beside a name on a phone where the column is hidden.
 */
export function BookingLightDot({ light, label, size = 'sm' }: { light: BookingLight; label: string; size?: 'sm' | 'md' }) {
  return (
    <span
      role="img"
      data-light={light}
      aria-label={label}
      title={label}
      className={cn('inline-block shrink-0 rounded-full', size === 'md' ? 'size-3 ring-2 ring-white' : 'size-2', LIGHT_TONE[light].dot)}
    />
  );
}
