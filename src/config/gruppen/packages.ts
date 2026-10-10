import type { ContentLocale } from '@/lib/content/types';
import { pick } from '@/lib/cms/copy';

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
      en: 'A team scavenger hunt through the old town, the classic first-day activity.',
      de: 'Eine Rallye in Teams durch die Altstadt, der Klassiker für den ersten Tag.',
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
      en: 'The greenhouse worlds of Asia in the Rhododendron Park.',
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
      en: 'Dressing rooms, players’ tunnel and press room at Werder Bremen.',
      de: 'Kabine, Spielertunnel und Presseraum bei Werder Bremen.',
    },
  },
  {
    id: 'universum',
    name: 'Universum',
    price: 14,
    category: 'science',
    blurb: {
      en: 'A hands-on museum about technology, nature and people, over three floors.',
      de: 'Ein Museum zum Mitmachen über Technik, Natur und Mensch auf drei Ebenen.',
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
      en: 'After dark, the night watchman takes you through the old town.',
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
      en: 'A museum about emigration, where you follow the life story of a real person.',
      de: 'Ein Museum über die Auswanderung, in dem man der Lebensgeschichte eines echten Menschen folgt.',
    },
  },
  {
    id: 'daytrip-hamburg',
    name: 'Daytrip Hamburg',
    price: 50,
    category: 'daytrip',
    blurb: {
      en: 'A whole day in Hamburg, with the Speicherstadt, the harbour and the Elbphilharmonie.',
      de: 'Ein ganzer Tag in Hamburg mit Speicherstadt, Hafen und Elbphilharmonie.',
    },
  },
  {
    id: 'daytrip-luebeck',
    name: 'Daytrip Lübeck',
    price: 70,
    category: 'daytrip',
    blurb: {
      en: 'A day in Lübeck, with its brick Gothic architecture, the Holstentor and marzipan.',
      de: 'Ein Tag in Lübeck mit Backsteingotik, Holstentor und Marzipan.',
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
      en: 'Intensive German course',
      de: 'Deutsch-Intensivkurs',
    },
    detail: {
      en: 'Mon–Fri, 09:00–12:30. 20 lessons a week, taught in groups matched to level.',
      de: 'Mo–Fr, 09:00–12:30. 20 Unterrichtseinheiten pro Woche in niveaugerechten Gruppen.',
    },
    priceByWeeks: { 1: 150, 2: 300, 3: 450, 4: 600 },
  },
  {
    id: 'teaching-material',
    name: {
      en: 'Course materials',
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
  /** Scope descriptor shown next to the animal name, e.g. "1 week of discovery". */
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
    descriptor: { en: '1 week of discovery', de: '1 Woche Entdecken' },
    weeks: 1,
    priceFrom: 595,
    tagline: {
      en: 'The rooster sits right at the top. With this package, your group gets to know Bremen in a week.',
      de: 'Der Hahn sitzt ganz oben. Behalte den Überblick und lerne Bremen in einer Woche kennen.',
    },
    intro: {
      en: 'The rooster sits right at the top and can see the whole city. In one week your group has twenty lessons and four afternoons of activities, which include a look behind the scenes at the Weserstadion and a visit to the studios of Radio Bremen. It is the quickest way to find out what a language trip to Bremen feels like.',
      de: 'Der Hahn sitzt ganz oben und überblickt die ganze Stadt. In einer Woche hat deine Gruppe zwanzig Unterrichtseinheiten und vier Nachmittage mit Programm. Dabei geht es unter anderem hinter die Kulissen des Weserstadions und in die Studios von Radio Bremen. So findest du auf dem kürzesten Weg heraus, wie sich eine Sprachreise nach Bremen anfühlt.',
    },
    bestFor: {
      en: 'First-time groups, tight school calendars and a first trip abroad for younger classes.',
      de: 'Gruppen, die das erste Mal zu uns kommen, enge Schulkalender und die erste Auslandsfahrt jüngerer Klassen.',
    },
    activities: ['cityrallye', 'weserstadion', 'radio-bremen', 'universum'],
  },
  {
    slug: 'katze',
    stackPosition: 3,
    animal: { en: 'Katze', de: 'Katze' },
    descriptor: { en: '2 weeks of exploring', de: '2 Wochen Erkunden' },
    weeks: 2,
    priceFrom: 1130,
    tagline: {
      en: 'The cat stands third from the ground. Two weeks is long enough for the German to start coming by itself.',
      de: 'Die Katze steht an dritter Stelle. Schärfe deine Sinne, sei neugierig und lande auf allen vier Pfoten in unserer schönen Hansestadt.',
    },
    intro: {
      en: 'Two weeks in Bremen is a proper stay. Your group has forty lessons and eight afternoons of activities, and lives with its host families long enough for the German at the dinner table to come by itself. Like the cat, the group explores the city with curiosity, from the Botanika greenhouses to the night watchman’s tour.',
      de: 'Zwei Wochen in Bremen sind schon ein richtiger Aufenthalt. Deine Gruppe hat vierzig Unterrichtseinheiten und acht Nachmittage mit Programm und lebt lange genug in der Gastfamilie, dass das Deutsch am Abendbrottisch von selbst kommt. Wie die Katze erkundet die Gruppe die Stadt mit Neugier, von den Gewächshäusern der Botanika bis zum Rundgang mit dem Nachtwächter.',
    },
    bestFor: {
      en: 'Most school groups, who usually choose two weeks for a wide culture programme at a balanced pace.',
      de: 'Die meisten Schulgruppen wählen zwei Wochen, mit einem breiten Kulturprogramm in ausgewogenem Tempo.',
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
    descriptor: { en: '2 weeks plus Hamburg', de: '2 Wochen plus Hamburg' },
    weeks: 2,
    priceFrom: 1300,
    tagline: {
      en: 'The dog stands on the donkey’s back. Its two weeks also take your group out into the region.',
      de: 'Der Hund steht auf dem Rücken des Esels. Geh mit ihm auf Wanderschaft in Bremen und darüber hinaus.',
    },
    intro: {
      en: 'The dog has the same two weeks as the cat and also takes your group out into the region, with a whole day in Hamburg, a boat tour of the harbour and the Klimahaus in Bremerhaven. It suits groups who have been on a language trip before and would like to see more of the region.',
      de: 'Der Hund hat dieselben zwei Wochen wie die Katze und führt deine Gruppe auch hinaus in die Region, mit einem ganzen Tag in Hamburg, einer Hafenrundfahrt und dem Klimahaus in Bremerhaven. Er passt zu Gruppen, die schon eine Sprachreise gemacht haben und mehr von der Region sehen möchten.',
    },
    bestFor: {
      en: 'Returning groups, older students and classes who want day trips beyond Bremen.',
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
    descriptor: { en: 'Build your own', de: 'Selbst zusammenstellen' },
    weeks: null,
    priceFrom: null,
    tagline: {
      en: 'The donkey stands at the very bottom and carries the other three. This is the package you put together yourself.',
      de: 'Der Esel steht ganz unten und trägt die anderen drei. Sei stur und unabhängig und stelle dir dein eigenes Programm zusammen.',
    },
    intro: {
      en: 'The donkey stands at the very bottom and carries all the others. With this package you choose the length yourself, from one to four weeks. You leave out anything you have already organised, and you put the afternoons together from all sixteen activities. Three or four weeks are only possible with this package.',
      de: 'Der Esel steht ganz unten und trägt alle anderen. Bei diesem Paket wählst du die Dauer selbst, von einer bis vier Wochen. Bausteine, die du schon selbst organisiert hast, lässt du weg, und die Nachmittage stellst du aus allen sechzehn Angeboten zusammen. Drei oder vier Wochen gibt es nur mit diesem Paket.',
    },
    bestFor: {
      en: 'Groups with their own accommodation or travel arrangements, unusual dates, longer stays or a particular curriculum.',
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
      en: 'Intensive German course, Mon–Fri 09:00–12:30',
      de: 'Deutsch-Intensivkurs, Mo–Fr 09:00–12:30',
    },
    detail: {
      en: '20 lessons a week in groups matched to level.',
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
      en: 'Valid for the whole stay, so the group can get around on its own.',
      de: 'Gültig für den gesamten Aufenthalt, damit die Gruppe selbstständig unterwegs ist.',
    },
  },
  {
    name: {
      en: 'Course materials',
      de: 'Lehrmaterial',
    },
    detail: {
      en: 'Included and kept by the group afterwards.',
      de: 'Inklusive und verbleibt anschließend bei der Gruppe.',
    },
  },
  {
    name: {
      en: 'Afternoon culture programme',
      de: 'Kulturprogramm am Nachmittag',
    },
    detail: {
      en: 'We book it, pay for it and come along, with tickets and timings included.',
      de: 'Wir buchen, bezahlen und begleiten das Programm, Tickets und Zeitplanung inklusive.',
    },
  },
];

/**
 * The six always-included items as one sentence, for the package dialogs — so
 * something answers "what do I actually get for EUR 595" next to the price.
 * Says nothing GRUPPEN_ALWAYS_INCLUDED does not already assert.
 */
export const GRUPPEN_INCLUDED_SUMMARY: LocalizedText = {
  en: 'Every package includes the lessons, the host family, all meals, the Bremen public transport ticket, the course materials and the afternoon programme.',
  de: 'In jedem Paket sind Unterricht, Gastfamilie, alle Mahlzeiten, das Bremer Nahverkehrsticket, das Lehrmaterial und das Nachmittagsprogramm enthalten.',
};

export const PRICE_DISCLAIMER: LocalizedText = {
  en: 'Prices are per person and non-binding. We confirm the final quote in writing after we have your dates and group size.',
  de: 'Preise gelten pro Person und sind freibleibend. Das verbindliche Angebot bestätigen wir schriftlich, sobald uns Termine und Gruppengröße vorliegen.',
};

export function localized(text: LocalizedText, locale: ContentLocale) {
  return pick(locale, text);
}
