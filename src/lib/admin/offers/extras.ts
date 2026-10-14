/**
 * What a group often wants on top of a package, offered as a line to add.
 * Pure.
 *
 * Texts only: none of these has a price in the groups page's sheets, so the
 * line arrives without one and the offer cannot be sent until somebody types
 * it (`checks.ts`). A reduction is typed as a positive amount and stored as a
 * negative one.
 */

import type { Bilingual } from '../i18n';

/** `label` is the menu's, in the workspace's language; `de` and `en` are the line's text on the letter. */
export type ExtraPreset = { label: Bilingual; chargeType: string; de: string; en: string };

export const GROUP_EXTRAS: ExtraPreset[] = [
  { label: { de: 'Flughafentransfer', en: 'Airport transfer' }, chargeType: 'transfer', de: 'Flughafentransfer (Hin- und Rückfahrt)', en: 'Airport transfer (both ways)' },
  { label: { de: 'Einzelzimmerzuschlag', en: 'Single room supplement' }, chargeType: 'accommodation_rent', de: 'Einzelzimmerzuschlag', en: 'Single room supplement' },
  { label: { de: 'Zusätzliche Nacht', en: 'Extra night' }, chargeType: 'extra_nights', de: 'Zusätzliche Nacht in der Gastfamilie', en: 'Extra night with the host family' },
  { label: { de: 'Zusätzlicher Unterricht', en: 'Extra lessons' }, chargeType: 'tuition', de: 'Zusätzlicher Unterricht', en: 'Extra lessons' },
];

export const REDUCTION: ExtraPreset = { label: { de: 'Ermäßigung', en: 'Reduction' }, chargeType: 'discount', de: 'Ermäßigung', en: 'Reduction' };

/** A line that takes money off: shown and typed as a positive amount, stored as a negative one. */
export const isCredit = (chargeType: string) => chargeType === 'discount';
