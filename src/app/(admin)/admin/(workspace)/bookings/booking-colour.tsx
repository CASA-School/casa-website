import { setBookingLightAction } from './actions';
import { BookingLightDot, BookingLightPill } from '@/components/admin/booking-light';
import { BookingLightMenu } from '@/components/admin/booking-light-menu';
import { bookingLight, bookingLightLabel, OBSERVATION_REASON_LABELS, OBSERVATION_REASONS, type BookingStatus, type ObservationReason } from '@/lib/admin/bookings';
import { pick, type WsLang } from '@/lib/admin/i18n';

/**
 * A booking's colour where it is seen (2026-10-18): for whoever may edit bookings, the dot — or the
 * pill in the booking's own head — opens the colours to choose from (`BookingLightMenu`); for everyone
 * else, and for a cancelled booking, it is the colour alone, its word on hover.
 */
export function BookingColour({
  booking,
  lang,
  canEdit,
  variant = 'dot',
  detail,
}: {
  booking: { id: string; status: BookingStatus; observationReason: ObservationReason | null; charged: number; paid: number };
  lang: WsLang;
  canEdit: boolean;
  variant?: 'dot' | 'pill';
  /** What goes with the word; the reason of an observation by default. */
  detail?: string;
}) {
  const light = bookingLight(booking);
  const label = pick(lang, bookingLightLabel(booking));
  const said = detail ?? (light === 'watch' && booking.observationReason ? pick(lang, OBSERVATION_REASON_LABELS[booking.observationReason]) : undefined);
  if (!canEdit || light === 'no') {
    return variant === 'pill' ? (
      <BookingLightPill light={light} label={label} detail={said} />
    ) : (
      <BookingLightDot light={light} label={said ? `${label} · ${said}` : label} size="md" />
    );
  }
  // What the booking shows once nobody is watching it: the money's own colour and word.
  const plain = { ...booking, observationReason: null };
  return (
    <BookingLightMenu
      bookingId={booking.id}
      light={light}
      label={label}
      detail={said}
      plain={{ light: bookingLight(plain) === 'ok' ? 'ok' : 'unclear', label: pick(lang, bookingLightLabel(plain)) }}
      reason={booking.observationReason}
      reasons={OBSERVATION_REASONS.map((value) => ({ value, label: pick(lang, OBSERVATION_REASON_LABELS[value]) }))}
      action={setBookingLightAction}
      variant={variant}
    />
  );
}
