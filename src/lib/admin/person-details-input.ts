import { z } from 'zod';

import { EMAIL_KINDS, PHONE_KINDS } from './contact-labels';

const text = (max: number) => z.string().trim().max(max);
const contact = { id: z.uuid().nullable(), primary: z.boolean(), remove: z.boolean() };
const address = z.object({ street: text(160), postcode: text(20), city: text(120), country: text(120) });

/** The complete editor payload; missing contact rows never mean deletion. */
export const PersonDetailsInput = z.object({
  personId: z.uuid(),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  person: z.object({
    firstName: text(80).min(1), lastName: text(80),
    salutation: z.enum(['', 'ms', 'mr', 'mx', 'neutral']),
    birthDate: z.union([z.literal(''), z.iso.date()]), nationality: text(120),
    secondLastName: text(80), nickname: text(60), birthYear: z.string().regex(/^\d{4}$|^$/),
    birthPlace: text(120), birthCountry: text(120), motherTongue: text(80),
    occupation: text(120), passportNumber: text(40),
  }),
  emails: z.array(z.object({ ...contact, address: text(200), kind: z.enum(EMAIL_KINDS), note: text(120) }).refine(e => Boolean(e.id) || e.remove || z.email().safeParse(e.address).success)).max(200),
  phones: z.array(z.object({ ...contact, number: text(60), kind: z.enum(PHONE_KINDS) }).refine(p => Boolean(p.id) || p.remove || p.number.replace(/\D/g, '').length >= 5)).max(200),
  addresses: z.object({ local: address, home: address }),
}).refine(v => v.emails.filter(e => e.primary && !e.remove).length <= 1 && v.phones.filter(p => p.primary && !p.remove).length <= 1);

export type PersonDetailsValues = z.infer<typeof PersonDetailsInput>;
export type PersonDetailsResult = { ok: true } | { ok: false; error: string };
