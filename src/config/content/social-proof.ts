import type { ContentLocale, SocialProofItem } from '@/lib/content/types';
import { pick } from '@/lib/cms/copy';

/**
 * The learner testimonials CASA publishes, on the courses they were written about.
 *
 * WHAT CHANGED AND WHY
 *
 * This file used to hold twelve invented quotes attributed to anonymous
 * archetypes — "Former intensive student, Brazil", "CASA community post, Spain",
 * "Exam candidate, Turkey" — each carrying `verificationStatus: 'verified'` and a
 * `sourceUrl` pointing at CASA's real Google Maps listing or real Instagram
 * account. So fabricated praise was presented as a verified review, with a link
 * that implied you could go and read it. Nothing on those pages says any of it.
 *
 * casa-bremen.de publishes SEVEN real testimonials, each on the page for the
 * course it is about, each attributed to a first name. Those are what this file
 * holds now.
 *
 * RULES THAT APPLY HERE
 *
 * 1. `courseSlug` binds a quote to the course it was written about. Narges is
 *    describing the afternoon intensive; showing her on the Firmenunterricht page
 *    would be a small lie assembled out of true parts. A quote with no slug is
 *    school-wide and may appear anywhere.
 * 2. NO PORTRAITS, EVER, on these. CLAUDE.md hard rule 2 forbids pairing a named
 *    testimonial with a person-specific portrait unless the identity and the
 *    quote-to-person link are both verified. CASA publishes the names but no
 *    photographs, and the only portrait files on hand are synthetic. A real name
 *    beside a generated face is a fabricated person.
 * 3. Quotes are reproduced as CASA publishes them, in the language they were
 *    written in. Several learners wrote in English on the German site; that is
 *    kept rather than "translated", because a testimonial is someone's own words.
 *    Only light typo repair (CASA's page has "Fatameh", spacing slips, a missing
 *    space after a full stop) — never rephrasing.
 *    Since 2026-10-01 (the go-live brief) German pages show a faithful German
 *    translation of an English quote, always labelled "aus dem Englischen
 *    übersetzt" in the attribution so it never passes as the learner's own
 *    words. The verbatim original stays in `quote` and on English pages.
 *
 * VERIFIED 2026-08-18 against the seven casa-bremen.de/sprachkurse/* pages.
 *
 * GOOGLE REVIEWS (2026-10-20). CASA's content review asked for better quotes on the homepage and the
 * intensive and evening pages. Seven 5-star reviews from CASA's Google listing follow the published
 * quotes, under the same rules, with their stars (`google`); the homepage shows only them, course
 * pages lead with their own voices and fill from them. Narges and Fatameh left the course pages.
 */

type TestimonialSource = {
  id: string;
  /** First name as CASA prints it. */
  person: string;
  /** The course page it appears on. Omit for a school-wide quote. */
  courseSlug?: string;
  /** The exam this learner actually sat, if any. */
  examCode?: string;
  /** The language the learner actually wrote in. */
  writtenIn: ContentLocale;
  /** Verbatim, as casa-bremen.de publishes it. Never edited. */
  quote: string;
  /**
   * The part that renders. MUST BE A CONTIGUOUS SUBSTRING OF `quote`.
   *
   * CASA's real testimonials run from 101 to 460 characters, and dropping them
   * straight into the cards produced a section a full screen tall with one tile
   * cut off mid-sentence by a line-clamp and the featured tile — which has no
   * clamp at all — running to eleven lines. Uneven card heights read as a bug,
   * and a quote nobody finishes persuades nobody.
   *
   * So each one is trimmed editorially to roughly 100–170 characters: whole
   * sentences, in order, no ellipses, nothing paraphrased. The substring rule is
   * enforced by a test, which is the point — it makes it impossible to quietly
   * reword what a real person said while their name is still attached to it.
   * Context that gets trimmed away (which course, which levels) is in the
   * attribution line underneath anyway.
   */
  excerpt: string;
  /** What the learner says about themselves, used in place of a country. */
  context: { en: string; de: string };
  /**
   * The other language's translation, labelled wherever it shows: German pages' translation of an
   * English quote, English pages' translation of a German one. Same excerpt rule as above: the
   * excerpt is a contiguous substring of the translated quote.
   */
  translation?: Partial<Record<ContentLocale, { quote: string; excerpt: string }>>;
  /** A review on CASA's Google listing, with its stars, rather than a quote from casa-bremen.de. */
  google?: { rating: number };
  /** Further course pages it is about (Olexandra took the intensive and the evening course). */
  alsoOn?: string[];
  /**
   * `false`: no longer on the course pages. CASA's content review (2026-10-20) asked for new quotes
   * there and on the homepage, and Google reviews took their place; the quote stays for the page
   * that names it (the exams page names Fatameh, who sat telc B2).
   */
  coursePage?: false;
};

/** Where a course page's fill of Google reviews starts. */
const FILL_FROM: Record<string, string> = { 'intensive-german': 'mila-google', 'evening-german': 'roberto-google' };

/** CASA's Google listing, where the reviews are. */
const GOOGLE_LISTING = 'https://maps.google.com/?cid=4736578749741248132';

const TESTIMONIALS: TestimonialSource[] = [
  {
    id: 'narges-intensive',
    coursePage: false,
    person: 'Narges',
    courseSlug: 'intensive-german',
    writtenIn: 'en',
    quote:
      'It was such a pleasant time. I hated language courses my entire life and I started at CASA not with a lot of hope! I have been participating in the afternoon lectures for about a year and it was great! Although I was doing it after work, the classroom was full of energy and fun. My German improved significantly so that I started communicating in German in our work gatherings. The staff are very kind and accommodating and you are treated respectfully.',
    excerpt:
      'I hated language courses my entire life and I started at CASA not with a lot of hope! I have been participating in the afternoon lectures for about a year and it was great!',
    context: {
      en: 'Afternoon intensive course, about a year',
      de: 'Intensivkurs am Nachmittag, etwa ein Jahr',
    },
    translation: {
      de: {
        quote:
          'Es war eine so schöne Zeit. Ich habe Sprachkurse mein ganzes Leben lang gehasst und bin ohne große Hoffnung zu CASA gekommen! Ich habe etwa ein Jahr lang den Nachmittagsunterricht besucht, und es war großartig! Obwohl ich nach der Arbeit kam, war der Kursraum voller Energie und Spaß. Mein Deutsch hat sich so deutlich verbessert, dass ich bei Treffen auf der Arbeit angefangen habe, Deutsch zu sprechen. Die Mitarbeitenden sind sehr freundlich und entgegenkommend, und man wird respektvoll behandelt.',
        excerpt:
          'Ich habe Sprachkurse mein ganzes Leben lang gehasst und bin ohne große Hoffnung zu CASA gekommen! Ich habe etwa ein Jahr lang den Nachmittagsunterricht besucht, und es war großartig!',
      },
    },
  },
  {
    id: 'fatameh-evening',
    coursePage: false,
    person: 'Fatameh',
    courseSlug: 'evening-german',
    examCode: 'telc_b2',
    writtenIn: 'en',
    quote:
      'I regularly visited evening German courses (A2 to B2) and also had my telc B2 exam at CASA. It was great! My teachers, among them Claudia, were all very nice, professional, and motivated. Communication with admins was also always nice, helpful, and pleasant. I would definitely recommend it!',
    excerpt:
      'I regularly visited evening German courses (A2 to B2) and also had my telc B2 exam at CASA. It was great! My teachers, among them Claudia, were all very nice, professional, and motivated.',
    context: {
      en: 'Evening courses A2 to B2 and the telc Deutsch B2 exam',
      de: 'Abendkurse A2 bis B2 und die telc-B2-Prüfung',
    },
    translation: {
      de: {
        quote:
          'Ich habe regelmäßig Abendkurse in Deutsch besucht (A2 bis B2) und auch meine telc B2 Prüfung bei CASA abgelegt. Es war großartig! Meine Lehrkräfte, darunter Claudia, waren alle sehr nett, professionell und motiviert. Auch die Kommunikation mit der Verwaltung war immer nett, hilfsbereit und angenehm. Ich kann es auf jeden Fall empfehlen!',
        excerpt:
          'Ich habe regelmäßig Abendkurse in Deutsch besucht (A2 bis B2) und auch meine telc B2 Prüfung bei CASA abgelegt. Es war großartig!',
      },
    },
  },
  {
    id: 'sulaiman-special',
    person: 'Sulaiman',
    courseSlug: 'special-courses',
    writtenIn: 'de',
    quote:
      'Der B1/B2 Grammatik-Kurs hat mir bemerkenswert geholfen, meine mündlichen und schriftlichen Deutschkenntnisse zu verbessern. Vom Kursmaterial über die effiziente Nutzung und Aufteilung der Kurszeit, die freundliche Lehrkraft bis hin zur zentralen Lage der Akademie – ein wirklich hervorragendes Preis-Leistungs-Verhältnis. Sehr zu empfehlen.',
    excerpt:
      'Der B1/B2 Grammatik-Kurs hat mir bemerkenswert geholfen, meine mündlichen und schriftlichen Deutschkenntnisse zu verbessern.',
    context: {
      en: 'B1/B2 grammar special course',
      de: 'Spezialkurs Grammatik B1/B2',
    },
  },
  {
    id: 'laura-medical',
    person: 'Laura',
    courseSlug: 'medical-german',
    writtenIn: 'en',
    quote:
      'I am a student at CASA, I am taking part in the intensive course and right now at the B1 level. I am having a great experience here, the teachers are great as well as the school’s environment. It makes justice to its name, I truly feel welcome and at home here. I am also really pleased with my development in the language in such a short time.',
    excerpt:
      'It makes justice to its name, I truly feel welcome and at home here. I am also really pleased with my development in the language in such a short time.',
    context: {
      en: 'Intensive course, B1 level',
      de: 'Intensivkurs, Niveau B1',
    },
    translation: {
      de: {
        quote:
          'Ich lerne bei CASA im Intensivkurs und bin gerade auf Niveau B1. Ich mache hier großartige Erfahrungen: Die Lehrkräfte sind toll, und die Atmosphäre an der Schule ebenso. Die Schule wird ihrem Namen gerecht, ich fühle mich hier wirklich willkommen und zu Hause. Außerdem bin ich sehr zufrieden mit meiner sprachlichen Entwicklung in so kurzer Zeit.',
        excerpt:
          'Die Schule wird ihrem Namen gerecht, ich fühle mich hier wirklich willkommen und zu Hause. Außerdem bin ich sehr zufrieden mit meiner sprachlichen Entwicklung in so kurzer Zeit.',
      },
    },
  },
  {
    id: 'majd-in-company',
    person: 'Majd',
    courseSlug: 'in-company',
    writtenIn: 'de',
    quote:
      'Sehr qualifizierte und professionelle Lehrer*innen, familiäre Atmosphäre. Man fühlt sich wie zu Hause.',
    excerpt:
      'Sehr qualifizierte und professionelle Lehrer*innen, familiäre Atmosphäre. Man fühlt sich wie zu Hause.',
    context: {
      en: 'Participant, in-company teaching',
      de: 'Teilnehmer Firmenunterricht',
    },
  },
  {
    id: 'ahmed-bildungszeit',
    person: 'Ahmed',
    courseSlug: 'bildungszeit',
    writtenIn: 'de',
    quote:
      'Eine meiner besten Lernerfahrungen! Die Lehrer sind professionell, die Kurse sind effektiv und außerdem ist das Management-Team sehr freundlich und hilfsbereit. Ich würde diese Schule auf jeden Fall empfehlen!',
    excerpt:
      'Eine meiner besten Lernerfahrungen! Die Lehrer sind professionell, die Kurse sind effektiv und außerdem ist das Management-Team sehr freundlich und hilfsbereit.',
    context: {
      en: 'Bildungszeit course',
      de: 'Bildungszeit-Kurs',
    },
  },
  {
    id: 'elena-groups',
    person: 'Elena',
    courseSlug: 'german-for-groups',
    writtenIn: 'de',
    quote:
      'Wir, eine Schülergruppe aus Sibirien, haben in der Sprachschule CASA einen Sommersprachkurs gemacht. Die Kinder von 12 bis 17 Jahren wurden in den Gastfamilien untergebracht. Wir bedanken uns bei den Gasteltern für die lockere Atmosphäre und die Sorge für die Kinder. Alle Schüler sind vom Empfang der Gastfamilien begeistert. Die Schüler wurden ständig zum Sprechen motiviert. Abwechslungsreiche Unterrichtsstunden und internationale Kontakte machen diese Sprachschule attraktiv.',
    excerpt:
      'Die Schüler wurden ständig zum Sprechen motiviert. Abwechslungsreiche Unterrichtsstunden und internationale Kontakte machen diese Sprachschule attraktiv.',
    context: {
      en: 'Accompanying teacher, school group from Siberia',
      de: 'Begleitende Lehrerin, Schülergruppe aus Sibirien',
    },
  },
  /*
   * Google reviews (CASA's listing, read 2026-10-20, Rahman: „better reviews … casa google reviews"):
   * 5-star reviews from the last twelve months, written in German. `quote` is the review as posted,
   * with only reaction counts and stray quotation marks removed; the excerpt is whole sentences of it.
   * First name and the initial of the last name, as Google shows them.
   */
  {
    id: 'mila-google',
    person: 'Mila',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Ich habe an dieser Schule alle Kurse von A1 bis C1 besucht und danach die C1-Prüfung bestanden. Ich finde, dass die Lerninhalte dort bestmöglich an die Lernenden angepasst sind. Außerdem möchte ich mich bei Klaudia und Lutz bedanken – dank ihrer Unterstützung war ich gut auf die Prüfung vorbereitet, und auf meinem Zertifikat steht „Gut“.',
    excerpt:
      'Ich habe an dieser Schule alle Kurse von A1 bis C1 besucht und danach die C1-Prüfung bestanden. Ich finde, dass die Lerninhalte dort bestmöglich an die Lernenden angepasst sind.',
    context: { de: 'Kurse A1 bis C1 und die C1-Prüfung', en: 'Courses A1 to C1 and the C1 exam' },
    translation: {
      en: {
        quote:
          'I attended all the courses from A1 to C1 at this school and then passed the C1 exam. I think the course content there is adapted to the learners as well as it possibly could be. I would also like to thank Klaudia and Lutz – thanks to their support I was well prepared for the exam, and my certificate says “Gut”.',
        excerpt:
          'I attended all the courses from A1 to C1 at this school and then passed the C1 exam. I think the course content there is adapted to the learners as well as it possibly could be.',
      },
    },
  },
  {
    id: 'ty-google',
    person: 'T. Y.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Vor zehn Jahren habe ich bei der CASA Sprachschule Deutsch von Grund auf bis zum C1-Niveau gelernt. Der Unterricht war gut strukturiert und die Lehrkräfte sehr engagiert. Axel und Maria waren immer geduldig und hilfsbereit ❤️ Ich habe hier nicht nur Deutsch gelernt, sondern auch viele Tipps und Buchempfehlungen bekommen ✨ Auch die Lernatmosphäre hat mir gut gefallen. In den Pausen konnte man sich gut mit anderen Schülern austauschen ☺️ Inzwischen habe ich meinen Bachelor und Master in einem MINT-Studiengang abgeschlossen, als Werkstudentin in einem großen Industrieunternehmen gearbeitet und nun Jobangebote in meinem Fachbereich erhalten. Die Zeit bei CASA hat einen wichtigen Beitrag zu meinem bisherigen Werdegang geleistet. Ich kann die Sprachschule auf jeden Fall weiterempfehlen 😊',
    excerpt:
      'Vor zehn Jahren habe ich bei der CASA Sprachschule Deutsch von Grund auf bis zum C1-Niveau gelernt. Der Unterricht war gut strukturiert und die Lehrkräfte sehr engagiert.',
    context: { de: 'Von Anfang an bis C1, heute mit Bachelor und Master', en: 'From the start to C1, now with a bachelor’s and a master’s degree' },
    translation: {
      en: {
        quote:
          'Ten years ago I learnt German at the CASA language school from scratch up to C1 level. The lessons were well structured and the teachers very committed. Axel and Maria were always patient and helpful ❤️ I didn’t just learn German here, I also got lots of tips and book recommendations ✨ I liked the learning atmosphere too. In the breaks it was easy to talk with other students ☺️ Since then I have completed my bachelor’s and master’s degrees in a STEM subject, worked as a student employee at a large industrial company and now have job offers in my field. My time at CASA made an important contribution to my career so far. I can definitely recommend the school 😊',
        excerpt:
          'Ten years ago I learnt German at the CASA language school from scratch up to C1 level. The lessons were well structured and the teachers very committed.',
      },
    },
  },
  {
    id: 'olexandra-google',
    person: 'Olexandra N.',
    courseSlug: 'evening-german',
    alsoOn: ['intensive-german'],
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Mein Mann und ich haben gemeinsam die B1- und B2-Kurse bei CASA Bremen besucht. Wir haben an den Intensiv- und Abendkursen teilgenommen und sind absolut begeistert von unserer Erfahrung. Ein großes Dankeschön geht an die Studienleitung, Bettina Rick und Tanja Langenickel, für die hervorragende Organisation. Alles war sehr strukturiert und professionell. Besonders bedanken möchten wir uns bei den Lehrkräften. Der Unterricht war immer interessant und hat uns sehr geholfen, uns beim Sprechen viel sicherer zu fühlen. Auch das Team am Empfang war immer super freundlich und hilfsbereit bei allen Fragen. Wir können CASA Bremen jedem empfehlen, der mit Freude und Erfolg Deutsch lernen möchte. Vielen Dank für die schöne Zeit und die tolle Unterstützung!',
    excerpt: 'Der Unterricht war immer interessant und hat uns sehr geholfen, uns beim Sprechen viel sicherer zu fühlen.',
    context: { de: 'Intensiv- und Abendkurse B1 und B2', en: 'Intensive and evening courses, B1 and B2' },
    translation: {
      en: {
        quote:
          'My husband and I took the B1 and B2 courses at CASA Bremen together. We attended the intensive and the evening courses and are absolutely delighted with our experience. A big thank-you goes to the directors of studies, Bettina Rick and Tanja Langenickel, for the excellent organisation. Everything was very structured and professional. We would especially like to thank the teachers. The lessons were always interesting and helped us a lot to feel much more confident when speaking. The team at reception was also always super friendly and helpful with every question. We can recommend CASA Bremen to anyone who wants to learn German with joy and success. Thank you very much for the lovely time and the great support!',
        excerpt: 'The lessons were always interesting and helped us a lot to feel much more confident when speaking.',
      },
    },
  },
  {
    id: 'perwin-google',
    person: 'Perwin S.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Meine Erfahrung an dieser Sprachschule war wirklich hervorragend. Alle Lehrkräfte und Mitarbeiter waren sehr freundlich, herzlich und hilfsbereit. Das Curriculum war ausgezeichnet und gut strukturiert. Dank dieser Schule habe ich viel gelernt und die C1-Prüfung erfolgreich bestanden. Vielen Dank an das gesamte Team',
    excerpt:
      'Das Curriculum war ausgezeichnet und gut strukturiert. Dank dieser Schule habe ich viel gelernt und die C1-Prüfung erfolgreich bestanden.',
    context: { de: 'Die C1-Prüfung bestanden', en: 'Passed the C1 exam' },
    translation: {
      en: {
        quote:
          'My experience at this language school was truly excellent. All the teachers and staff were very friendly, warm and helpful. The curriculum was excellent and well structured. Thanks to this school I learnt a lot and passed the C1 exam. Many thanks to the whole team',
        excerpt: 'The curriculum was excellent and well structured. Thanks to this school I learnt a lot and passed the C1 exam.',
      },
    },
  },
  {
    id: 'roberto-google',
    person: 'Roberto Z.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Ich habe hier in den letzten drei Jahren Deutsch von A1 bis C1 gelernt und kann es jedem wärmstens empfehlen, der die Sprache lernen möchte!',
    excerpt:
      'Ich habe hier in den letzten drei Jahren Deutsch von A1 bis C1 gelernt und kann es jedem wärmstens empfehlen, der die Sprache lernen möchte!',
    context: { de: 'A1 bis C1 in drei Jahren', en: 'A1 to C1 in three years' },
    translation: {
      en: {
        quote: 'I learnt German here from A1 to C1 over the last three years and can warmly recommend it to anyone who wants to learn the language!',
        excerpt: 'I learnt German here from A1 to C1 over the last three years and can warmly recommend it to anyone who wants to learn the language!',
      },
    },
  },
  {
    id: 'darwish-google',
    person: 'Darwish B.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Der Unterricht ist hervorragend strukturiert, das gesamte Team – Lehrkräfte wie Büromitarbeiter – ist äußerst freundlich und professionell. Angenehme Lernatmosphäre und ein sehr gutes Preis-Leistungs-Verhältnis.',
    excerpt:
      'Der Unterricht ist hervorragend strukturiert, das gesamte Team – Lehrkräfte wie Büromitarbeiter – ist äußerst freundlich und professionell.',
    context: { de: 'Über Unterricht und Team', en: 'On the lessons and the team' },
    translation: {
      en: {
        quote:
          'The lessons are excellently structured, and the whole team – teachers and office staff alike – is extremely friendly and professional. A pleasant learning atmosphere and very good value for money.',
        excerpt: 'The lessons are excellently structured, and the whole team – teachers and office staff alike – is extremely friendly and professional.',
      },
    },
  },
  {
    id: 'elif-google',
    person: 'Elif Sude B.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Ich habe am Casa-Kurs von B1 bis C1 teilgenommen und war sehr zufrieden mit den Lehrern und den Lernmodulen. Besonders Claudia Groene hat mir unglaublich geholfen. Vieles, was ich gelernt habe, verdanke ich ihren liebevollen Anleitungen. Vielen Dank!',
    excerpt: 'Ich habe am Casa-Kurs von B1 bis C1 teilgenommen und war sehr zufrieden mit den Lehrern und den Lernmodulen.',
    context: { de: 'Kurse B1 bis C1', en: 'Courses B1 to C1' },
    translation: {
      en: {
        quote:
          'I took part in the CASA course from B1 to C1 and was very happy with the teachers and the learning modules. Claudia Groene in particular helped me enormously. I owe much of what I learnt to her caring guidance. Thank you very much!',
        excerpt: 'I took part in the CASA course from B1 to C1 and was very happy with the teachers and the learning modules.',
      },
    },
  },
];

function toSocialProof(source: TestimonialSource, locale: ContentLocale): SocialProofItem {
  // A page in the other language shows the labelled translation (rule 3).
  const translated = locale !== source.writtenIn ? source.translation?.[locale] : undefined;
  const label = locale === 'de' ? 'aus dem Englischen übersetzt' : 'translated from German';

  return {
    id: `${source.id}-${locale}`,
    locale,
    // `quote` is what renders, so it carries the excerpt. The verbatim text stays
    // on `quoteFull` — auditable, and the guard test compares the two.
    quote: translated?.excerpt ?? source.excerpt,
    quoteFull: translated?.quote ?? source.quote,
    personDisplay: source.person,
    // The old field was `country`, filled with invented nationalities. CASA
    // publishes what the learner studied, not where they are from, and that is
    // the more useful line beside a course testimonial anyway.
    country: translated ? `${pick(locale, source.context)} · ${label}` : pick(locale, source.context),
    courseSlug: source.courseSlug,
    examCode: source.examCode,
    sourcePlatform: source.google ? 'google_reviews' : 'website',
    sourceUrl: source.google ? GOOGLE_LISTING : 'https://casa-bremen.de/sprachkurse/deutsch-intensiv',
    verificationStatus: 'verified',
    rating: source.google?.rating,
  };
}

/**
 * The testimonials in `locale`, built when a page asks, so their course lines go
 * through the website editor (edits, tags, the prepared languages). The quotes
 * themselves stay as the learner wrote them.
 */
export function socialProofFor(locale: ContentLocale): SocialProofItem[] {
  return TESTIMONIALS.map((item) => toSocialProof(item, locale));
}

export const socialProofByLocale: Record<ContentLocale, SocialProofItem[]> = {
  en: TESTIMONIALS.map((item) => toSocialProof(item, 'en')),
  de: TESTIMONIALS.map((item) => toSocialProof(item, 'de')),
};

/**
 * Testimonials for one course, most specific first.
 *
 * A course page leads with its own learner's words and fills the rest of the row
 * from the school-wide pool, so a format with one published quote still gets a
 * populated section instead of a lonely single card.
 */
export function socialProofForCourse(slug: string, locale: ContentLocale): SocialProofItem[] {
  const onPages = TESTIMONIALS.filter((item) => item.coursePage !== false);
  const own = onPages.filter((item) => item.courseSlug === slug || item.alsoOn?.includes(slug));
  // The school-wide Google reviews fill the rest, started at a different one per course so two
  // course pages do not show the same three: the intensive page goes on with Mila and T. Y., the
  // evening page with Roberto and Darwish (CASA's content review, 2026-10-20).
  const pool = onPages.filter((item) => item.google && !item.courseSlug);
  const chosen = pool.findIndex((item) => item.id === FILL_FROM[slug]);
  const start = chosen >= 0 ? chosen : pool.length ? [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % pool.length : 0;
  const rest = [...pool.slice(start), ...pool.slice(0, start)];

  return [...own.filter((item) => item.google), ...own.filter((item) => !item.google), ...rest].map((item) => toSocialProof(item, locale));
}

/** The Google reviews, for the homepage's carousel. */
export function googleReviewsFor(locale: ContentLocale): SocialProofItem[] {
  return TESTIMONIALS.filter((item) => item.google).map((item) => toSocialProof(item, locale));
}

/**
 * One named testimonial, chosen by id.
 *
 * Pages that show a single quote were taking `stories[0]` or `stories[1]` — so
 * "What people feel at CASA" on the mission page rendered a quote about evening
 * course levels, and "Exam confidence comes from calm preparation" on /exams
 * rendered one about an intensive course. Neither page had chosen its voice; it
 * had inherited whatever the config happened to list first, and reordering this
 * file silently reassigned them.
 *
 * A page with room for exactly one voice should name it.
 */
export function socialProofById(id: string, locale: ContentLocale): SocialProofItem | null {
  const all = socialProofFor(locale);

  return all.find((item) => item.id === `${id}-${locale}`) ?? all[0] ?? null;
}
