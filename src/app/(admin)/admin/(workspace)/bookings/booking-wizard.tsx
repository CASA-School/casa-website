import { learnerHistory } from '@/lib/admin/offers/course-catalogue';

import { BookingWizardClient, type BookingWizardProps } from './booking-wizard-client';

/**
 * The booking wizard, with what CASA knows of the learner: the enrolment fee is charged once, at the
 * first registration (FileMaker: once per learner, ever), so its tick starts unticked for a learner
 * who studied here before — the offers' own rule (`learnerHistory`). The wizard is the client half.
 */
export async function BookingWizard(props: Omit<BookingWizardProps, 'studiedBefore'>) {
  const history = await learnerHistory(props.personId).catch(() => null);
  return <BookingWizardClient {...props} studiedBefore={history?.studiedBefore ?? false} />;
}
