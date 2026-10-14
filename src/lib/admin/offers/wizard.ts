import { z } from 'zod';

import { CourseSchema, ISSUES } from './schema';
import { isIsoDate } from './stay';
import { ORGANISATION_KINDS, type OfferLanguage, type OrganisationKind, type PackageChoice, type Salutation } from './types';

/**
 * A new offer, as the wizard hands it over (docs/OFFERS.md §New offer).
 *
 * Four steps — who it is for, what it is, the group, the letter — and one
 * write: the recipient is found or created, the offer is filled from it, from
 * the enquiry it answers and from an earlier offer it repeats, in the same
 * transaction. Shapes and the schema only; the client builds this, the server
 * action checks it.
 */

const uuid = z.string().uuid();
const name = (max: number) => z.string().trim().max(max);
const email = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), ISSUES.email.en);
const country = z.string().regex(/^[A-Z]{2}$/).nullable();
const date = z
  .string()
  .nullable()
  .refine((v) => v == null || isIsoDate(v), ISSUES.date.en);

const ContactSchema = z.object({
  salutation: z.enum(['ms', 'mr', 'none']),
  firstName: name(120),
  lastName: name(120),
  email,
});

const RecipientSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('organisation'),
    id: uuid,
    /** One of its contacts, a new one, or nobody named. */
    contactId: uuid.nullable(),
    newContact: ContactSchema.nullable(),
  }),
  z.object({
    type: z.literal('new-organisation'),
    name: name(200).min(1, ISSUES.organisationName.en),
    kind: z.enum(ORGANISATION_KINDS),
    countryCode: country,
    address: z.string().max(400),
    contact: ContactSchema.nullable(),
  }),
  z.object({ type: z.literal('person'), id: uuid }),
  z.object({
    type: z.literal('new-person'),
    salutation: z.enum(['ms', 'mr', 'none']),
    firstName: name(120).min(1, ISSUES.firstName.en),
    lastName: name(120),
    email,
    countryCode: country,
  }),
]);

const LineSchema = z.object({
  chargeType: z.string().min(1).max(60),
  de: name(300),
  en: name(300),
  unitAmount: z.number().finite().min(-100_000).max(1_000_000).nullable(),
});

export const NewOfferSchema = z
  .object({
    recipient: RecipientSchema,
    enquiryId: uuid.nullable(),
    /** An earlier offer this one repeats: its package, group and prices. */
    basedOn: uuid.nullable(),
    kind: z.enum(['group', 'individual']),
    group: z
      .object({
        package: z.enum(['hahn', 'katze', 'hund', 'esel', 'own']),
        weeks: z.number().int().min(1).max(52),
        arrival: date,
        departure: date,
        participants: z.number().int().min(0).max(2000).nullable(),
        escorts: z.number().int().min(0).max(200),
      })
      .nullable(),
    /** A learner's course, built in the wizard from the catalogue (course.ts). */
    course: CourseSchema.nullable(),
    /** What an individual offer starts with besides, from the price list. */
    lines: z.array(LineSchema).max(10),
    language: z.enum(['de', 'en']),
    groupName: name(120),
    title: name(200),
    validUntil: date,
    ownerId: uuid.nullable(),
  })
  .refine((d) => !d.group?.arrival || !d.group.departure || d.group.departure > d.group.arrival, {
    message: ISSUES.departure.en,
    path: ['group', 'departure'],
  })
  .refine((d) => d.kind === 'individual' || (d.recipient.type !== 'person' && d.recipient.type !== 'new-person'), {
    message: ISSUES.learnerCourse.en,
    path: ['kind'],
  });

export type NewOfferInput = z.infer<typeof NewOfferSchema>;

/** The title a new offer starts with, until somebody writes another. */
export const DEFAULT_TITLE = {
  group: { de: 'Deutschkurs in Bremen', en: 'German course in Bremen' },
  individual: { de: 'Deutschkurs', en: 'German course' },
} as const;

/** How long a new offer is valid. */
export const VALID_FOR_DAYS = 28;
export type ContactInput = z.infer<typeof ContactSchema>;

// --------------------------------------------------- what the wizard shows

export type RecipientFilter = 'all' | OrganisationKind | 'person';

export type OrganisationHit = {
  type: 'organisation';
  id: string;
  name: string;
  kind: OrganisationKind;
  detail: string;
  language: OfferLanguage;
  countryCode: string | null;
};

export type PersonHit = {
  type: 'person';
  id: string;
  name: string;
  detail: string;
  salutation: Salutation;
  firstName: string;
  lastName: string;
  email: string | null;
  countryCode: string | null;
  phone: string | null;
  bookings: number;
  /** Has studied at CASA before: no enrolment fee (course-catalogue.ts says how it is decided). */
  studiedBefore: boolean;
  /** Has stayed in accommodation CASA arranged: no placement fee and deposit. */
  stayedBefore: boolean;
};

export type EnquiryHit = {
  type: 'enquiry';
  id: string;
  name: string;
  detail: string;
  enquiryKind: 'group' | 'company' | 'general';
};

export type RecipientHit = OrganisationHit | PersonHit | EnquiryHit;

export type OrganisationContact = { id: string; salutation: Salutation; firstName: string; lastName: string; email: string };

/** An organisation picked in the first step, with what the next steps can use. */
export type OrganisationForOffer = {
  id: string;
  name: string;
  kind: OrganisationKind;
  address: string;
  countryCode: string | null;
  language: OfferLanguage;
  contacts: OrganisationContact[];
  /** The latest offer to them, to repeat: "like last time". */
  lastOffer: {
    id: string;
    number: string;
    kind: 'group' | 'individual';
    title: string;
    groupName: string;
    package: PackageChoice;
    participants: number | null;
    escorts: number;
    status: string;
    year: string;
  } | null;
};

/** Recipients CASA already has that a new one may be: the same name, mail domain or address. */
export type RecipientMatch = { type: 'organisation' | 'person'; id: string; name: string; reason: string };

/** Where the wizard starts when it is opened from a record: an enquiry, a student, an organisation. */
export type WizardStart = {
  recipient:
    | { type: 'organisation'; organisation: OrganisationForOffer; contactId: string | null; newContact: ContactInput | null }
    | { type: 'new-organisation'; name: string; kind: OrganisationKind; countryCode: string | null; contact: ContactInput | null }
    | { type: 'person'; person: PersonHit }
    | null;
  enquiryId: string | null;
  enquiryNote: string | null;
  kind: 'group' | 'individual';
  group: { package: PackageChoice; weeks: number; participants: number | null } | null;
  language: OfferLanguage;
};
