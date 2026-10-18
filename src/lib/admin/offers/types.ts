import type { Bilingual } from '../i18n';

import type { CourseChoice } from './course';

/**
 * The offers module's vocabulary (docs/OFFERS.md).
 *
 * Shapes and constants only, with no database import, so the editor (a client
 * component) and the server share one definition of an offer.
 */

/** `lapsed`: sent and never answered (0059) — SchoolMan's old offers mostly, and one a colleague closes so. */
export const OFFER_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'withdrawn', 'lapsed'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

/** The workspace's words for a status, read with `pick(lang, …)`; never printed on the letter. */
export const OFFER_STATUS_LABELS: Record<OfferStatus, Bilingual> = {
  draft: { de: 'Entwurf', en: 'Draft' },
  sent: { de: 'Gesendet', en: 'Sent' },
  accepted: { de: 'Angenommen', en: 'Accepted' },
  declined: { de: 'Abgelehnt', en: 'Declined' },
  withdrawn: { de: 'Zurückgezogen', en: 'Withdrawn' },
  lapsed: { de: 'Ohne Antwort', en: 'No answer' },
};

export type OfferKind = 'group' | 'individual';

export type OfferLanguage = 'de' | 'en';
export type Presentation = 'itemised' | 'package';
export type Salutation = 'ms' | 'mr' | 'none';
export type Audience = 'participant' | 'escort';

export const ORGANISATION_KINDS = ['school', 'agency', 'company', 'public_body', 'other'] as const;
export type OrganisationKind = (typeof ORGANISATION_KINDS)[number];

/** How the escorts' own costs are paid. */
export type EscortPricing = 'paid' | 'free' | 'shared';
export const ESCORT_PRICING_LABELS: Record<EscortPricing, Bilingual> = {
  paid: { de: 'Zahlen selbst', en: 'Pay their own' },
  free: { de: 'Kostenfrei', en: 'Free of charge' },
  shared: { de: 'Trägt die Gruppe', en: 'Shared by the group' },
};

/** The four group packages of the groups page (src/config/gruppen/packages.ts). */
export type PackageSlug = 'hahn' | 'katze' | 'hund' | 'esel';

/**
 * What a group offer is built on: one of the four packages, or `own` — no
 * package, only the lines put on it (a group that wants the course alone, a
 * programme the packages do not have).
 */
export type PackageChoice = PackageSlug | 'own';

/** The building blocks of Esel, the package a group puts together itself. */
export type ModuleKey = 'course' | 'materials' | 'accommodation' | 'lunch' | 'transport';

/**
 * The choices for a group stay. Stored as `offers.stay` together with the
 * overrides, and read back through `normaliseStay`, so an offer saved before a
 * field existed still opens.
 */
export type StayChoices = {
  package: PackageChoice;
  /** Esel's length while it has no dates; Hahn, Katze and Hund have their own. */
  weeks: number;
  /** Esel only: which blocks the group takes. */
  modules: Record<ModuleKey, boolean>;
  /** Esel only: the afternoons chosen (activity ids of the groups page). */
  activities: string[];
  /** Afternoons on top of what a package includes (Hahn, Katze, Hund, own). */
  extras: string[];
  escortPricing: EscortPricing;
  /** A learner's course: an individual offer built from the catalogue (course.ts). */
  course: CourseChoice | null;
};

export const DEFAULT_STAY: StayChoices = {
  package: 'katze',
  weeks: 2,
  modules: { course: true, materials: true, accommodation: true, lunch: true, transport: true },
  activities: [],
  extras: [],
  escortPricing: 'paid',
  course: null,
};

/** A price or a text typed over a computed line, kept by the line's key. */
export type LineOverride = { unitAmount?: number; description?: string };

/** A line somebody typed: anything the builder does not compute. */
export type ManualLine = {
  key: string;
  audience: Audience;
  chargeType: string;
  description: string;
  quantity: number;
  unitAmount: number | null;
};

export type OfferLine = {
  key: string;
  audience: Audience;
  chargeType: string;
  description: string;
  quantity: number;
  unit: string;
  unitAmount: number | null;
  amount: number | null;
  /** What the price list says; null for a typed line or when no rate exists. */
  listUnitAmount: number | null;
  rateId: string | null;
  manual: boolean;
  /** The description was typed over the computed one. */
  customText: boolean;
  /** Part of a package: on the letter as included, without an amount. */
  included: boolean;
};

export type StayState = {
  choices: StayChoices;
  overrides: Record<string, LineOverride>;
  manual: ManualLine[];
};

/** Everything the editor edits. The server recomputes the lines from it. */
export type OfferDraft = {
  kind: OfferKind;
  language: OfferLanguage;
  presentation: Presentation;
  title: string;
  groupName: string;
  organisationId: string | null;
  recipientName: string;
  contactSalutation: Salutation;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  address: string;
  countryCode: string | null;
  arrival: string | null;
  departure: string | null;
  participants: number | null;
  escorts: number;
  stay: StayState;
  intro: string | null;
  closing: string | null;
  note: string | null;
  validUntil: string | null;
  ownerId: string | null;
};

export type OfferTotals = {
  perParticipant: number | null;
  perEscort: number | null;
  /** The participants' share of the escorts' costs, already in perParticipant. */
  escortShare: number | null;
  groupTotal: number | null;
  /** What free escorts cost CASA. */
  carriedByCasa: number | null;
};

export type CheckLevel = 'problem' | 'hint';
/** A check's message in both languages: the editor shows the workspace's, a refused send names them all. */
export type OfferCheck = { level: CheckLevel; field: string; message: Bilingual };

export const overrideKey = (audience: Audience, key: string) => `${audience}:${key}`;

export function formatOfferNumber(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(3, '0')}`;
}
