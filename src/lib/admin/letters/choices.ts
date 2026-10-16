import { z } from 'zod';

import type { LetterChoices } from './booking-letters';

/**
 * A letter's choices as a form sends them: the language, which address, who signs, the texts
 * changed for this letter (JSON, by slot) and a receipt's payments. Checked here, so a crafted form
 * cannot put more than words into a letter. Pure.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Texts = z.record(z.string().regex(/^[a-z]{2,12}$/), z.string().max(2000)).refine((t) => Object.keys(t).length <= 12);

export function readChoices(formData: FormData): LetterChoices | null {
  let texts: unknown = {};
  try {
    texts = JSON.parse(String(formData.get('texts') ?? '{}'));
  } catch {
    return null;
  }
  const parsed = Texts.safeParse(texts);
  if (!parsed.success) return null;
  const language = formData.get('language') === 'en' ? 'en' : 'de';
  const address = String(formData.get('address') ?? 'home');
  const signatureId = String(formData.get('signatureId') ?? '');
  return {
    language,
    address: address === 'local' || address === 'none' ? address : 'home',
    signatureId: UUID.test(signatureId) ? signatureId : null,
    texts: parsed.data,
    paymentIds: formData
      .getAll('paymentIds')
      .map(String)
      .filter((value) => UUID.test(value)),
    items: formData
      .getAll('items')
      .map(String)
      .filter((value) => /^[a-z_]{2,20}$/.test(value)),
    bookingIds: formData
      .getAll('bookingIds')
      .map(String)
      .filter((value) => UUID.test(value)),
  };
}
