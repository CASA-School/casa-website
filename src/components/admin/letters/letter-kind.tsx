import type { ReactNode } from 'react';

import { Icon } from '@/components/admin/icons';
import { TINTS, type Tint } from '@/components/admin/ui';
import type { LetterKind } from '@/lib/admin/letters/types';
import { cn } from '@/lib/utils';

/**
 * Each kind of letter's mark (2026-10-17): an icon for what it does, a colour for its stage — blue
 * the registration, green money, sun before the course or the exam and the waiting list, ink the
 * confirmations after it, red a cancellation. The same mark wherever a letter is listed: the letter
 * page's switcher, a booking's and a person's letters, the sent letter.
 */
export const LETTER_KIND_LOOK: Record<LetterKind, { icon: ReactNode; tint: Tint }> = {
  offer: { icon: Icon.offers, tint: 'blue' },
  booking_confirmation: { icon: Icon.check, tint: 'blue' },
  missing_items: { icon: Icon.attention, tint: 'blue' },
  payment_receipt: { icon: Icon.money, tint: 'green' },
  payment_reminder: { icon: Icon.clock, tint: 'green' },
  payments_overview: { icon: Icon.statement, tint: 'green' },
  visa_letter: { icon: Icon.globe, tint: 'sun' },
  showup_first_call: { icon: Icon.flag, tint: 'sun' },
  showup_last_call: { icon: Icon.attention, tint: 'sun' },
  course_start: { icon: Icon.calendar, tint: 'sun' },
  enrolment_certificate: { icon: Icon.award, tint: 'ink' },
  cancellation_confirmation: { icon: Icon.close, tint: 'red' },
  exam_confirmation: { icon: Icon.check, tint: 'blue' },
  exam_invitation: { icon: Icon.calendar, tint: 'sun' },
  exam_results: { icon: Icon.placement, tint: 'ink' },
  exam_participation: { icon: Icon.award, tint: 'ink' },
  waitlist_confirmation: { icon: Icon.clock, tint: 'sun' },
  waitlist_place_free: { icon: Icon.check, tint: 'green' },
  waitlist_no_place: { icon: Icon.close, tint: 'red' },
  learner_confirmation: { icon: Icon.bookings, tint: 'blue' },
  registration_test_request: { icon: Icon.placement, tint: 'blue' },
  registration_deposit_request: { icon: Icon.money, tint: 'green' },
  registration_later_course: { icon: Icon.calendar, tint: 'sun' },
  participation_certificate: { icon: Icon.award, tint: 'ink' },
  schoolman: { icon: Icon.mail, tint: 'ink' },
};

/** A letter kind's mark: its icon on its stage's colour. */
export function LetterKindIcon({ kind, size = 'sm', className }: { kind: LetterKind; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const look = LETTER_KIND_LOOK[kind];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center',
        size === 'lg' ? 'h-11 w-11 rounded-2xl [&_svg]:h-5 [&_svg]:w-5' : size === 'md' ? 'h-8 w-8 rounded-xl [&_svg]:h-4 [&_svg]:w-4' : 'h-7 w-7 rounded-lg [&_svg]:h-3.5 [&_svg]:w-3.5',
        TINTS[look.tint],
        className
      )}
    >
      {look.icon}
    </span>
  );
}

/** A letter that cannot go out yet: a small padlock, the reason on hover. */
export const LOCK = <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{Icon.lock}</span>;

/** "12. Okt." · "12 Oct": the day a letter went, in the switcher and the lists. */
export const sentDay = (iso: string, lang: 'de' | 'en') => new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' });
