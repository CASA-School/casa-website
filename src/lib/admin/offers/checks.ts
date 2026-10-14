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
  // Every message in both languages, German first: the workspace shows the colleague's (docs/ADMIN_I18N.md).
  const problem = (field: string, de: string, en: string) => out.push({ level: 'problem', field, message: { de, en } });
  const hint = (field: string, de: string, en: string) => out.push({ level: 'hint', field, message: { de, en } });

  if (!draft.recipientName.trim()) problem('recipient', 'Kein Empfänger', 'No recipient');
  if (!draft.contactEmail.trim()) hint('recipient', 'Keine E-Mail-Adresse', 'No email address');
  if (!draft.title.trim()) problem('title', 'Kein Titel', 'No title');

  if (draft.kind === 'group') {
    if (!draft.participants) problem('participants', 'Die Zahl der Teilnehmenden fehlt', 'Number of participants missing');
    const { weeks, fromDates } = measure(draft);
    const sold = packageWeeks(draft.stay.choices.package);
    if (sold != null && fromDates && weeks !== sold) {
      hint(
        'package',
        `Das Paket hat ${sold} ${sold === 1 ? 'Woche' : 'Wochen'}, die Daten ${weeks}`,
        `The package is ${sold} ${sold === 1 ? 'week' : 'weeks'}, the dates ${weeks}`
      );
    }
    if (draft.stay.choices.package === 'esel' && weeks > 4) problem('package', 'Esel hat Preise nur bis vier Wochen', 'Esel is priced up to four weeks');
    if (draft.stay.choices.package === 'esel' && activitiesOf(draft.stay.choices).length > activityAllowance(weeks)) {
      hint('programme', 'Mehr als fünf Aktivitäten pro Woche', `More than five activities a week`);
    }
    if (draft.escorts > 0 && draft.stay.choices.escortPricing === 'shared' && !draft.participants) {
      problem(
        'escorts',
        'Die Kosten der Begleitpersonen werden geteilt, aber es gibt keine Teilnehmenden, die sie teilen',
        'Escort costs shared, but no participants to share them'
      );
    }
    if (Boolean(draft.arrival) !== Boolean(draft.departure)) hint('dates', 'Nur eines der beiden Daten', 'Only one of the two dates');
  }

  const course = draft.kind === 'individual' ? draft.stay.choices.course : null;
  if (course) {
    const { start } = courseSpan(course);
    if (course.steps.some((s) => !s.start)) hint('course', 'Ein Niveau ohne geplanten Termin', 'A level without a planned term');
    if (start && start < today) hint('course', 'Der Kurs hat schon begonnen', 'The course has already started');
    if (start && draft.validUntil && draft.validUntil > start) hint('validity', 'Gültig bis nach Kursbeginn', 'Valid until after the course starts');
    if (course.accommodation && !(course.accommodation.from && course.accommodation.to)) problem('course', 'Unterkunft ohne Daten', 'Accommodation without dates');
    const extra = extraNights(course.accommodation);
    if (extra) {
      hint(
        'course',
        `${extra} ${extra === 1 ? 'Nacht' : 'Nächte'} über ganze Wochen hinaus, nicht berechnet`,
        `${extra} ${extra === 1 ? 'night' : 'nights'} of the stay beyond whole weeks, not priced`
      );
    }
  }

  if (lines.length === 0) problem('lines', 'Keine Preise auf dem Angebot', 'No prices on the offer');
  for (const line of lines) {
    const escort = line.audience === 'escort';
    const who = { de: escort ? ' (Begleitperson)' : '', en: escort ? ' (escort)' : '' };
    if (!line.description.trim()) problem('lines', `Eine Zeile ohne Text${who.de}`, `A line without text${who.en}`);
    if (line.included) continue;
    if (line.unitAmount == null) problem('lines', `Kein Preis für „${line.description}“${who.de}`, `No price for “${line.description}”${who.en}`);
    else if (line.listUnitAmount != null && line.unitAmount !== line.listUnitAmount) {
      hint(
        'lines',
        `„${line.description}“${who.de}: ${eur(line.unitAmount)} statt ${eur(line.listUnitAmount)}`,
        `“${line.description}”${who.en}: ${eur(line.unitAmount)} instead of ${eur(line.listUnitAmount)}`
      );
    }
  }

  if (!draft.validUntil) hint('validity', 'Kein Gültigkeitsdatum', 'No validity date');
  else if (draft.validUntil < today) problem('validity', 'Das Gültigkeitsdatum ist vorbei', 'The validity date has passed');
  else if (draft.arrival && draft.validUntil > draft.arrival) hint('validity', 'Gültig bis nach der Anreise', 'Valid until after the arrival');

  if (draft.arrival && draft.arrival < today) hint('dates', 'Die Anreise liegt in der Vergangenheit', 'Arrival is in the past');

  return out;
}

export const hasProblems = (checks: OfferCheck[]) => checks.some((c) => c.level === 'problem');
