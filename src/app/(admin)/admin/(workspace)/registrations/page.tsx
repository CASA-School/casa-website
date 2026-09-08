import { redirect } from 'next/navigation';

/**
 * `/admin/registrations` has no screen of its own.
 *
 * Course and exam registrations are two queues with two tables and two shapes;
 * a combined list would be half empty columns, and a landing page that only
 * offers two links is a click that teaches nothing. The sidebar item goes
 * straight to the busier of the two, and the tab switcher on that screen gets
 * you to the other.
 */
export default function RegistrationsIndex() {
  redirect('/admin/registrations/course');
}
