/**
 * What a new offer's wizard can tell from what is typed. Pure.
 *
 * A colleague types a name or an address; the wizard fills in what follows
 * from it and leaves every guess visible and changeable: the kind of
 * organisation from its name ("Liceo …" is a school, "… Viaggi srl" an
 * agency), a person's name from their address, the country from the address's
 * domain, the letter's language from the country. And it notices a recipient
 * CASA already has — "Vivimondo S.r.l." is "Vivimondo srl" — before a second
 * one is made, the duplicate FileMaker never stops (docs/FILEMAKER_LESSONS.md §1).
 */

import type { OfferLanguage, OrganisationKind } from './types';

export type RecipientKind = OrganisationKind | 'person';

const WORDS: [RecipientKind, RegExp][] = [
  ['public_body', /\b(jobcenter|job ?center|agentur für arbeit|arbeitsagentur|bamf|bundesamt|landesamt|ministerium|ministry|senat|behörde|stadt bremen|consulate|konsulat|embassy|botschaft)\b/i],
  ['school', /\b(schule|gymnasium|gesamtschule|oberschule|realschule|lyc[ée]e|coll[eè]ge|liceo|istituto|scuola|colegio|escola|escuela|instituto|skola|szko[łl]a|gimnazjum|liceum|school|academy|akademie|universit\w*|hochschule|iis|itis|ies)\b/i],
  ['agency', /\b(agenc\w*|agentur|travel|tours?|reisen|viaggi|voyages?|viajes|sprachreisen|language travel|study abroad|exchange|intercambio|scambi)\b/i],
  ['company', /\b(gmbh|ag|kg|ohg|ug|ltd|limited|llc|inc|corp|corporation|plc|s\.?r\.?l|s\.?p\.?a|s\.?a\.?s?|b\.?v|n\.?v|oy|a\/s|sp\. ?z ?o\.?o|group|holding|klinik|clinic|hospital|krankenhaus)\b/i],
];

/**
 * The kind of recipient a name suggests, or null when it says nothing. Two
 * or three plain words are a person.
 */
export function guessKind(name: string): RecipientKind | null {
  const text = name.trim();
  if (!text) return null;
  for (const [kind, words] of WORDS) if (words.test(text)) return kind;
  const words = text.split(/\s+/);
  if (words.length >= 2 && words.length <= 3 && words.every((w) => /^\p{Lu}[\p{L}'’-]+$/u.test(w))) return 'person';
  return null;
}

/** Mail services anyone can use: their domain says nothing about an organisation. */
const OPEN_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.de', 'yahoo.it', 'yahoo.fr', 'yahoo.es', 'hotmail.com', 'hotmail.de', 'hotmail.it',
  'hotmail.fr', 'outlook.com', 'outlook.de', 'live.com', 'live.de', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'gmx.de',
  'gmx.net', 'gmx.at', 'gmx.ch', 'web.de', 't-online.de', 'freenet.de', 'posteo.de', 'mailbox.org', 'proton.me', 'protonmail.com',
  'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it', 'orange.fr', 'free.fr', 'laposte.net', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl',
  'seznam.cz', 'mail.ru', 'yandex.ru', 'yandex.com', 'qq.com', '163.com', 'naver.com',
]);

export function emailDomain(email: string): string | null {
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email.trim().toLowerCase());
  return m ? m[1] : null;
}

/** The domain of an organisation's own mail, or null for an open mail service. */
export function organisationDomain(email: string): string | null {
  const domain = emailDomain(email);
  return domain && !OPEN_MAIL.has(domain) ? domain : null;
}

/** Country-code domains that are not the country's ISO code. */
const TLD_COUNTRY: Record<string, string> = { uk: 'GB', el: 'GR' };
/** Country-code domains used as generic ones. */
const NOT_A_COUNTRY = new Set(['io', 'co', 'me', 'tv', 'ai', 'app', 'eu']);

/** Italy for `…@scuola.it`; null for `.com`, `.org` and the like. */
export function countryFromEmail(email: string): string | null {
  const domain = emailDomain(email);
  if (!domain || OPEN_MAIL.has(domain)) return null;
  const tld = domain.split('.').pop()!;
  if (tld.length !== 2 || NOT_A_COUNTRY.has(tld)) return null;
  return TLD_COUNTRY[tld] ?? tld.toUpperCase();
}

const capital = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);

/** "fiorella.massari@…" is Fiorella Massari; "info@…" is nobody. */
export function nameFromEmail(email: string): { firstName: string; lastName: string } | null {
  const local = email.trim().split('@')[0]?.toLowerCase() ?? '';
  const parts = local.split(/[._-]+/).filter((p) => /^[a-zà-ÿ]{2,}$/.test(p));
  if (parts.length < 2 || parts.length > 3) return null;
  if (['info', 'office', 'mail', 'kontakt', 'contact', 'admin', 'booking', 'groups', 'gruppi', 'sekretariat', 'segreteria'].includes(parts[0])) {
    return null;
  }
  return { firstName: capital(parts[0]), lastName: parts.slice(1).map(capital).join(' ') };
}

const GERMAN_SPEAKING = new Set(['DE', 'AT', 'CH', 'LI']);

/** The letter's language: German for the German-speaking countries, English for the rest. */
export function languageFor(countryCode: string | null, fallback: OfferLanguage = 'en'): OfferLanguage {
  return countryCode ? (GERMAN_SPEAKING.has(countryCode) ? 'de' : 'en') : fallback;
}

const LEGAL_FORMS =
  /\b(gmbh|ggmbh|ag|kg|ohg|ug|e\.?\s?v|se|ltd|limited|llc|inc|corp|plc|s\.?\s?r\.?\s?l|s\.?\s?p\.?\s?a|s\.?\s?a\.?\s?s?|s\.?\s?l|b\.?\s?v|n\.?\s?v|oy|ab|a\/s|sp\.?\s?z\s?o\.?\s?o)\b\.?/gi;

/** "Vivimondo S.r.l." and "vivimondo srl" are the same name. */
export function comparableName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(LEGAL_FORMS, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** The same organisation, written another way: equal once compared, or one name inside the other. */
export function sameName(a: string, b: string): boolean {
  const x = comparableName(a);
  const y = comparableName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return short.length >= 5 && ` ${long} `.includes(` ${short} `);
}

/** The name the offer goes by: the organisation without its legal form, and the year it travels. */
export function offerName(recipient: string, arrival: string | null): string {
  const base = recipient.replace(LEGAL_FORMS, ' ').replace(/[\s,·-]+$/, '').replace(/\s+/g, ' ').trim();
  return arrival ? `${base} ${arrival.slice(0, 4)}` : base;
}
