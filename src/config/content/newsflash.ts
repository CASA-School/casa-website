import type { ContentLocale } from '@/lib/content/types';

/**
 * The CASA NewsFlash issue.
 *
 * THIS IS THE FILE THE NEWSFLASH EDITOR CHANGES EACH MONTH. Nothing else needs
 * touching to publish an issue: edit the values below, and /news updates.
 *
 * The shape deliberately mirrors the printed NewsFlash (August 2026) so the
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
  title: Localized;
  body: Localized;
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
  editor: NewsFlashEditor;
};

export const newsFlashIssue: NewsFlashIssue = {
  issue: {
    en: 'August 2026',
    de: 'August 2026',
  },

  quote: {
    text: {
      de: 'Habe Mut, dich deines eigenen Verstandes zu bedienen.',
      en: 'Have the courage to use your own understanding.',
    },
    attribution: 'Immanuel Kant',
  },

  wordOfTheMonth: {
    word: 'Ohrwurm',
    definition: {
      de: 'Lied oder Melodie, die man nicht mehr aus dem Kopf bekommt.',
      en: 'A song or melody you cannot get out of your head.',
    },
  },

  ticker: [
    { de: '21.08. · telc B2 Prüfung bei CASA', en: '21.08. · telc B2 exam at CASA' },
    { de: '22.08. · CSD Bremen, 12 Uhr Altenwall', en: '22.08. · Bremen CSD, 12:00 Altenwall' },
    { de: 'Büro im August · Mo-Do 9-17, Fr 9-13', en: 'Office in August · Mon-Thu 9-17, Fri 9-13' },
    { de: 'Sprachcafé · Termin folgt', en: 'Language café · date to follow' },
  ],

  feature: {
    title: {
      de: 'Die Fussball-Weltmeisterschaft',
      en: 'The football World Cup',
    },
    levels: ['C'],
    body: [
      {
        de: 'Vom 11.06.2026 bis zum 19.07.2026 fand die Fussball-Weltmeisterschaft in Kanada, Mexiko und den USA statt. 48 Mannschaften spielten um den Titel. Am Ende spielte Spanien gegen Argentinien im Finale. Die Spanier gewannen mit 1:0 und sind zum zweiten Mal Weltmeister geworden.',
        en: 'From 11.06.2026 to 19.07.2026 the football World Cup took place in Canada, Mexico and the USA. 48 teams played for the title. Spain met Argentina in the final, won 1:0, and became world champions for the second time.',
      },
      {
        de: 'Habt ihr auch die Weltmeisterschaft verfolgt? Welches Team habt ihr unterstützt? ;)',
        en: 'Did you follow the World Cup too? Which team were you supporting? ;)',
      },
    ],
    aside: {
      icon: 'star',
      text: {
        de: 'Hier bei CASA gab es ein Kicktipp-Spiel und es wurden drei Preise verliehen. Herzlichen Glückwunsch!',
        en: 'Here at CASA we ran a Kicktipp sweepstake and awarded three prizes. Congratulations!',
      },
    },
    photo: {
      src: '/media/casa/newsflash-kicktipp-winners.jpg',
      alt: {
        de: 'Drei CASA Lernende mit ihren Kicktipp-Urkunden und Preisen',
        en: 'Three CASA learners with their Kicktipp certificates and prizes',
      },
    },
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
        id: 'sprachcafe',
        icon: 'chat',
        kind: 'notice',
        levels: ['B', 'C'],
        title: { de: 'Das Sprachcafé', en: 'The language café' },
        body: {
          de: 'Demnächst findet wieder das Sprachcafé statt. Achtet bitte auf weitere Informationen und Aushänge und gebt die Information auch gerne an eure Mitschüler:innen weiter.',
          en: 'The language café is running again soon. Watch for further information and notices, and do pass it on to your classmates.',
        },
      },
    ],
  },

  editor: {
    name: 'Lisa Dao',
    role: {
      de: 'Freiwilligendienst · Redaktion NewsFlash',
      en: 'Volunteer · NewsFlash editor',
    },
    blurb: {
      de: 'Lisa unterstützt das CASA-Team im Büro, kümmert sich um die Cafeteria und schreibt jeden Monat diesen NewsFlash. Ihr habt einen Termin, einen Tipp oder eine Idee für die nächste Ausgabe? Sagt ihr einfach Bescheid.',
      en: 'Lisa supports the CASA team in the office, looks after the cafeteria, and writes this NewsFlash every month. Got a date, a tip or an idea for the next issue? Just let her know.',
    },
    photo: {
      src: '/media/casa/newsflash-editor-lisa-dao.jpg',
      alt: {
        de: 'Lisa Dao, Redakteurin des CASA NewsFlash',
        en: 'Lisa Dao, editor of the CASA NewsFlash',
      },
    },
  },

  notices: [
    {
      id: 'oeffnungszeiten',
      icon: 'clock',
      kind: 'notice',
      title: { de: 'Geänderte Öffnungszeiten', en: 'Changed opening hours' },
      body: {
        de: 'Bitte beachtet die geänderten Öffnungszeiten im August. Bis zum 21.08.2026 hat das Büro von Montag bis Donnerstag von 9-17 Uhr geöffnet und am Freitag von 9-13 Uhr.',
        en: 'Please note the changed opening hours in August. Until 21.08.2026 the office is open Monday to Thursday 9-17 and Friday 9-13.',
      },
    },
    {
      id: 'neues-gesicht',
      icon: 'person',
      kind: 'person',
      levels: ['A', 'B', 'C'],
      title: { de: 'Neues Gesicht bei CASA!', en: 'A new face at CASA!' },
      body: {
        de: 'Seit Anfang August ist die neue Freiwilligendienstlerin da. Sie unterstützt das CASA-Team im Büro, kümmert sich um die Cafeteria und schreibt diesen NewsFlash.',
        en: 'Since the beginning of August our new volunteer has joined us. She supports the CASA team in the office, looks after the cafeteria, and writes this NewsFlash.',
      },
    },
    {
      id: 'daumen-telc',
      icon: 'star',
      kind: 'wish',
      title: { de: 'Wir drücken die Daumen für...', en: 'Fingers crossed for...' },
      body: {
        de: '...alle, die am 21.08.2026 ihre telc B2-Prüfung bei uns schreiben!',
        en: '...everyone sitting their telc B2 exam with us on 21.08.2026!',
      },
    },
    {
      id: 'tipp-csd',
      icon: 'calendar',
      kind: 'tip',
      title: { de: 'Tipp aus dem Büro', en: 'Tip from the office' },
      body: {
        de: 'Am 22. August findet der CSD (Christopher Street Day) Bremen statt. Schaut doch mal vorbei! Beginn ist um 12 Uhr am Altenwall.',
        en: 'Bremen CSD (Christopher Street Day) takes place on 22 August. Do come along — it starts at 12:00 at the Altenwall.',
      },
    },
  ],
};

export function localizedText(value: Localized, locale: ContentLocale) {
  return value[locale] ?? value.en;
}
