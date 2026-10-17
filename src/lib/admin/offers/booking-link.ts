import type { OfferDraft, OfferStatus } from './types';

/**
 * Where an accepted offer to a learner leads (2026-10-17): the learner's booking wizard on their
 * page (`?book=1`), starting at the offer's course — its first start (`cohort`) and level — when the
 * offer has one. The wizard drops a start it no longer offers. A booking keeps no link to the offer
 * (there is no column for it); the offer stays „Angenommen" under the learner's name. Pure.
 */
export function offerBookingHref(offer: { status: OfferStatus; personId: string | null; draft: Pick<OfferDraft, 'stay'> }): string | null {
  if (offer.status !== 'accepted' || !offer.personId) return null;
  const step = offer.draft.stay.choices.course?.steps[0];
  const at = new URLSearchParams({ book: '1' });
  if (step?.termId) {
    at.set('cohort', step.termId);
    if (step.level) at.set('level', step.level);
  }
  return `/admin/people/${offer.personId}?${at.toString()}`;
}
