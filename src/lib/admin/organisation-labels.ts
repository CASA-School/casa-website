import type { Bilingual } from './i18n';
import { ORGANISATION_KINDS, type OrganisationKind } from './offers/types';

/**
 * The organisations module's words (2026-10-18, migration 0057), client-safe: the kinds of
 * organisation, the views of the list, a contact's salutation.
 */

export { ORGANISATION_KINDS, type OrganisationKind };

export const ORGANISATION_KIND_LABELS: Record<OrganisationKind, Bilingual> = {
  agency: { de: 'Agentur', en: 'Agency' },
  company: { de: 'Firma', en: 'Company' },
  school: { de: 'Schule', en: 'School' },
  public_body: { de: 'Behörde', en: 'Public body' },
  other: { de: 'Sonstige', en: 'Other' },
};

/** The kinds in the order a colleague chooses among them: the ones CASA works with most first. */
export const ORGANISATION_KIND_CHOICES: readonly OrganisationKind[] = ['agency', 'company', 'school', 'public_body', 'other'];

/** The list's views: by kind (schools and offices together), and the ones CASA no longer works with. */
export const ORGANISATION_VIEWS = ['all', 'agency', 'company', 'school', 'other', 'inactive'] as const;
export type OrganisationView = (typeof ORGANISATION_VIEWS)[number];
export const ORGANISATION_VIEW_LABELS: Record<OrganisationView, Bilingual> = {
  all: { de: 'Alle', en: 'All' },
  agency: { de: 'Agenturen', en: 'Agencies' },
  company: { de: 'Firmen', en: 'Companies' },
  school: { de: 'Schulen & Behörden', en: 'Schools & offices' },
  other: { de: 'Weitere', en: 'Other' },
  inactive: { de: 'Inaktiv', en: 'Inactive' },
};
export const isOrganisationView = (value: unknown): value is OrganisationView => (ORGANISATION_VIEWS as readonly unknown[]).includes(value);

export const CONTACT_SALUTATIONS = ['ms', 'mr', 'none'] as const;
export type ContactSalutation = (typeof CONTACT_SALUTATIONS)[number];
export const CONTACT_SALUTATION_LABELS: Record<ContactSalutation, Bilingual> = {
  ms: { de: 'Frau', en: 'Ms' },
  mr: { de: 'Herr', en: 'Mr' },
  none: { de: 'Ohne Anrede', en: 'No salutation' },
};
