import type { ContentLocale } from '@/lib/content/types';

/**
 * CASA'S COOPERATION PARTNERS (2026-10-03), shown on /partners
 * (/ueber-uns/kooperationspartner). A new partner is one entry here.
 *
 * The texts for HERE AHEAD, :prime, Garantiefonds Hochschule and the TANDEM
 * schools moved here from the non-profit page's partnerships section, which
 * reads them from this file too, so the two pages cannot drift apart. Each
 * text says what the partner does and, where CASA has confirmed it, what CASA
 * does with them. Never write a cooperation CASA has not confirmed.
 */

type Localized = Record<ContentLocale, string>;

type PartnerLogo = {
  src: string;
  width: number;
  height: number;
  /** A white logo, drawn on an ink tile. */
  onDark?: boolean;
};

export type PartnerProgramme = {
  name: string;
  href: string;
  logo?: PartnerLogo;
  label: Localized;
  text: Localized;
};

export type Partner = {
  id: string;
  name: string;
  href: string;
  logo?: PartnerLogo;
  /** CASA's main partner: shown first, on a card of its own. */
  main?: boolean;
  label: Localized;
  /** What CASA does with the partner, or, where CASA has not described that, what the partner does. */
  text: Localized;
  /** Who the partner is, for the partner page only; `text` is shared with the non-profit page. */
  about?: Localized;
  /** A programme the partner runs that CASA is part of. */
  programmes?: PartnerProgramme[];
};

export const GARANTIEFONDS_URL = 'https://www.bildungsberatung-gfh.de/wde/beratung-und-foerderung/foerderung-nach-gfh.php';

export const primeProgramme: PartnerProgramme = {
  name: ':prime Bremen',
  href: 'https://www.primebremen.de/',
  logo: { src: '/partners/prime.svg', width: 78, height: 25 },
  label: { de: 'Vorbereitung auf den Hochschulzugang', en: 'Preparing for university entry' },
  text: {
    de: ':prime ist ein Vorbereitungsprogramm von HERE AHEAD. Es verbindet sprachliche und fachliche Vorbereitung für Studieninteressierte, deren Schulabschluss zum Besuch eines Studienkollegs berechtigt.',
    en: ':prime is a HERE AHEAD programme combining language and subject preparation for applicants whose school qualifications allow them to attend a Studienkolleg.',
  },
};

export const hereAhead: Partner = {
  id: 'here-ahead',
  name: 'HERE AHEAD',
  href: 'https://www.aheadbremen.de/',
  logo: { src: '/partners/here-ahead.svg', width: 105, height: 79 },
  main: true,
  label: { de: 'Gemeinsam Richtung Studium', en: 'A shared path to university' },
  text: {
    de: 'HERE AHEAD bereitet internationale Studieninteressierte auf ein Studium in Bremen und Bremerhaven vor. CASA plant und unterrichtet die Sprachkurse der Academy.',
    en: 'HERE AHEAD prepares international applicants for university in Bremen and Bremerhaven. CASA plans and teaches the Academy’s language courses.',
  },
  about: {
    de: 'Eine gemeinsame Einrichtung der staatlichen Hochschulen im Land Bremen.',
    en: 'A joint academy of the public universities in the state of Bremen.',
  },
  programmes: [primeProgramme],
};

export const garantiefonds: Partner = {
  id: 'garantiefonds-hochschule',
  name: 'Garantiefonds Hochschule',
  href: GARANTIEFONDS_URL,
  logo: { src: '/partners/gfh.svg', width: 294, height: 71, onDark: true },
  label: { de: 'Beratung und Förderung', en: 'Advice and funding' },
  text: {
    de: 'CASA kooperiert mit der Bildungsberatung Garantiefonds Hochschule. Die Beratungsstellen prüfen die Fördervoraussetzungen und leiten Anträge zur Bearbeitung an die Otto Benecke Stiftung e.V. weiter.',
    en: 'CASA works with the Garantiefonds Hochschule educational advice service. Its advisers check eligibility and forward funding applications to the Otto Benecke Stiftung e.V. for processing.',
  },
  about: {
    de: 'Der Garantiefonds Hochschule fördert unter anderem junge Geflüchtete und Spätaussiedler unter 30 Jahren, die sich auf ein Studium in Deutschland vorbereiten, zum Beispiel mit Stipendien für Sprachkurse.',
    en: 'The Garantiefonds Hochschule supports young refugees and late repatriates under 30 who are preparing to study in Germany, for example with scholarships for language courses.',
  },
};

/*
 * Visionskultur and Hood Training: CASA named them as partners (2026-10-03).
 * Neither organisation's site nor any public source describes the
 * cooperation, so their text says only what the organisation does
 * (vskultur.de and hoodtraining.de, imprints checked 2026-10-03). Add what
 * CASA does with them once CASA has described it. Their logos are the files
 * on their own sites, downloaded 2026-10-03.
 */
export const visionskultur: Partner = {
  id: 'visionskultur',
  name: 'Visionskultur · Creative HUB',
  href: 'https://vskultur.de/',
  logo: { src: '/partners/visionskultur.svg', width: 312, height: 40, onDark: true },
  label: { de: 'Kreativität und Gründung', en: 'Creativity and new ventures' },
  text: {
    de: 'Visionskultur ist eine gemeinnützige Organisation in Bremen, die Menschen bei Gründungen sowie bei kreativen und kulturellen Projekten unterstützt. Im Creative HUB bietet sie dafür Arbeits- und Werkstatträume, Coaching und ein Netzwerk.',
    en: 'Visionskultur is a non-profit organisation in Bremen that helps people start businesses and creative or cultural projects. Its Creative HUB offers workspace and workshop rooms, coaching and a network.',
  },
};

export const hoodTraining: Partner = {
  id: 'hood-training',
  name: 'Hood Training',
  href: 'https://hoodtraining.de/',
  logo: { src: '/partners/hood-training.png', width: 3291, height: 1836 },
  label: { de: 'Sport und Jugendarbeit', en: 'Sport and youth work' },
  text: {
    de: 'Hood Training ist eine gemeinnützige Organisation der Kinder- und Jugendhilfe in Bremen. Mit Sport- und Bewegungsangeboten in den Stadtteilen erreicht sie Kinder und Jugendliche und verbindet das mit sozialer Arbeit und Bildungsangeboten.',
    en: 'Hood Training is a non-profit youth organisation in Bremen. Through sport and exercise sessions in local neighbourhoods, it reaches children and young people and combines this with social work and educational activities.',
  },
};

export type TandemSchool = {
  name: string;
  city: Localized;
  country: Localized;
  logo: string;
  href: string;
};

export const tandemSchools: TandemSchool[] = [
  { name: 'TANDEM Hamburg', city: { de: 'Hamburg', en: 'Hamburg' }, country: { de: 'Deutschland', en: 'Germany' }, logo: '/partners/hamburg.png', href: 'https://tandem-hamburg.de/' },
  { name: 'TANDEM München', city: { de: 'München', en: 'Munich' }, country: { de: 'Deutschland', en: 'Germany' }, logo: '/partners/munich.png', href: 'https://www.tandem-muenchen.de/' },
  { name: 'TANDEM Madrid', city: { de: 'Madrid', en: 'Madrid' }, country: { de: 'Spanien', en: 'Spain' }, logo: '/partners/madrid.png', href: 'https://www.tandemmadrid.com/' },
  { name: 'Escuela Montalbán', city: { de: 'Granada', en: 'Granada' }, country: { de: 'Spanien', en: 'Spain' }, logo: '/partners/granada.png', href: 'https://www.escuela-montalban.com/' },
];

export const tandemInternational: Partner = {
  id: 'tandem-international',
  name: 'TANDEM International',
  href: 'https://tandem-schools.com/en/',
  logo: { src: '/accreditations/tandem-international-bremen.png', width: 280, height: 141 },
  label: { de: 'Verbunden über Bremen hinaus', en: 'Connections beyond Bremen' },
  text: {
    de: 'CASA ist die TANDEM-Schule in Bremen. Mit Sprachschulen in Deutschland, Spanien und Chile teilen wir die Freude an Sprachen und interkultureller Begegnung.',
    en: 'CASA is the TANDEM school in Bremen. We share a love of languages and intercultural exchange with schools in Germany, Spain and Chile.',
  },
  about: {
    de: 'TANDEM International e.V. ist ein Verband unabhängiger Sprachschulen, die Deutsch und Spanisch unterrichten.',
    en: 'TANDEM International e.V. is an association of independent schools teaching German and Spanish.',
  },
};

/**
 * In the order the page shows them: the main partner leads, then CASA's own
 * order (2026-10-03).
 */
export const partners: Partner[] = [hereAhead, garantiefonds, visionskultur, hoodTraining, tandemInternational];
