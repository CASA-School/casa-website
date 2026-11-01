import type { Bilingual } from './i18n';

/**
 * What kind of address or number a person's is — safe for the browser. Which one the workspace writes to is
 * decided by `person_emails()` / `person_phones()` (0114): their own before an agency's, the chosen one, a
 * private one, the newest.
 */

export const EMAIL_KINDS = ['personal', 'work', 'agency'] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_KIND_LABELS: Record<EmailKind, Bilingual> = {
  personal: { de: 'Privat', en: 'Private' },
  work: { de: 'Arbeit', en: 'Work' },
  agency: { de: 'Agentur', en: 'Agency' },
};

export const PHONE_KINDS = ['mobile', 'whatsapp', 'home', 'work', 'emergency'] as const;
export type PhoneKind = (typeof PHONE_KINDS)[number];

export const PHONE_KIND_LABELS: Record<PhoneKind, Bilingual> = {
  mobile: { de: 'Mobil', en: 'Mobile' },
  whatsapp: { de: 'WhatsApp', en: 'WhatsApp' },
  home: { de: 'Festnetz', en: 'Landline' },
  work: { de: 'Arbeit', en: 'Work' },
  emergency: { de: 'Notfallkontakt', en: 'Emergency contact' },
};

export const isEmailKind = (value: unknown): value is EmailKind => EMAIL_KINDS.includes(value as EmailKind);
export const isPhoneKind = (value: unknown): value is PhoneKind => PHONE_KINDS.includes(value as PhoneKind);
