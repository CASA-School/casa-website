import { z } from 'zod';

import { isIsoDate } from './stay';
import { DEFAULT_STAY, type OfferDraft, type StayState } from './types';

/**
 * What the editor may write, and how a stored `offers.stay` is read back.
 *
 * The editor sends the whole draft on every save; this is the one place that
 * decides what of it is acceptable. `normaliseStay` is lenient by design — an
 * offer saved before a choice existed opens with that choice's default rather
 * than failing — while `parseOfferDraft` is strict, because it guards a write.
 */

const isoDate = z
  .string()
  .nullable()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v == null || isIsoDate(v), 'Not a date');

const money = z.number().finite().min(-100_000).max(1_000_000);

/* Strict: what a save may contain. Nothing is coerced — a write either is an
   offer or is refused, so a bad field can never quietly become a default or
   take every typed line with it. */
const ModulesSchema = z.object({
  course: z.boolean(),
  materials: z.boolean(),
  accommodation: z.boolean(),
  lunch: z.boolean(),
  transport: z.boolean(),
});

const ChoicesSchema = z.object({
  package: z.enum(['hahn', 'katze', 'hund', 'esel']),
  weeks: z.number().int().min(1).max(52),
  modules: ModulesSchema,
  activities: z.array(z.string().regex(/^[a-z-]{2,40}$/)).max(40),
  escortPricing: z.enum(['paid', 'free', 'shared']),
});

const OverrideSchema = z.object({
  unitAmount: money.optional(),
  description: z.string().max(300).optional(),
});

const ManualLineSchema = z.object({
  key: z.string().regex(/^manual:[a-z0-9-]{1,40}$/),
  audience: z.enum(['participant', 'escort']),
  chargeType: z.string().min(1).max(60),
  description: z.string().max(300),
  quantity: z.number().finite().min(0).max(10_000),
  unitAmount: money.nullable(),
});

const StaySchema = z.object({
  choices: ChoicesSchema,
  overrides: z.record(z.string().max(80), OverrideSchema),
  manual: z.array(ManualLineSchema).max(60),
});

/* Lenient: how a stored stay is read back. An offer saved before a choice
   existed opens with that choice's default; a line that no longer parses is
   left out of the editor rather than failing the whole offer. */
const StoredChoices = z.object({
  package: ChoicesSchema.shape.package.catch(DEFAULT_STAY.package),
  weeks: ChoicesSchema.shape.weeks.catch(DEFAULT_STAY.weeks),
  modules: ModulesSchema.catch(DEFAULT_STAY.modules),
  activities: ChoicesSchema.shape.activities.catch(DEFAULT_STAY.activities),
  escortPricing: ChoicesSchema.shape.escortPricing.catch(DEFAULT_STAY.escortPricing),
});

/** A stored `offers.stay`, whatever its age, as the current shape. */
export function normaliseStay(value: unknown): StayState {
  const raw = (value && typeof value === 'object' ? value : {}) as { choices?: unknown; overrides?: unknown; manual?: unknown };
  const choices = StoredChoices.safeParse(raw.choices && typeof raw.choices === 'object' ? raw.choices : {});
  const overrides = z.record(z.string().max(80), OverrideSchema).safeParse(raw.overrides ?? {});
  const manual = Array.isArray(raw.manual)
    ? raw.manual.flatMap((m) => {
        const line = ManualLineSchema.safeParse(m);
        return line.success ? [line.data] : [];
      })
    : [];
  return {
    choices: choices.success ? choices.data : { ...DEFAULT_STAY },
    overrides: overrides.success ? overrides.data : {},
    manual,
  };
}

const text = (max: number) => z.string().max(max).transform((v) => v.trim());
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .transform((v) => (v == null || v.trim() === '' ? null : v));

export const OfferDraftSchema = z
  .object({
    kind: z.enum(['group', 'individual']),
    language: z.enum(['de', 'en']),
    presentation: z.enum(['itemised', 'package']),
    title: text(200),
    groupName: text(120),
    organisationId: z.string().uuid().nullable(),
    recipientName: text(200),
    contactSalutation: z.enum(['ms', 'mr', 'none']),
    contactFirstName: text(120),
    contactLastName: text(120),
    contactEmail: z
      .string()
      .max(200)
      .transform((v) => v.trim())
      .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Not an email address'),
    address: z.string().max(400),
    countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
    arrival: isoDate,
    departure: isoDate,
    participants: z.number().int().min(0).max(2000).nullable(),
    escorts: z.number().int().min(0).max(200),
    stay: StaySchema,
    intro: optionalText(3000),
    closing: optionalText(3000),
    note: optionalText(3000),
    validUntil: isoDate,
    ownerId: z.string().uuid().nullable(),
  })
  .refine((d) => !d.arrival || !d.departure || d.departure > d.arrival, {
    message: 'Departure must be after arrival',
    path: ['departure'],
  });

export function parseOfferDraft(value: unknown): { ok: true; draft: OfferDraft } | { ok: false; error: string } {
  const parsed = OfferDraftSchema.safeParse(value);
  if (parsed.success) return { ok: true, draft: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, error: issue ? `${issue.path.join('.') || 'offer'}: ${issue.message}` : 'Invalid offer' };
}
