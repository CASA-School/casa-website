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
 *
 * STARS FOR ALL OF THEM (2026-10-26). Every quote casa-bremen.de published is also a review on CASA's
 * Google listing, each with five stars (checked against the listing that day: Sulaiman's is the English
 * original „SE" posted, which casa-bremen.de printed in German), so they carry their stars. Seven more
 * 5-star reviews joined the pool the same day (Rahman: „keep the pool big"), and each course page
 * starts its fill at a different one (FILL_FROM), so no two pages show the same three.
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
const FILL_FROM: Record<string, string> = {
  'intensive-german': 'mila-google',
  'evening-german': 'roberto-google',
  // From B1 to university, the C1 course, A2 to C1.2: the advanced voices beside a specialised course.
  'medical-german': 'leo-google',
  // Grammar gaps filled, creative methods: next to Sulaiman's grammar module.
  'special-courses': 'dimitra-google',
  // Seven months from B1+, B1 and B1+ classes: Bildungszeit starts at B1.
  bildungszeit: 'tahir-google',
};

/** CASA's Google listing, where the reviews are. */
const GOOGLE_LISTING = 'https://maps.google.com/?cid=4736578749741248132';

const TESTIMONIALS: TestimonialSource[] = [
  {
    id: 'narges-intensive',
    coursePage: false,
    google: { rating: 5 },
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
    google: { rating: 5 },
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
    // Written in English on Google; casa-bremen.de printed the German below.
    writtenIn: 'en',
    google: { rating: 5 },
    quote:
      'The B1/B2 grammar course has helped me remarkably to improve my spoken and written German skills. From course material to efficiently use and distribution of course time, friendly and nice teacher and central location of the academy, was really good value for money. Highly recommended.',
    excerpt: 'The B1/B2 grammar course has helped me remarkably to improve my spoken and written German skills.',
    context: {
      en: 'B1/B2 grammar special course',
      de: 'Spezialkurs Grammatik B1/B2',
    },
    translation: {
      de: {
        quote:
          'Der B1/B2 Grammatik-Kurs hat mir bemerkenswert geholfen, meine mündlichen und schriftlichen Deutschkenntnisse zu verbessern. Vom Kursmaterial über die effiziente Nutzung und Aufteilung der Kurszeit, die freundliche Lehrkraft bis hin zur zentralen Lage der Akademie – ein wirklich hervorragendes Preis-Leistungs-Verhältnis. Sehr zu empfehlen.',
        excerpt:
          'Der B1/B2 Grammatik-Kurs hat mir bemerkenswert geholfen, meine mündlichen und schriftlichen Deutschkenntnisse zu verbessern.',
      },
    },
  },
  {
    id: 'laura-medical',
    // She writes about the intensive course; casa-bremen.de showed her on the medical page. The intensive
    // page leads with fresher reviews, so she stays off the course pages (the About page names her).
    coursePage: false,
    person: 'Laura',
    courseSlug: 'intensive-german',
    google: { rating: 5 },
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
    google: { rating: 5 },
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
    google: { rating: 5 },
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
    translation: {
      en: {
        quote:
          'One of my best learning experiences! The teachers are professional, the courses are effective and the management team is also very friendly and helpful. I would definitely recommend this school!',
        excerpt:
          'One of my best learning experiences! The teachers are professional, the courses are effective and the management team is also very friendly and helpful.',
      },
    },
  },
  {
    id: 'elena-groups',
    google: { rating: 5 },
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
  /*
   * More from the listing (read 2026-10-26, Rahman: „keep the pool big"): 5-star reviews in German or
   * English that say something concrete, the newest a month old. Light typo repair only („i" → „I",
   * „german" → „German", a missing space); English ones carry a labelled German translation.
   */
  {
    id: 'leo-google',
    person: 'Leo A.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Ich bin sehr zufrieden mit der Sprachschule und dem gesamten Team. Alle sind äußerst kompetent, hilfsbereit und engagiert. Ich wurde von meinem B1-Sprachniveau bis hin zum Eintritt in die Universität begleitet und dabei jederzeit bestens unterstützt. Vielen Dank für die tolle Betreuung und die wertvolle Unterstützung auf meinem Weg! Ich kann die Sprachschule jedem empfehlen, der seine Deutschkenntnisse verbessern und anschließend erfolgreich studieren möchte.',
    excerpt:
      'Ich wurde von meinem B1-Sprachniveau bis hin zum Eintritt in die Universität begleitet und dabei jederzeit bestens unterstützt.',
    context: { de: 'Von B1 bis zum Studium', en: 'From B1 to university' },
    translation: {
      en: {
        quote:
          'I am very happy with the language school and the whole team. Everyone is extremely competent, helpful and committed. I was accompanied from my B1 level all the way to starting university, and supported in the best possible way at every step. Thank you very much for the great guidance and the valuable support on my way! I can recommend the language school to anyone who wants to improve their German and then go on to study successfully.',
        excerpt:
          'I was accompanied from my B1 level all the way to starting university, and supported in the best possible way at every step.',
      },
    },
  },
  {
    id: 'mateo-google',
    person: 'Mateo',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Während ich im anderen Kurszentrum meine Zeit verschwendet habe, konnte ich im C1-Kurs bei Casa endlich richtig Deutsch lernen. Der Unterricht wurde umfangreich und professionell gestaltet, und die Lehrerinnen und Lehrer waren sehr gut qualifiziert. Über die anderen Niveaustufen bei Casa kann ich keine Aussage treffen. Sehr zu empfehlen ist es, die eigene wertvolle Zeit nicht woanders zu verschwenden, sondern direkt Casa zu besuchen.',
    excerpt:
      'Der Unterricht wurde umfangreich und professionell gestaltet, und die Lehrerinnen und Lehrer waren sehr gut qualifiziert.',
    context: { de: 'C1-Kurs', en: 'C1 course' },
    translation: {
      en: {
        quote:
          'While I wasted my time at another course centre, in the C1 course at CASA I was finally able to learn German properly. The lessons were comprehensive and professionally designed, and the teachers were very well qualified. I can’t say anything about the other levels at CASA. I highly recommend not wasting your own valuable time elsewhere, but going straight to CASA.',
        excerpt: 'The lessons were comprehensive and professionally designed, and the teachers were very well qualified.',
      },
    },
  },
  {
    id: 'oksana-google',
    person: 'Oksana F.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Casa Sprachschule Bremen – das Beste, was mir in Deutschland passiert ist🌈 ✨🪐 Heute habe ich bei Casa C1.2 abgeschlossen. Ich habe hier von A2 bis C1 gelernt und bin unglaublich dankbar für diese Zeit. Ich möchte mich besonders bei allen Lehrerinnen und Lehrern für ihre Geduld, ihr Wissen und ihre Unterstützung bedanken. Jeder von ihnen ist unglaublich engagiert und lebt seinen Beruf mit Leidenschaft – und das spürt man. Sie sind herzlich, freundlich, hilfsbereit und immer bereit, uns zu unterstützen und zu motivieren. Deutsch zu lernen ist wirklich nicht einfach. Es braucht sehr viel Übung, Wiederholung und Praxis. Es gab Momente, in denen man einfach aufgeben wollte. Aber unsere Lehrer haben uns immer wieder motiviert, weiterzumachen und an uns selbst zu glauben🌤️ Die Unterrichtsstunden waren immer abwechslungsreich, lebendig und voller Atmosphäre. Wir haben nicht einfach nur Grammatik gelernt, sondern viele verschiedene Übungen gemacht, Texte bearbeitet, diskutiert, Präsentationen vorbereitet und unsere sprachlichen Fähigkeiten ständig weiterentwickelt. Besonders schätze ich, dass Casa Menschen aus unterschiedlichen Ländern und Kulturen zusammenbringt. Die Lehrer schaffen es, diese Unterschiede zu verbinden und eine gute Lernatmosphäre für alle zu schaffen. Menschen aus verschiedenen Ländern haben gemeinsam gefeiert – und genau darin zeigt sich für mich, was Casa besonders macht: Casa verbindet Menschen. Ein besonderes Dankeschön geht auch an Lutz für seine Geduld, seine Energie und seine Fähigkeit, uns immer wieder zu motivieren. Man merkt, wie viel Herzblut er in seinen Beruf steckt. Vielen Dank an das gesamte Casa-Team für eure Geduld, euer Wissen, eure Unterstützung und euren Einsatz☀️☀️☀️ Casa ist für mich nicht einfach nur eine Sprachschule. Für mich ist Casa die beste Sprachschule in Bremen. ❤️',
    excerpt:
      'Heute habe ich bei Casa C1.2 abgeschlossen. Ich habe hier von A2 bis C1 gelernt und bin unglaublich dankbar für diese Zeit.',
    context: { de: 'Von A2 bis C1.2', en: 'From A2 to C1.2' },
    translation: {
      en: {
        quote:
          'CASA language school Bremen – the best thing that has happened to me in Germany🌈 ✨🪐 Today I finished C1.2 at CASA. I learnt here from A2 to C1 and am incredibly grateful for this time. I would especially like to thank all the teachers for their patience, their knowledge and their support. Every one of them is incredibly committed and lives their profession with passion – and you can feel it. They are warm, friendly, helpful and always ready to support and motivate us. Learning German really isn’t easy. It takes a great deal of practice, repetition and use. There were moments when you just wanted to give up. But our teachers kept motivating us to carry on and to believe in ourselves🌤️ The lessons were always varied, lively and full of atmosphere. We didn’t just learn grammar; we did lots of different exercises, worked on texts, discussed, prepared presentations and kept developing our language skills. I especially value that CASA brings together people from different countries and cultures. The teachers manage to connect these differences and create a good learning atmosphere for everyone. People from different countries celebrated together – and for me that is exactly what makes CASA special: CASA brings people together. A special thank-you also goes to Lutz for his patience, his energy and his ability to keep motivating us. You can tell how much heart he puts into his work. Many thanks to the whole CASA team for your patience, your knowledge, your support and your commitment☀️☀️☀️ For me, CASA is not just a language school. For me, CASA is the best language school in Bremen. ❤️',
        excerpt: 'Today I finished C1.2 at CASA. I learnt here from A2 to C1 and am incredibly grateful for this time.',
      },
    },
  },
  {
    id: 'tahir-google',
    person: 'Tahir E.',
    writtenIn: 'en',
    google: { rating: 5 },
    quote:
      'Let me tell you about my 7 month journey with CASA and why they are the best option when it comes to language schools. I started at CASA with the B1+ niveau. Before that I was studying at another language school in Bremen. Once I started at CASA I was not just listening and writing I was actively joining the class and the teaching since teachers here aren’t just talking but also asking. They are asking if you understood, asking for self examples and the lesson becomes much more enjoyable. Besides we play games all the time which include the grammar we just learned and helps a lot with becoming natural at the language. Teamworks is also a big thing at CASA. Almost every lesson there is a Partnerarbeit where you and a classmate try to solve or answer questions which helps to discover other views and to understand the subject better. When it comes to the office they inform students really well about their situations and what they can do. If you ever have any questions about the school I would recommend you to visit their office and ask anything that comes across your mind since thats what I did and what helped me a lot by picking my language school. Sky is the limit when it comes to service by CASA! Classes and bathrooms are pristine clean all the time and get cleaned daily. Overall was really satisfied with everything at CASA and I would recommend it to everyone with my whole heart. Ich habe auf Englisch geschrieben, so dass jeder meine Meinung verstehen können. Nun möchte ich mich für einzige besondere Menschen auf Deutsch bedanken. Vielen herzlichen dank für alles; Christian, Natàlia, Lutz und Claudia. Meine Erfahrung hier war zwar gut aber mit euch ist es super gut geworden! Ich kann mich nicht genug bedanken, weil ihr immer da wart und mich immer unterstützt habt. Ich wünsche euch alle die beste! Bleibt gesund, bleibt glücklich!',
    excerpt:
      'Once I started at CASA I was not just listening and writing I was actively joining the class and the teaching since teachers here aren’t just talking but also asking.',
    context: { de: 'Sieben Monate, ab B1+', en: 'Seven months, from B1+' },
    translation: {
      de: {
        quote:
          'Ich erzähle euch von meinen sieben Monaten bei CASA und warum sie die beste Wahl unter den Sprachschulen sind. Ich habe bei CASA auf dem Niveau B1+ angefangen. Davor habe ich an einer anderen Sprachschule in Bremen gelernt. Seit ich bei CASA angefangen habe, habe ich nicht nur zugehört und geschrieben, sondern aktiv am Unterricht teilgenommen, denn die Lehrkräfte hier reden nicht nur, sie fragen auch. Sie fragen, ob man es verstanden hat, und bitten um eigene Beispiele, so macht der Unterricht viel mehr Spaß. Außerdem spielen wir ständig Spiele mit der Grammatik, die wir gerade gelernt haben, und das hilft sehr, die Sprache natürlich zu sprechen. Teamarbeit ist bei CASA auch sehr wichtig. Fast in jeder Stunde gibt es eine Partnerarbeit, in der man mit jemandem aus dem Kurs Fragen löst oder beantwortet. So lernt man andere Sichtweisen kennen und versteht das Thema besser. Das Büro informiert die Lernenden sehr gut über ihre Situation und ihre Möglichkeiten. Wenn ihr Fragen zur Schule habt, geht ins Büro und fragt alles, was euch einfällt. Das habe ich auch gemacht, und es hat mir bei der Wahl meiner Sprachschule sehr geholfen. Beim Service von CASA sind keine Grenzen gesetzt! Kursräume und Toiletten sind immer blitzsauber und werden täglich gereinigt. Insgesamt war ich mit allem bei CASA sehr zufrieden und empfehle die Schule von ganzem Herzen weiter. Ich habe auf Englisch geschrieben, so dass jeder meine Meinung verstehen können. Nun möchte ich mich für einzige besondere Menschen auf Deutsch bedanken. Vielen herzlichen dank für alles; Christian, Natàlia, Lutz und Claudia. Meine Erfahrung hier war zwar gut aber mit euch ist es super gut geworden! Ich kann mich nicht genug bedanken, weil ihr immer da wart und mich immer unterstützt habt. Ich wünsche euch alle die beste! Bleibt gesund, bleibt glücklich!',
        excerpt:
          'Seit ich bei CASA angefangen habe, habe ich nicht nur zugehört und geschrieben, sondern aktiv am Unterricht teilgenommen, denn die Lehrkräfte hier reden nicht nur, sie fragen auch.',
      },
    },
  },
  {
    id: 'carlo-google',
    person: 'Carlo X.',
    writtenIn: 'en',
    google: { rating: 5 },
    quote:
      'I had a wonderful experience at this language school! I’ve tried about 4 German language schools in the past, and CASA is by far the best in terms of teaching quality, administrative logistics, and classroom comfort. - Teaching Quality: I had 4 teachers for my B1 and B1+ German classes (2 per class), and each instructor was not only extremely knowledgeable but also really passionate about teaching. The energy is appreciated, especially during the afternoons! - Administrative Logistics: I received a response the day of my inquiry and had a placement test scheduled for the next day. I received all the supplies I needed on the first day. No complaints. - Classroom Comfort: Classrooms are clean and some even have a digital whiteboard. The building is huge, and I like that there’s a cafe downstairs where you can go and speak German to students of all levels. I made some great friends during these breaks at the cafe. Overall, I highly recommend CASA if you want to improve your language skills!',
    excerpt:
      'I had 4 teachers for my B1 and B1+ German classes (2 per class), and each instructor was not only extremely knowledgeable but also really passionate about teaching.',
    context: { de: 'Kurse B1 und B1+', en: 'B1 and B1+ classes' },
    translation: {
      de: {
        quote:
          'Ich hatte eine wunderbare Zeit an dieser Sprachschule! Ich habe früher etwa vier Deutschschulen ausprobiert, und CASA ist mit Abstand die beste, was Unterrichtsqualität, Organisation und Komfort in den Kursräumen angeht. – Unterrichtsqualität: Ich hatte vier Lehrkräfte in meinen Deutschkursen B1 und B1+ (zwei pro Kurs), und alle waren nicht nur sehr kompetent, sondern unterrichteten auch mit echter Leidenschaft. Die Energie tut gut, besonders am Nachmittag! – Organisation: Ich bekam noch am Tag meiner Anfrage eine Antwort und hatte schon am nächsten Tag einen Einstufungstest. Alle Unterlagen, die ich brauchte, bekam ich am ersten Tag. Keine Beschwerden. – Kursräume: Die Kursräume sind sauber, und einige haben sogar ein digitales Whiteboard. Das Gebäude ist riesig, und mir gefällt, dass es unten ein Café gibt, in dem man mit Lernenden aller Niveaus Deutsch sprechen kann. In diesen Pausen im Café habe ich tolle Freundschaften geschlossen. Insgesamt kann ich CASA sehr empfehlen, wenn du deine Sprachkenntnisse verbessern möchtest!',
        excerpt:
          'Ich hatte vier Lehrkräfte in meinen Deutschkursen B1 und B1+ (zwei pro Kurs), und alle waren nicht nur sehr kompetent, sondern unterrichteten auch mit echter Leidenschaft.',
      },
    },
  },
  {
    id: 'dimitra-google',
    person: 'Dimitra B.',
    writtenIn: 'en',
    google: { rating: 5 },
    quote:
      'I am currently taking the A2.2 class. The courses are always interactive, helpful and fun. I have filled many grammar gaps I had on the German language. The atmosphere in Casa is very cozy and friendly, the staff is always helping as much as possible with any paper work that might be needed. The teachers I had so far, among them Janne and Tanja (I took some extra classes too) were all very professional and kind :). I would highly recommend Casa to anyone who is searching for a language school!',
    excerpt: 'The courses are always interactive, helpful and fun. I have filled many grammar gaps I had on the German language.',
    context: { de: 'Kurs A2.2', en: 'A2.2 class' },
    translation: {
      de: {
        quote:
          'Ich besuche gerade den Kurs A2.2. Die Kurse sind immer interaktiv, hilfreich und machen Spaß. Ich habe viele Grammatiklücken geschlossen, die ich im Deutschen hatte. Die Atmosphäre bei Casa ist sehr gemütlich und freundlich, und das Team hilft immer, so gut es geht, bei allem Papierkram, der anfallen kann. Die Lehrkräfte, die ich bisher hatte, darunter Janne und Tanja (ich habe auch ein paar zusätzliche Kurse besucht), waren alle sehr professionell und freundlich :). Ich kann Casa allen sehr empfehlen, die eine Sprachschule suchen!',
        excerpt:
          'Die Kurse sind immer interaktiv, hilfreich und machen Spaß. Ich habe viele Grammatiklücken geschlossen, die ich im Deutschen hatte.',
      },
    },
  },
  {
    id: 'fayez-google',
    person: 'Fayez N.',
    writtenIn: 'de',
    google: { rating: 5 },
    quote:
      'Sehr nette und professionelle Lehrer/innen und Mitarbeiter/innen, kreative Lehrmethoden und lustige Aktivitäten. Alles in einer gemütlichen Atmosphäre. Ich habe den B2 Deutschkurs bei Casa gemacht und mich wie zu Hause gefühlt. Außerdem habe ich dort viele tolle Menschen kennengelernt. Marina A. war meine Lehrerin dort, eine wunderbare Lehrerin und ihr Unterricht ist voller positiver Energie und macht Spaß zu lernen. Einfach gesagt, die beste Sprachschule in Bremen.',
    excerpt:
      'Sehr nette und professionelle Lehrer/innen und Mitarbeiter/innen, kreative Lehrmethoden und lustige Aktivitäten. Alles in einer gemütlichen Atmosphäre.',
    context: { de: 'B2-Kurs', en: 'B2 course' },
    translation: {
      en: {
        quote:
          'Very kind and professional teachers and staff, creative teaching methods and fun activities. All in a cosy atmosphere. I took the B2 German course at CASA and felt at home. I also met lots of great people there. Marina A. was my teacher there, a wonderful teacher, and her lessons are full of positive energy and make learning fun. Simply put, the best language school in Bremen.',
        excerpt: 'Very kind and professional teachers and staff, creative teaching methods and fun activities. All in a cosy atmosphere.',
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

/** The homepage's carousel: the Google reviews about the school as a whole; one about a course stays on its page. */
export function googleReviewsFor(locale: ContentLocale): SocialProofItem[] {
  return TESTIMONIALS.filter((item) => item.google && !item.courseSlug).map((item) => toSocialProof(item, locale));
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
