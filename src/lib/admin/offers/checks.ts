/**
 * What is wrong with an offer before it goes out. Pure.
 *
 * A `problem` stops the offer from being marked as sent; a `hint` is shown and
 * does not. Each rule is a FileMaker defect that reached a customer: offer
 * 37622 went out three times with no lines and "Niveau: " in its subject,
 * letters carried prices nobody had checked against the price list, and none
 * said how long they were valid.
 */

import { courseSpan, extraNights } from './course';
import { activitiesOf, activityAllowance, measure, packageWeeks } from './engine';
import type { OfferCheck, OfferDraft, OfferLine } from './types';

const eur = (n: number) => `${n.toFixed(2).replace(/\.00$/, '')} €`;

export function offerChecks(draft: OfferDraft, lines: OfferLine[], today: string): OfferCheck[] {
  const out: OfferCheck[] = [];
  const problem = (field: string, message: string) => out.push({ level: 'problem', field, message });
  const hint = (field: string, message: string) => out.push({ level: 'hint', field, message });

  if (!draft.recipientName.trim()) problem('recipient', 'No recipient');
  if (!draft.contactEmail.trim()) hint('recipient', 'No email address');
  if (!draft.title.trim()) problem('title', 'No title');

  if (draft.kind === 'group') {
    if (!draft.participants) problem('participants', 'Number of participants missing');
    const { weeks, fromDates } = measure(draft);
    const sold = packageWeeks(draft.stay.choices.package);
    if (sold != null && fromDates && weeks !== sold) hint('package', `The package is ${sold} ${sold === 1 ? 'week' : 'weeks'}, the dates ${weeks}`);
    if (draft.stay.choices.package === 'esel' && weeks > 4) problem('package', 'Esel is priced up to four weeks');
    if (draft.stay.choices.package === 'esel' && activitiesOf(draft.stay.choices).length > activityAllowance(weeks)) {
      hint('programme', `More than five activities a week`);
    }
    if (draft.escorts > 0 && draft.stay.choices.escortPricing === 'shared' && !draft.participants) {
      problem('escorts', 'Escort costs shared, but no participants to share them');
    }
    if (Boolean(draft.arrival) !== Boolean(draft.departure)) hint('dates', 'Only one of the two dates');
  }

  const course = draft.kind === 'individual' ? draft.stay.choices.course : null;
  if (course) {
    const { start } = courseSpan(course);
    if (course.steps.some((s) => !s.start)) hint('course', 'A level without a planned term');
    if (start && start < today) hint('course', 'The course has already started');
    if (start && draft.validUntil && draft.validUntil > start) hint('validity', 'Valid until after the course starts');
    if (course.accommodation && !(course.accommodation.from && course.accommodation.to)) problem('course', 'Accommodation without dates');
    const extra = extraNights(course.accommodation);
    if (extra) hint('course', `${extra} ${extra === 1 ? 'night' : 'nights'} of the stay beyond whole weeks, not priced`);
  }

  if (lines.length === 0) problem('lines', 'No prices on the offer');
  for (const line of lines) {
    const who = line.audience === 'escort' ? ' (escort)' : '';
    if (!line.description.trim()) problem('lines', `A line without text${who}`);
    if (line.included) continue;
    if (line.unitAmount == null) problem('lines', `No price for “${line.description}”${who}`);
    else if (line.listUnitAmount != null && line.unitAmount !== line.listUnitAmount) {
      hint('lines', `“${line.description}”${who}: ${eur(line.unitAmount)} instead of ${eur(line.listUnitAmount)}`);
    }
  }

  if (!draft.validUntil) hint('validity', 'No validity date');
  else if (draft.validUntil < today) problem('validity', 'The validity date has passed');
  else if (draft.arrival && draft.validUntil > draft.arrival) hint('validity', 'Valid until after the arrival');

  if (draft.arrival && draft.arrival < today) hint('dates', 'Arrival is in the past');

  return out;
}

export const hasProblems = (checks: OfferCheck[]) => checks.some((c) => c.level === 'problem');
