import { NewOffer } from '@/components/admin/offers/new-offer';
import { requireModule } from '@/lib/admin/guard';
import { courseCatalogue } from '@/lib/admin/offers/course-catalogue';
import { findRecipients, wizardStart } from '@/lib/admin/offers/recipients';
import { editorOptions, priceListOptions } from '@/lib/admin/offers/repo';
import { todayInputValue } from '@/lib/dates';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (v: string | undefined) => (v && UUID.test(v) ? v : undefined);

/**
 * A new offer: the wizard. Opened from an enquiry (`?enquiry=`), a learner
 * (`?person=`) or an organisation (`?organisation=`), it starts with that
 * recipient filled in. docs/OFFERS.md §New offer.
 */
export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ enquiry?: string; person?: string; organisation?: string }>;
}) {
  const [actor, sp] = await Promise.all([requireModule('offers', 'edit'), searchParams]);
  const from = { enquiryId: id(sp.enquiry), personId: id(sp.person), organisationId: id(sp.organisation) };
  const [start, suggestions, priceList, options, catalogue] = await Promise.all([
    from.enquiryId || from.personId || from.organisationId ? wizardStart(from) : Promise.resolve(null),
    findRecipients('', 'all'),
    priceListOptions(),
    editorOptions(),
    courseCatalogue(),
  ]);
  return (
    <NewOffer
      start={start}
      suggestions={suggestions}
      priceList={priceList}
      catalogue={catalogue}
      staff={options.staff}
      countries={options.countries}
      me={actor.id}
      today={todayInputValue()}
    />
  );
}
