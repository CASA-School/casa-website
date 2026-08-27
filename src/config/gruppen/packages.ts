import type { ContentLocale } from '@/lib/content/types';

/**
 * CASA Gruppen — source of truth for the group-travel product.
 *
 * Derived from two internal documents received 2026-08-26:
 *   - `Gruppenpakete_Stadtmusikanten.docx` — the four fixed packages.
 *   - `Gruppenreise Esel_Auswahl.xlsx`     — the modular price sheet behind "Esel".
 *
 * SUPERSEDES `src/lib/pricing/group-pricing.ts` for anything public-facing.
 * That module ports `Preiskalkulation_Gruppen.xlsx` (2026-08-12) and its open
 * questions are answered here: docs/GROUP_PRICING_AND_SPECIAL_COURSES.md asked
 * the coordinator to confirm the package set and names, and these two files are
 * her answer. The models disagree — course is €150/week here against €145 there,
 * the €30 Verwaltungskosten line is gone, and the culture programme moved from
 * three tiers to sixteen individually priced activities. Reconcile before the
 * older module drives a real quote; nothing in the UI reads it today.
 *
 * The four packages are named after the Bremen Town Musicians. In the monument the
 * animals stand on each other's backs — Esel at the bottom, then Hund, Katze, Hahn.
 * The product ladder follows the same stack, so `stackPosition` is both the visual
 * order in the artwork and the scope order of the packages.
 */

export type LocalizedText = {
  en: string;
  de: string;
};

export type GruppenPackageSlug = 'hahn' | 'katze' | 'hund' | 'esel';

export type GruppenActivityId =
  | 'cityrallye'
  | 'yoga'
  | 'radio-bremen'
  | 'stadtfuehrung'
  | 'botanika'
  | 'rathausfuehrung'
  | 'kunsthalle'
  | 'weserstadion'
  | 'universum'
  | 'union-brauerei'
  | 'nachtwaechter'
  | 'hafenrundfahrt'
  | 'klimahaus'
  | 'auswandererhaus'
  | 'daytrip-hamburg'
  | 'daytrip-luebeck';

export type GruppenActivity = {
  id: GruppenActivityId;
  /** Proper nouns stay in German on both locales — they are the venue's real name. */
  name: string;
  /** Price per person in EUR. Source: `Gruppenreise Esel_Auswahl.xlsx`, column C. */
  price: number;
  blurb: LocalizedText;
  /** Used to group the picker and to colour-code the itinerary chips. */
  category: 'city' | 'culture' | 'science' | 'sport' | 'daytrip';
};

export const CURRENCY = 'EUR' as const;

/** Maximum cultural activities bookable per week — stated in the Esel sheet, row 11. */
export const MAX_ACTIVITIES_PER_WEEK = 5;

/** Teaching units per week: Mon–Fri, 09:00–12:30. */
export const TEACHING_UNITS_PER_WEEK = 20;

export const GRUPPEN_ACTIVITIES: GruppenActivity[] = [
  {
    id: 'cityrallye',
    name: 'Cityrallye',
    price: 3,
    category: 'city',
    blurb: {
      en: 'A team scavenger hunt through the old town — the classic icebreaker for day one.',
      de: 'Eine Team-Rallye durch die Altstadt — der Klassiker für den ersten Tag.',
    },
  },
  {
    id: 'yoga',
    name: 'Yoga at CASA',
    price: 3,
    category: 'city',
    blurb: {
      en: 'A calm hour in our own building, guided in simple German.',
      de: 'Eine ruhige Stunde im eigenen Haus, angeleitet in einfachem Deutsch.',
    },
  },
  {
    id: 'radio-bremen',
    name: 'Radio Bremen',
    price: 3,
    category: 'culture',
    blurb: {
      en: 'Behind the scenes at the regional public broadcaster, studios included.',
      de: 'Hinter den Kulissen des Landesrundfunks, Studios inklusive.',
    },
  },
  {
    id: 'stadtfuehrung',
    name: 'Stadtführung',
    price: 5,
    category: 'city',
    blurb: {
      en: 'Guided walk through the Marktplatz, Böttcherstraße and the Schnoor quarter.',
      de: 'Führung über Marktplatz, Böttcherstraße und durch den Schnoor.',
    },
  },
  {
    id: 'botanika',
    name: 'Botanika',
    price: 7,
    category: 'science',
    blurb: {
      en: 'Green-house worlds from Asia in the Rhododendron park.',
      de: 'Gewächshauswelten Asiens im Rhododendronpark.',
    },
  },
  {
    id: 'rathausfuehrung',
    name: 'Rathausführung',
    price: 10,
    category: 'culture',
    blurb: {
      en: 'Inside the UNESCO World Heritage town hall and its Renaissance hall.',
      de: 'Im UNESCO-Welterbe-Rathaus und seiner Oberen Rathaushalle.',
    },
  },
  {
    id: 'kunsthalle',
    name: 'Kunsthalle Bremen',
    price: 10,
    category: 'culture',
    blurb: {
      en: 'Six centuries of European art, with worksheets we prepare in class.',
      de: 'Sechs Jahrhunderte europäische Kunst, mit im Unterricht vorbereiteten Aufgaben.',
    },
  },
  {
    id: 'weserstadion',
    name: 'Weserstadion',
    price: 12,
    category: 'sport',
    blurb: {
      en: 'Dressing rooms, players tunnel and press room at Werder Bremen.',
      de: 'Kabine, Spielertunnel und Presseraum bei Werder Bremen.',
    },
  },
  {
    id: 'universum',
    name: 'Universum',
    price: 14,
    category: 'science',
    blurb: {
      en: 'Hands-on science centre — technology, nature and humankind over three floors.',
      de: 'Mitmach-Science-Center — Technik, Natur und Mensch auf drei Ebenen.',
    },
  },
  {
    id: 'union-brauerei',
    name: 'Union Brauerei',
    price: 20,
    category: 'culture',
    blurb: {
      en: 'Bremen brewing history and craft production. Adult groups only.',
      de: 'Bremer Braugeschichte und Handwerksproduktion. Nur für Erwachsenengruppen.',
    },
  },
  {
    id: 'nachtwaechter',
    name: 'Nachtwächterrundgang',
    price: 25,
    category: 'city',
    blurb: {
      en: 'The night watchman walks the old town after dark and tells its stories.',
      de: 'Der Nachtwächter zieht nach Einbruch der Dunkelheit durch die Altstadt.',
    },
  },
  {
    id: 'hafenrundfahrt',
    name: 'Hafenrundfahrt',
    price: 27,
    category: 'city',
    blurb: {
      en: 'Boat tour of the working Weser harbour and container terminals.',
      de: 'Bootstour durch den Weserhafen und die Containerterminals.',
    },
  },
  {
    id: 'klimahaus',
    name: 'Klimahaus Bremerhaven',
    price: 30,
    category: 'science',
    blurb: {
      en: 'A journey along the 8th meridian through every climate zone on earth.',
      de: 'Eine Reise entlang des achten Längengrads durch alle Klimazonen der Erde.',
    },
  },
  {
    id: 'auswandererhaus',
    name: 'Auswandererhaus Bremerhaven',
    price: 30,
    category: 'culture',
    blurb: {
      en: 'Europe’s emigration museum — every visitor follows one real biography.',
      de: 'Europas Auswanderermuseum — jede Person folgt einer echten Biografie.',
    },
  },
  {
    id: 'daytrip-hamburg',
    name: 'Daytrip Hamburg',
    price: 50,
    category: 'daytrip',
    blurb: {
      en: 'A full day in the Hanseatic neighbour: Speicherstadt, harbour and Elbphilharmonie.',
      de: 'Ein ganzer Tag bei der Hansenachbarin: Speicherstadt, Hafen und Elbphilharmonie.',
    },
  },
  {
    id: 'daytrip-luebeck',
    name: 'Daytrip Lübeck',
    price: 70,
    category: 'daytrip',
    blurb: {
      en: 'The Baltic brick-Gothic capital, Holstentor and marzipan included.',
      de: 'Die Hauptstadt der Backsteingotik, Holstentor und Marzipan inklusive.',
    },
  },
];

export const activityById = new Map(GRUPPEN_ACTIVITIES.map((activity) => [activity.id, activity]));

export function getActivity(id: GruppenActivityId): GruppenActivity {
  const activity = activityById.get(id);

  if (!activity) {
    throw new Error(`Unknown CASA Gruppen activity: ${id}`);
  }

  return activity;
}

/* ------------------------------------------------------------------ *
 * Modules — the Esel price sheet
 * ------------------------------------------------------------------ */

export type GruppenModuleId =
  | 'language-class'
  | 'teaching-material'
  | 'accommodation'
  | 'lunch'
  | 'transport';

export type GruppenWeeks = 1 | 2 | 3 | 4;

export const GRUPPEN_WEEK_OPTIONS: GruppenWeeks[] = [1, 2, 3, 4];

export type GruppenModule = {
  id: GruppenModuleId;
  name: LocalizedText;
  detail: LocalizedText;
  /** Price per person in EUR, indexed by week count. Source: Esel sheet rows 4–8. */
  priceByWeeks: Record<GruppenWeeks, number>;
  /**
   * Modules the group cannot sensibly drop. The language class is the reason the
   * trip qualifies as a study visit at all, so it stays locked on.
   */
  required?: boolean;
};

export const GRUPPEN_MODULES: GruppenModule[] = [
  {
    id: 'language-class',
    required: true,
    name: {
      en: 'German intensive class',
      de: 'Deutsch-Intensivkurs',
    },
    detail: {
      en: 'Mon–Fri, 09:00–12:30. 20 teaching units per week, taught in level-matched groups.',
      de: 'Mo–Fr, 09:00–12:30. 20 Unterrichtseinheiten pro Woche in niveaugerechten Gruppen.',
    },
    priceByWeeks: { 1: 150, 2: 300, 3: 450, 4: 600 },
  },
  {
    id: 'teaching-material',
    name: {
      en: 'Teaching material',
      de: 'Lehrmaterial',
    },
    detail: {
      en: 'Workbook and copied material for the whole stay. Yours to keep.',
      de: 'Arbeitsheft und Kopien für den gesamten Aufenthalt. Bleibt im Besitz der Gruppe.',
    },
    priceByWeeks: { 1: 20, 2: 20, 3: 25, 4: 25 },
  },
  {
    id: 'accommodation',
    name: {
      en: 'Accommodation with host families',
      de: 'Unterkunft in Gastfamilien',
    },
    detail: {
      en: 'Double rooms with Bremen host families we choose in person, including breakfast and dinner.',
      de: 'Doppelzimmer in persönlich ausgewählten Bremer Gastfamilien, inklusive Frühstück und Abendessen.',
    },
    priceByWeeks: { 1: 255, 2: 450, 3: 645, 4: 840 },
  },
  {
    id: 'lunch',
    name: {
      en: 'Lunch at the canteen',
      de: 'Mittagessen in der Kantine',
    },
    detail: {
      en: 'A hot lunch on every school day, between class and the afternoon programme.',
      de: 'Warmes Mittagessen an jedem Schultag, zwischen Unterricht und Nachmittagsprogramm.',
    },
    priceByWeeks: { 1: 60, 2: 120, 3: 180, 4: 240 },
  },
  {
    id: 'transport',
    name: {
      en: 'Bremen public transport ticket',
      de: 'ÖPNV-Ticket Bremen',
    },
    detail: {
      en: 'Unlimited travel on Bremen trams and buses for the length of the stay.',
      de: 'Freie Fahrt in Bremer Straßenbahnen und Bussen für die gesamte Dauer.',
    },
    priceByWeeks: { 1: 25, 2: 50, 3: 65, 4: 70 },
  },
];

export const moduleById = new Map(GRUPPEN_MODULES.map((module) => [module.id, module]));

/** Every module switched on, per week count. Matches the Esel sheet's SUM row. */
export function fullBoardBaseTotal(weeks: GruppenWeeks) {
  return GRUPPEN_MODULES.reduce((total, module) => total + module.priceByWeeks[weeks], 0);
}

/* ------------------------------------------------------------------ *
 * The four packages
 * ------------------------------------------------------------------ */

export type GruppenPackage = {
  slug: GruppenPackageSlug;
  /** The Town Musician this package is named after. */
  animal: LocalizedText;
  /** Scope descriptor shown next to the animal name, e.g. "1 Week Discovery". */
  descriptor: LocalizedText;
  /**
   * Position in the monument, counted from the ground up: 1 = Esel (bottom),
   * 4 = Hahn (top). Also the scope ladder — the lower the animal, the more it carries.
   */
  stackPosition: 1 | 2 | 3 | 4;
  weeks: GruppenWeeks | null;
  /** Advertised entry price per person in EUR. `null` for the fully modular Esel. */
  priceFrom: number | null;
  tagline: LocalizedText;
  intro: LocalizedText;
  bestFor: LocalizedText;
  activities: GruppenActivityId[];
};

/*
 * OPEN WITH THE COORDINATOR — the package premium is unexplained.
 *
 * Rebuilding each fixed package out of the Esel modules and activities below:
 *   Hahn   510 + 32  = 542   advertised 595   (+53)
 *   Katze  940 + 104 = 1044  advertised 1130  (+86)
 *   Hund   940 + 177 = 1117  advertised 1300  (+183)
 *
 * The builder on the same page prices those configurations, so an organiser can
 * reach the gap themselves, and the margin is not consistent between the three.
 * Hiding the per-line prices (see config/gruppen/display.ts) narrows the trail
 * but does not close it — the per-person total still renders.
 *
 * What is needed is one sentence, in writing, saying what the premium buys.
 * Nothing in the repo supports an answer today: accompaniment is already
 * claimed for every package in GRUPPEN_ALWAYS_INCLUDED, and no free-place or
 * group-size rule exists anywhere. Do not invent one. The alternatives are
 * aligning the numbers or not pricing the fixed configurations in the builder.
 */
export const GRUPPEN_PACKAGES: GruppenPackage[] = [
  {
    slug: 'hahn',
    stackPosition: 4,
    animal: { en: 'Hahn', de: 'Hahn' },
    descriptor: { en: '1 Week Discovery', de: '1 Woche Entdecken' },
    weeks: 1,
    priceFrom: 595,
    tagline: {
      en: 'The rooster rides on top of the stack — the shortest way to meet Bremen.',
      de: 'Der Hahn sitzt zuoberst — der kürzeste Weg, Bremen kennenzulernen.',
    },
    intro: {
      en: 'The rooster sits at the top of the stack and sees the whole city at once. One week, twenty teaching units, and four afternoons that take your group behind the scenes at the Weserstadion and inside the studios of Radio Bremen. The shortest way to find out what a language trip to Bremen feels like.',
      de: 'Der Hahn sitzt ganz oben und überblickt die ganze Stadt. Eine Woche, zwanzig Unterrichtseinheiten und vier Nachmittage, die Ihre Gruppe hinter die Kulissen des Weserstadions und in die Studios von Radio Bremen führen. Der kürzeste Weg herauszufinden, wie sich eine Sprachreise nach Bremen anfühlt.',
    },
    bestFor: {
      en: 'First-time groups, tight school calendars, and a first trip abroad for younger classes.',
      de: 'Gruppen beim ersten Mal, enge Schulkalender und die erste Auslandsfahrt jüngerer Klassen.',
    },
    activities: ['cityrallye', 'weserstadion', 'radio-bremen', 'universum'],
  },
  {
    slug: 'katze',
    stackPosition: 3,
    animal: { en: 'Katze', de: 'Katze' },
    descriptor: { en: '2 Week Explorer', de: '2 Wochen Erkunden' },
    weeks: 2,
    priceFrom: 1130,
    tagline: {
      en: 'The cat, third from the ground — long enough that the German starts arriving on its own.',
      de: 'Die Katze, an dritter Stelle — lang genug, dass das Deutsch von selbst kommt.',
    },
    intro: {
      en: 'Two weeks is where a language trip stops being a visit and starts being a stay. Forty teaching units, eight afternoons, and enough time in one host family for the dinner-table German to arrive on its own. The cat explores with curiosity and lands sure-footed — from the Botanika greenhouses to the night watchman’s lantern.',
      de: 'Nach zwei Wochen ist eine Sprachreise kein Besuch mehr, sondern ein Aufenthalt. Vierzig Unterrichtseinheiten, acht Nachmittage und genug Zeit in einer Gastfamilie, damit das Deutsch am Abendbrottisch von selbst kommt. Die Katze erkundet neugierig und landet sicher — von den Gewächshäusern der Botanika bis zur Laterne des Nachtwächters.',
    },
    bestFor: {
      en: 'Two weeks is the length most school groups choose: broad cultural range, balanced pace.',
      de: 'Zwei Wochen wählen die meisten Schulgruppen: breites Kulturprogramm, ausgewogenes Tempo.',
    },
    activities: [
      'cityrallye',
      'botanika',
      'weserstadion',
      'radio-bremen',
      'kunsthalle',
      'universum',
      'klimahaus',
      'nachtwaechter',
    ],
  },
  {
    slug: 'hund',
    stackPosition: 2,
    animal: { en: 'Hund', de: 'Hund' },
    descriptor: { en: '2 Weeks Plus Hamburg', de: '2 Wochen plus Hamburg' },
    weeks: 2,
    priceFrom: 1300,
    tagline: {
      en: 'The dog, on the donkey’s back — the same two weeks, pointed at the region.',
      de: 'Der Hund, auf dem Rücken des Esels — dieselben zwei Wochen, auf die Region gerichtet.',
    },
    intro: {
      en: 'The same two weeks as the Katze, pointed outward: a full day in Hamburg, the harbour by boat, the Klimahaus in Bremerhaven. For groups who have already done a language trip and want the region rather than the town — nose to the ground, new territory, further every day.',
      de: 'Dieselben zwei Wochen wie bei der Katze, nur nach außen gerichtet: ein ganzer Tag in Hamburg, der Hafen per Boot, das Klimahaus in Bremerhaven. Für Gruppen, die schon eine Sprachreise gemacht haben und die Region statt der Stadt wollen — die Nase am Boden, jeden Tag ein Stück weiter.',
    },
    bestFor: {
      en: 'Returning groups, older students, and classes who want day trips beyond Bremen.',
      de: 'Wiederkehrende Gruppen, ältere Lernende und Klassen, die Tagesausflüge über Bremen hinaus wollen.',
    },
    activities: [
      'nachtwaechter',
      'klimahaus',
      'kunsthalle',
      // TODO(coordinator): Union Brauerei's own blurb reads "Adult groups only",
      // but Hund is sold to school classes. Confirm Hund's age floor, or swap
      // this for an equivalently priced activity. Source: Gruppenpakete docx.
      'union-brauerei',
      'radio-bremen',
      'weserstadion',
      'daytrip-hamburg',
      'hafenrundfahrt',
    ],
  },
  {
    slug: 'esel',
    stackPosition: 1,
    animal: { en: 'Esel', de: 'Esel' },
    descriptor: { en: 'Build Your Own', de: 'Selbst zusammenstellen' },
    weeks: null,
    priceFrom: null,
    tagline: {
      en: 'The donkey at the base carries the other three — and this is the one you build yourself.',
      de: 'Der Esel an der Basis trägt die anderen drei — und dieses Paket stellen Sie selbst zusammen.',
    },
    intro: {
      en: 'The donkey stands at the bottom of the stack and carries all the others. This is the package that carries everything else: pick your own length from one to four weeks, switch off any module you have already arranged, and choose your own afternoons from the full list of sixteen. It is also the only route to a three- or four-week stay.',
      de: 'Der Esel steht ganz unten und trägt alle anderen. Dieses Paket trägt alles Übrige: Wählen Sie Ihre eigene Dauer von einer bis vier Wochen, schalten Sie Bausteine ab, die Sie bereits selbst organisiert haben, und stellen Sie Ihre Nachmittage aus allen sechzehn Angeboten zusammen. Es ist außerdem der einzige Weg zu drei oder vier Wochen.',
    },
    bestFor: {
      en: 'Groups with their own accommodation or transport, unusual dates, longer stays, or a specific curriculum to match.',
      de: 'Gruppen mit eigener Unterkunft oder Anreise, ungewöhnlichen Terminen, längeren Aufenthalten oder einem bestimmten Lehrplan.',
    },
    activities: [],
  },
];

export const packageBySlug = new Map(GRUPPEN_PACKAGES.map((item) => [item.slug, item]));

export function getGruppenPackage(slug: string): GruppenPackage | undefined {
  return packageBySlug.get(slug as GruppenPackageSlug);
}

/** Fixed packages only, ordered top of the monument down: Hahn, Katze, Hund, Esel. */
export const GRUPPEN_PACKAGES_BY_STACK = [...GRUPPEN_PACKAGES].sort(
  (a, b) => b.stackPosition - a.stackPosition
);

/** Everything every package includes, regardless of which animal. */
export const GRUPPEN_ALWAYS_INCLUDED: { name: LocalizedText; detail: LocalizedText }[] = [
  {
    name: {
      en: 'German intensive class, Mon–Fri 09:00–12:30',
      de: 'Deutsch-Intensivkurs, Mo–Fr 09:00–12:30',
    },
    detail: {
      en: '20 teaching units per week in level-matched groups.',
      de: '20 Unterrichtseinheiten pro Woche in niveaugerechten Gruppen.',
    },
  },
  {
    name: {
      en: 'Accommodation in double rooms with host families',
      de: 'Unterkunft in Doppelzimmern bei Gastfamilien',
    },
    detail: {
      en: 'Bremen families we choose in person, matched to the group and kept close together.',
      de: 'Persönlich ausgewählte Bremer Familien, passend zur Gruppe und nah beieinander.',
    },
  },
  {
    name: {
      en: 'Full board',
      de: 'Vollverpflegung',
    },
    detail: {
      en: 'Breakfast and dinner with the host family, hot lunch at the canteen.',
      de: 'Frühstück und Abendessen in der Gastfamilie, warmes Mittagessen in der Kantine.',
    },
  },
  {
    name: {
      en: 'Bremen public transport ticket',
      de: 'ÖPNV-Ticket Bremen',
    },
    detail: {
      en: 'Valid for the whole stay, so the group moves independently.',
      de: 'Gültig für den gesamten Aufenthalt, damit die Gruppe selbstständig unterwegs ist.',
    },
  },
  {
    name: {
      en: 'Teaching material',
      de: 'Lehrmaterial',
    },
    detail: {
      en: 'Included and kept by the group afterwards.',
      de: 'Inklusive und verbleibt anschließend bei der Gruppe.',
    },
  },
  {
    name: {
      en: 'Afternoon cultural programme',
      de: 'Kulturprogramm am Nachmittag',
    },
    detail: {
      en: 'Booked, paid and accompanied by CASA — tickets and timings included.',
      de: 'Von CASA gebucht, bezahlt und begleitet — Tickets und Zeitplanung inklusive.',
    },
  },
];

/**
 * The six always-included items as one sentence, for the package dialogs — so
 * something answers "what do I actually get for EUR 595" next to the price.
 * Says nothing GRUPPEN_ALWAYS_INCLUDED does not already assert.
 */
export const GRUPPEN_INCLUDED_SUMMARY: LocalizedText = {
  en: 'Every package covers the class, the host family, all meals, the Bremen transit ticket, the teaching material and the afternoon programme.',
  de: 'Jedes Paket deckt Unterricht, Gastfamilie, alle Mahlzeiten, das Bremer Nahverkehrsticket, das Lehrmaterial und das Nachmittagsprogramm ab.',
};

export const PRICE_DISCLAIMER: LocalizedText = {
  en: 'Prices are per person and non-binding. We confirm the final quote in writing after we have your dates and group size.',
  de: 'Preise gelten pro Person und sind freibleibend. Das verbindliche Angebot bestätigen wir schriftlich, sobald uns Termine und Gruppengröße vorliegen.',
};

export function localized(text: LocalizedText, locale: ContentLocale) {
  return text[locale];
}
