import { z } from 'zod';

import { LETTER_KINDS, LETTER_SCHEMA, type Letter } from './types';

/**
 * A stored letter, read back. Pure.
 *
 * `letters.document` is kept for years, while the shape the sheet renders
 * moves on. A document is checked against the shape of its `schema` number and
 * refused when it does not fit, so the sheet is never handed a letter with a
 * part missing — that is how a sent offer once crashed the letter tab, when
 * its stored copy predated a field the sheet had started to read.
 */

const Text = z.string().max(5000);

const PartSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), slot: z.string().max(40).nullable(), text: Text, strong: z.boolean() }),
  z.object({ type: z.literal('heading'), text: Text, detail: Text.nullable() }),
  z.object({
    type: z.literal('table'),
    heading: Text.nullable(),
    rows: z.array(z.object({ text: Text, amount: z.string().max(40).nullable(), ref: z.string().max(80).nullable() })).max(200),
    total: z.object({ label: Text, amount: z.string().max(40).nullable() }).nullable(),
  }),
  z.object({ type: z.literal('sum'), label: Text, amount: z.string().max(40) }),
]);

const LetterSchema = z.object({
  schema: z.literal(LETTER_SCHEMA),
  kind: z.enum(LETTER_KINDS),
  language: z.enum(['de', 'en']),
  returnAddress: Text,
  recipient: z.array(Text).max(20),
  placeDate: Text,
  subject: z.object({ lead: Text, title: Text, tail: Text.nullable() }),
  salutation: Text,
  body: z.array(PartSchema).max(100),
  signOff: Text,
  signature: z.array(Text).max(10),
  footer: z.array(Text).max(10),
});

export function readLetter(value: unknown): Letter | null {
  const parsed = LetterSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
