import type { Bilingual } from './i18n';

/**
 * The accommodation module's words (2026-10-18, migration 0060), client-safe: the kinds of place, a
 * family member's role, the views of the places and of the stays.
 */

export const ACCOMMODATION_KINDS = ['host_family', 'casa_flat', 'other'] as const;
export type AccommodationKind = (typeof ACCOMMODATION_KINDS)[number];
export const ACCOMMODATION_KIND_LABELS: Record<AccommodationKind, Bilingual> = {
  host_family: { de: 'Gastfamilie', en: 'Host family' },
  casa_flat: { de: 'CASA-WG', en: 'CASA flat' },
  other: { de: 'Sonstige', en: 'Other' },
};

export const MEMBER_ROLES = ['mother', 'father', 'daughter', 'son', 'grandmother', 'grandfather', 'relative', 'friend', 'other'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const MEMBER_ROLE_LABELS: Record<MemberRole, Bilingual> = {
  mother: { de: 'Mutter', en: 'Mother' },
  father: { de: 'Vater', en: 'Father' },
  daughter: { de: 'Tochter', en: 'Daughter' },
  son: { de: 'Sohn', en: 'Son' },
  grandmother: { de: 'Großmutter', en: 'Grandmother' },
  grandfather: { de: 'Großvater', en: 'Grandfather' },
  relative: { de: 'Verwandte', en: 'Relative' },
  friend: { de: 'Freund oder Freundin', en: 'Friend' },
  other: { de: 'Sonstige', en: 'Other' },
};

/** The places: host families, CASA's flats, the others (another WG, a hotel), and those CASA no longer places learners with. */
export const PLACE_VIEWS = ['all', 'host_family', 'casa_flat', 'other', 'inactive'] as const;
export type PlaceView = (typeof PLACE_VIEWS)[number];
export const PLACE_VIEW_LABELS: Record<PlaceView, Bilingual> = {
  all: { de: 'Alle', en: 'All' },
  host_family: { de: 'Gastfamilien', en: 'Host families' },
  casa_flat: { de: 'CASA-WGs', en: 'CASA flats' },
  other: { de: 'Weitere', en: 'Other' },
  inactive: { de: 'Inaktiv', en: 'Inactive' },
};
export const isPlaceView = (value: unknown): value is PlaceView => (PLACE_VIEWS as readonly unknown[]).includes(value);

/**
 * The stays, as the accommodation colleague works them (docs/schoolman/accommodation.md §The work lists):
 * arriving in the next two weeks, staying now, leaving in the next two weeks, staying on after the
 * course, and those still without a place.
 */
export const STAY_VIEWS = ['arriving', 'now', 'leaving', 'after', 'unplaced'] as const;
export type StayView = (typeof STAY_VIEWS)[number];
export const STAY_VIEW_LABELS: Record<StayView, Bilingual> = {
  arriving: { de: 'Kommen bald', en: 'Arriving soon' },
  now: { de: 'Wohnen jetzt', en: 'Staying now' },
  leaving: { de: 'Reisen bald ab', en: 'Leaving soon' },
  after: { de: 'Bleiben nach dem Kurs', en: 'Staying after the course' },
  unplaced: { de: 'Noch ohne Unterkunft', en: 'No place yet' },
};
export const isStayView = (value: unknown): value is StayView => (STAY_VIEWS as readonly unknown[]).includes(value);
