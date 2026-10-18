import { setBookingLightAction } from './actions';
import { BookingLightDot, BookingLightPill } from '@/components/admin/booking-light';
import { BookingLightMenu } from '@/components/admin/booking-light-menu';
import { BOOKING_LIGHT_LABELS, bookingLight, bookingLightLabel, type BookingStatus, type ObservationReason } from '@/lib/admin/bookings';
import { pick, type WsLang } from '@/lib/admin/i18n';

/**
 * A booking's colour where it is seen (2026-10-18): for whoever may edit bookings, the dot — or the
 * pill in the booking's own head — opens SchoolMan's three choices (`BookingLightMenu`): in order, under
 * observation, and cancelled for whoever may cancel. For everyone else, and for a cancelled booking, it
 * is the colour alone, its word on hover.
 */
export function BookingColour({
  booking,
  lang,
  canEdit,
  canCancel,
  variant = 'dot',
  detail,
}: {
  booking: { id: string; status: BookingStatus; observationReason: ObservationReason | null; charged: number; paid: number };
  lang: WsLang;
  canEdit: boolean;
  canCancel: boolean;
  variant?: 'dot' | 'pill';
  /** What goes with the word in the booking's head: the money open, a credit. */
  detail?: string;
}) {
  const light = bookingLight(booking);
  const label = pick(lang, bookingLightLabel(booking));
  if (!canEdit || light === 'no') {
    return variant === 'pill' ? <BookingLightPill light={light} label={label} detail={detail} /> : <BookingLightDot light={light} label={label} size="md" />;
  }
  return (
    <BookingLightMenu
      bookingId={booking.id}
      light={light}
      label={label}
      detail={detail}
      labels={{ ok: pick(lang, BOOKING_LIGHT_LABELS.ok), watch: pick(lang, BOOKING_LIGHT_LABELS.watch), no: pick(lang, BOOKING_LIGHT_LABELS.no) }}
      canCancel={canCancel}
      action={setBookingLightAction}
      variant={variant}
    />
  );
}
