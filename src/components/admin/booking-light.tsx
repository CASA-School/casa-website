import type { ReactNode } from 'react';

import type { BookingLight } from '@/lib/admin/bookings';
import { cn } from '@/lib/utils';

/**
 * A booking's colour, as the team knows it from SchoolMan (docs/schoolman/bookings.md): green all
 * good, yellow under observation, grey unclear (not paid in full), red cancelled. A pill in a record's
 * head, a dot and its word in a list. The words come from the page, in the reader's language.
 */
const TONE: Record<BookingLight, { pill: string; dot: string; text: string }> = {
  ok: { pill: 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]', dot: 'bg-[#1f9d55]', text: 'text-[#14653a]' },
  watch: { pill: 'bg-[#fff2d6] text-[#6e4700] ring-[#ebd298]', dot: 'bg-[#d99a00]', text: 'text-[#6e4700]' },
  unclear: { pill: 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]', dot: 'bg-[#8792a3]', text: 'text-[#3c4657]' },
  no: { pill: 'bg-[#fdecec] text-[#9b1c1c] ring-[#f3c4c4]', dot: 'bg-[#d14343]', text: 'text-[#9b1c1c]' },
};

export function BookingLightPill({ light, label, detail }: { light: BookingLight; label: string; detail?: ReactNode }) {
  return (
    <span
      data-light={light}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.76rem] font-semibold whitespace-nowrap ring-1 ring-inset', TONE[light].pill)}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', TONE[light].dot)} />
      {label}
      {detail ? <span className="font-medium opacity-80">· {detail}</span> : null}
    </span>
  );
}

export function BookingLightLabel({ light, label, detail }: { light: BookingLight; label: string; detail?: string }) {
  return (
    <span data-light={light} className="inline-flex min-w-0 items-center gap-2 text-[0.82rem]">
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', TONE[light].dot)} />
      <span className={cn('truncate font-semibold', TONE[light].text)}>{label}</span>
      {detail ? <span className="truncate text-[var(--casa-muted)]">{detail}</span> : null}
    </span>
  );
}

/** Just the dot, beside a name on a phone where the column is hidden. */
export function BookingLightDot({ light, label }: { light: BookingLight; label: string }) {
  return <span role="img" aria-label={label} title={label} className={cn('inline-block size-2 shrink-0 rounded-full', TONE[light].dot)} />;
}
