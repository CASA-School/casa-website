/**
 * CASA's letterhead and the way its letters write dates and money. Pure.
 *
 * The company facts are the Impressum's (src/lib/content/published-legal.json);
 * the bank line is the one on every FileMaker letter. FileMaker's footer also
 * says "umsatzsteuerbefreit lt. § 5 Abs. 1 Nr. 9 KStG und § 3 Nr. 6" — those
 * cite corporate and trade tax, not VAT — so that line is left off until
 * CASA's tax adviser words it (TODO, docs/OFFERS.md §Open questions).
 */

import type { LetterLanguage } from './types';

const LETTERHEAD = {
  returnAddress: 'CASA gGmbH · Am Dobben 14–16 · 28203 Bremen',
  de: [
    'CASA – Internationale Sprachschule gemeinnützige GmbH · Am Dobben 14–16 · 28203 Bremen · Telefon +49 421 460 414 30 · info@casa-bremen.de',
    'Geschäftsführerin Bettina Rick · Amtsgericht Bremen HRB 32761 HB · Steuernummer 60/147/04599',
    'Commerzbank AG · IBAN DE86 2904 0090 0109 7443 00 · BIC COBADEFFXXX · casa-bremen.de',
  ],
  en: [
    'CASA – Internationale Sprachschule gemeinnützige GmbH (non-profit) · Am Dobben 14–16 · 28203 Bremen · Germany · Phone +49 421 460 414 30',
    'Managing director Bettina Rick · Amtsgericht Bremen HRB 32761 HB · Tax number 60/147/04599 · info@casa-bremen.de',
    'Commerzbank AG · IBAN DE86 2904 0090 0109 7443 00 · BIC COBADEFFXXX · casa-bremen.de',
  ],
} as const;

const SIGN = {
  de: { signOff: 'Viele Grüße', school: 'CASA – Internationale Sprachschule Bremen' },
  en: { signOff: 'Kind regards', school: 'CASA – Internationale Sprachschule Bremen' },
} as const;

/** What every CASA letter has around its body: the return address, the footer, the sign-off. */
export function letterhead(language: LetterLanguage, signatureName: string | null) {
  return {
    returnAddress: LETTERHEAD.returnAddress,
    footer: [...LETTERHEAD[language]],
    signOff: SIGN[language].signOff,
    signature: [signatureName ?? '', SIGN[language].school].filter(Boolean),
  };
}

const LOCALE = { de: 'de-DE', en: 'en-GB' } as const;

export function formatMoney(value: number, language: LetterLanguage): string {
  return new Intl.NumberFormat(LOCALE[language], { style: 'currency', currency: 'EUR' }).format(value);
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');

export function formatLetterDate(iso: string, language: LetterLanguage): string {
  const { y, m, d } = parts(iso);
  return language === 'de' ? `${pad(d)}.${pad(m)}.${y}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

/** 12.–25.04.2027 · 12–25 April 2027, and the longer forms across months and years. */
export function formatDateRange(from: string, to: string, language: LetterLanguage): string {
  const a = parts(from);
  const b = parts(to);
  if (language === 'de') {
    if (a.y === b.y && a.m === b.m) return `${pad(a.d)}.–${pad(b.d)}.${pad(b.m)}.${b.y}`;
    if (a.y === b.y) return `${pad(a.d)}.${pad(a.m)}.–${pad(b.d)}.${pad(b.m)}.${b.y}`;
    return `${formatLetterDate(from, 'de')}–${formatLetterDate(to, 'de')}`;
  }
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS_EN[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS_EN[a.m - 1]} – ${b.d} ${MONTHS_EN[b.m - 1]} ${b.y}`;
  return `${formatLetterDate(from, 'en')} – ${formatLetterDate(to, 'en')}`;
}

export type Salutation = 'ms' | 'mr' | 'none';

/** Du in German, by first name, like everything CASA writes (docs/VOICE_AND_TONE.md). */
export function salutation(to: { language: LetterLanguage; salutation: Salutation; firstName: string; lastName: string }): string {
  const first = to.firstName.trim();
  const last = to.lastName.trim();
  const s = to.salutation;
  if (to.language === 'de') {
    if (first) return s === 'ms' ? `Liebe ${first},` : s === 'mr' ? `Lieber ${first},` : `Hallo ${first},`;
    if (last && s !== 'none') return s === 'ms' ? `Liebe Frau ${last},` : `Lieber Herr ${last},`;
    return 'Hallo,';
  }
  if (first) return `Dear ${first},`;
  if (last && s !== 'none') return `Dear ${s === 'ms' ? 'Ms' : 'Mr'} ${last},`;
  return 'Hello,';
}

/** The address block: the name, the person there, the address, and the country unless it is Germany. */
export function recipientLines(to: { name: string; contact: string; address: string; countryCode: string | null; countryName: string | null }): string[] {
  const name = to.name.trim();
  const contact = to.contact.trim();
  return [
    name,
    contact && contact !== name ? contact : '',
    ...to.address.split('\n').map((l) => l.trim()),
    to.countryName && to.countryCode !== 'DE' ? to.countryName : '',
  ].filter(Boolean);
}
