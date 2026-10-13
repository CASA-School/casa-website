import { NewOffer } from '@/components/admin/offers/new-offer';
import { requireModule } from '@/lib/admin/guard';
import { findRecipients } from '@/lib/admin/offers/repo';

/**
 * A new offer starts with one question: who is it for. An organisation that
 * had offers before brings its address and contact; a group enquiry brings
 * the group; a student brings the learner. docs/OFFERS.md.
 */
export default async function NewOfferPage() {
  await requireModule('offers', 'edit');
  const suggestions = await findRecipients('');
  return <NewOffer suggestions={suggestions} />;
}
