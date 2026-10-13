/**
 * Changes to a draft, as pure functions — the builder and the letter make the
 * same ones (a line's text is changed in the builder's list or on the letter
 * itself), so both call these.
 */

import { overrideKey, type Audience, type ManualLine, type OfferDraft, type OfferLine, type StayChoices } from './types';

export function setChoices(d: OfferDraft, patch: Partial<StayChoices>): OfferDraft {
  return { ...d, stay: { ...d.stay, choices: { ...d.stay.choices, ...patch } } };
}

function setOverride(d: OfferDraft, line: Pick<OfferLine, 'audience' | 'key' | 'listUnitAmount'>, patch: { unitAmount?: number | null; description?: string | null }): OfferDraft {
  const key = overrideKey(line.audience, line.key);
  const current = { ...(d.stay.overrides[key] ?? {}) };
  if ('unitAmount' in patch) {
    if (patch.unitAmount == null || patch.unitAmount === line.listUnitAmount) delete current.unitAmount;
    else current.unitAmount = patch.unitAmount;
  }
  if ('description' in patch) {
    if (patch.description == null || !patch.description.trim()) delete current.description;
    else current.description = patch.description;
  }
  const overrides = { ...d.stay.overrides };
  if (current.unitAmount == null && current.description == null) delete overrides[key];
  else overrides[key] = current;
  return { ...d, stay: { ...d.stay, overrides } };
}

function setManual(d: OfferDraft, key: string, patch: Partial<ManualLine>): OfferDraft {
  return { ...d, stay: { ...d.stay, manual: d.stay.manual.map((m) => (m.key === key ? { ...m, ...patch } : m)) } };
}

const isManual = (key: string) => key.startsWith('manual:');

/** A line's text, wherever it is changed. An empty text returns a computed line to its own. */
export function setLineText(d: OfferDraft, line: Pick<OfferLine, 'audience' | 'key' | 'listUnitAmount'>, text: string): OfferDraft {
  return isManual(line.key) ? setManual(d, line.key, { description: text }) : setOverride(d, line, { description: text });
}

/** A line's price. On a computed line, the list price itself (or nothing) means "the price list". */
export function setLinePrice(d: OfferDraft, line: Pick<OfferLine, 'audience' | 'key' | 'listUnitAmount'>, price: number | null): OfferDraft {
  return isManual(line.key) ? setManual(d, line.key, { unitAmount: price }) : setOverride(d, line, { unitAmount: price });
}

export function setLineQuantity(d: OfferDraft, key: string, quantity: number): OfferDraft {
  return setManual(d, key, { quantity });
}

/** Back to what the price list and the builder say. */
export function resetLine(d: OfferDraft, line: Pick<OfferLine, 'audience' | 'key' | 'listUnitAmount'>): OfferDraft {
  return setOverride(d, line, { unitAmount: null, description: null });
}

let counter = 0;
export const newManualKey = () => `manual:${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function addLine(d: OfferDraft, line: Omit<ManualLine, 'key'>): OfferDraft {
  return { ...d, stay: { ...d.stay, manual: [...d.stay.manual, { ...line, key: newManualKey() }] } };
}

export function removeLine(d: OfferDraft, key: string): OfferDraft {
  return { ...d, stay: { ...d.stay, manual: d.stay.manual.filter((m) => m.key !== key) } };
}

export function moveLineTo(d: OfferDraft, key: string, audience: Audience): OfferDraft {
  return setManual(d, key, { audience });
}
