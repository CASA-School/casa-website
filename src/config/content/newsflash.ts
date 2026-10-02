import type { ContentLocale } from '@/lib/content/types';

/**
 * The CASA NewsFlash issue.
 *
 * THIS IS THE FILE THE NEWSFLASH EDITOR CHANGES EACH MONTH. Nothing else needs
 * touching to publish an issue: edit the values below, and /news updates.
 *
 * The shape deliberately mirrors the printed NewsFlash (since August 2026) so the
 * person writing it recognises what they are filling in — masthead month, quote
 * of the month, word of the month, and a set of short notices. Longer articles
 * are NOT here: those stay in the news posts the repository already serves, so
 * they keep their own URLs, dates and search indexing.
 *
 * Backend note: every field is a plain serialisable value and every notice has a
 * stable `id`, so this maps to a `newsflash_issues` + `newsflash_notices` pair
 * without reshaping. When that lands, replace the import in
 * src/app/news/page.tsx and delete this file — nothing else reads it.
 */

/** Matches the printed edition's "NIVEAU: A, B, C" labelling. */
export type CefrBand = 'A' | 'B' | 'C';

type Localized = Record<ContentLocale, string>;

/**
 * Icons the editor may pick from. A closed union rather than a free string, so
 * a typo fails the build instead of rendering a blank square, and so the set
 * stays small enough to look like one family.
 */
export type NewsFlashIcon = 'chat' | 'clock' | 'person' | 'star' | 'sparkles' | 'calendar';

export type NewsFlashNotice = {
  /** Stable across issues where the rubric recurs — used as a React key and a future PK. */
  id: string;
  /**
   * Drives the panel treatment, not just an icon:
   *   notice   neutral panel — opening hours, admin
   *   tip      sun-yellow outline — "Tipp aus dem Büro"
   *   wish     sun-yellow outline — "Wir drücken die Daumen"
   *   person   portrait rubric — "Neues Gesicht bei CASA"
   */
  kind: 'notice' | 'tip' | 'wish' | 'person';
  /** Omit only inside `headlines`, where the panel's own title heads the item. */
  title?: Localized;
  body: Localized;
  /** Items listed under the body (podcasts, dates). Names, so not localised. */
  list?: Localized[];
  /** Spans two columns from lg up, to close a row the issue would leave short. */
  wide?: boolean;
  /** Omit when an item is not level-specific. */
  levels?: CefrBand[];
  icon: NewsFlashIcon;
};

/**
 * The person who writes and publishes the issue. Rendered as a masthead credit,
 * which is why it carries a real name and a real photograph.
 *
 * CLAUDE.md hard rule 2 restricts named person-specific portraits to verified
 * identities. This one is verified by the site owner directly, and it is an
 * editorial credit rather than a testimonial — no quote is attributed to her.
 * The photograph is her own from the printed NewsFlash she authored.
 */
export type NewsFlashEditor = {
  name: string;
  role: Localized;
  blurb: Localized;
  photo: { src: string; alt: Localized };
};

/**
 * The month's written feature — the long block the printed edition leads with
 * ("Die Fussball-Weltmeisterschaft" in August 2026).
 *
 * Distinct from the news post the repository serves: this one is written FOR the
 * issue by the NewsFlash editor, carries a level tag, and does not get its own
 * URL. `body` is an array so the editor writes paragraphs without touching
 * markup, and `aside` is the small side note the printed sheet sets beside the
 * photograph.
 */
export type NewsFlashFeature = {
  title: Localized;
  levels: CefrBand[];
  body: Localized[];
  aside?: {
    text: Localized;
    icon: NewsFlashIcon;
  };
  photo?: {
    src: string;
    alt: Localized;
  };
};

export type NewsFlashIssue = {
  /** Masthead date line, e.g. "August 2026". */
  issue: Localized;
  quote: {
    text: Localized;
    /** Attribution is a name, not localised. */
    attribution: string;
  };
  wordOfTheMonth: {
    word: string;
    definition: Localized;
  };
  /**
   * Short, time-sensitive facts for the ticker under the masthead — dates,
   * deadlines, opening hours. Keep each to a few words.
   *
   * Deliberately NOT prose, and deliberately duplicated information: every item
   * here is also stated in full in a rubric below. Moving text is hard to read,
   * and this page's readers are learning the language it is written in, so
   * nothing may live ONLY in the ticker.
   */
  ticker: Localized[];
  /** The month's lead written piece. */
  feature: NewsFlashFeature;
  /**
   * The lead column. In the printed edition this is the tall tinted panel headed
   * "Schlagzeilen" — a grouped run of headline items rather than a single
   * notice, which is why it is its own field and not another entry in `notices`.
   */
  headlines: {
    title: Localized;
    items: NewsFlashNotice[];
  };
  notices: NewsFlashNotice[];
  /** Omit when the printed issue carries no editor credit (October 2026 does not). */
  editor?: NewsFlashEditor;
};

/*
 * OCTOBER 2026, from the printed "News Flash Oktober 26" (brief 2026-10-02).
 * German copied word for word, with "auf deutsch" corrected to "auf Deutsch".
 * The August issue (the World Cup feature, the Kicktipp photo, the editor
 * credit) is no longer shown; it is in git history (commit bbd7abb).
 */
export const newsFlashIssue: NewsFlashIssue = {
  issue: {
    en: 'October 2026',
    de: 'Oktober 2026',
  },

  quote: {
    text: {
      de: 'Jedem Anfang wohnt ein Zauber inne.',
      en: 'A magic dwells in every beginning.',
    },
    attribution: 'Hermann Hesse',
  },

  wordOfTheMonth: {
    word: 'Schnapsidee',
    definition: {
      de: 'verrückter, unüberlegter oder unsinniger Einfall',
      en: 'a crazy, rash or nonsensical idea',
    },
  },

  ticker: [
    { de: '02.10.–04.10. · Tag der Deutschen Einheit in der Innenstadt', en: '02.10.–04.10. · German Unity Day in the city centre' },
    { de: '16.10. · telc B2-Prüfung bei CASA', en: '16.10. · telc B2 exam at CASA' },
    { de: '16.10.–01.11. · Freimarkt auf der Bürgerweide', en: '16.10.–01.11. · Freimarkt fair on the Bürgerweide' },
    { de: '24.10. · Freimarktsumzug, 10 Uhr', en: '24.10. · Freimarkt parade, 10:00' },
    { de: '30.10. · telc C1-HS-Prüfung bei CASA', en: '30.10. · telc C1 Hochschule exam at CASA' },
  ],

  /*
   * The printed October sheet has no long feature; its largest text block is the
   * Stammtisch invitation, so that takes the feature's place. No photograph.
   */
  feature: {
    title: {
      de: 'Stammtisch im Lagerhaus',
      en: 'Stammtisch at the Lagerhaus',
    },
    levels: ['A', 'B', 'C'],
    body: [
      {
        de: 'Das CASA-Team lädt euch zu einem monatlichen Treffen abends im Lagerhaus (Schildstraße 12–19, 28203 Bremen) ein. Dort möchten wir mit euch zusammen auf Deutsch ins Gespräch kommen und miteinander Zeit verbringen.',
        en: 'The CASA team invites you to a monthly evening get-together at the Lagerhaus (Schildstraße 12–19, 28203 Bremen). We want to talk with you in German and spend time together.',
      },
      {
        de: 'Die Termine werden bald kommen.',
        en: 'The dates will follow soon.',
      },
      {
        de: 'Alle sind herzlich eingeladen!',
        en: 'Everyone is warmly invited!',
      },
    ],
  },

  headlines: {
    /*
      Left in German in both locales, like "NewsFlash" itself. The rubric names
      are part of the publication's identity rather than UI copy, and an English
      reader at a German language school meets "Schlagzeilen" as a word to learn
      — which is rather the point of the level tags beside it.
    */
    title: { de: 'Schlagzeilen', en: 'Schlagzeilen' },
    items: [
      {
        id: 'gruppe-viborg',
        icon: 'sparkles',
        kind: 'notice',
        levels: ['C'],
        body: {
          de: 'Im September durften wir wieder eine weitere Gruppe aus dem Ausland begrüßen. Die Schülergruppe kam aus Viborg in Dänemark. Gemeinsam mit unseren Freiwilligendienstlerinnen haben sie nach dem Unterricht am Vormittag Bremen auf verschiedene Arten erkundet. Sie haben unter anderem das Universum und den Bunker Valentin in Bremen Farge besucht.',
          en: 'In September we welcomed another group from abroad: a school group from Viborg in Denmark. After their morning lessons they explored Bremen in many ways together with our volunteers, visiting the Universum science centre and the Valentin submarine bunker in Bremen-Farge, among other places.',
        },
      },
    ],
  },

  notices: [
    {
      id: 'daumen-telc',
      icon: 'star',
      kind: 'wish',
      title: { de: 'Wir drücken allen …', en: 'Fingers crossed for …' },
      body: {
        de: '…, die bei uns am 16.10.2026 ihre telc B2-Prüfung oder am 30.10.2026 ihre telc C1-HS-Prüfung schreiben, … die Daumen!',
        en: '… everyone sitting their telc B2 exam with us on 16.10.2026 or their telc C1 Hochschule exam on 30.10.2026!',
      },
    },
    {
      id: 'podcasts',
      icon: 'chat',
      kind: 'notice',
      levels: ['A', 'B', 'C'],
      title: { de: 'Podcast zum Deutschlernen', en: 'Podcasts for learning German' },
      body: {
        de: 'Sprachen kann man einfacher lernen, wenn man sie hört. Hier sind einige Podcasts, die ihr auf dem Weg zu CASA und/oder in eurer Freizeit hören könnt:',
        en: 'Languages are easier to learn when you hear them. Here are some podcasts to listen to on your way to CASA or in your free time:',
      },
      list: [
        { de: 'Easy German: Learn German with native speakers', en: 'Easy German: Learn German with native speakers' },
        { de: 'Tagesschau in einfacher Sprache', en: 'Tagesschau in einfacher Sprache' },
        { de: 'Slow German Podcast for Beginners', en: 'Slow German Podcast for Beginners' },
      ],
    },
    {
      id: 'veranstaltungen',
      icon: 'calendar',
      kind: 'tip',
      wide: true,
      title: { de: 'Veranstaltungen im Oktober', en: 'Events in October' },
      body: {
        de: 'Tipps aus dem Büro:',
        en: 'Tips from the office:',
      },
      list: [
        { de: '02.10.–04.10.: Große Veranstaltung zum Tag der Deutschen Einheit in der Innenstadt Bremens', en: '02.10.–04.10.: Big German Unity Day celebration in Bremen city centre' },
        { de: '16.10.–01.11.: Freimarkt auf der Bürgerweide', en: '16.10.–01.11.: Freimarkt fair on the Bürgerweide' },
        { de: '24.10.: Freimarktsumzug, 10 Uhr', en: '24.10.: Freimarkt parade, 10:00' },
      ],
    },
  ],
};

export function localizedText(value: Localized, locale: ContentLocale) {
  return value[locale] ?? value.en;
}
