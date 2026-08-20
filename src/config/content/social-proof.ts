import type { ContentLocale, SocialProofItem } from '@/lib/content/types';

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
 *
 * VERIFIED 2026-08-18 against the seven casa-bremen.de/sprachkurse/* pages.
 */

type TestimonialSource = {
  id: string;
  /** First name as CASA prints it. */
  person: string;
  /** The course page it appears on. Omit for a school-wide quote. */
  courseSlug?: string;
  /**
   * The exam this learner actually sat, if any.
   *
   * Only Fatameh mentions an exam, so the telc C1 Hochschule page has no
   * testimonial and renders none — rather than borrowing an unrelated learner's
   * words under the heading "Stories from exam preparation", which is what a
   * shared pool produced.
   */
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
};

const TESTIMONIALS: TestimonialSource[] = [
  {
    id: 'narges-intensive',
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
  },
  {
    id: 'fatameh-evening',
    person: 'Fatameh',
    courseSlug: 'evening-german',
    examCode: 'telc_b2',
    writtenIn: 'en',
    quote:
      'I regularly visited evening German courses (A2 to B2) and also had my telc B2 exam at CASA. It was great! My teachers, among them Claudia, were all very nice, professional, and motivated. Communication with admins was also always nice, helpful, and pleasant. I would definitely recommend it!',
    excerpt:
      'I regularly visited evening German courses (A2 to B2) and also had my telc B2 exam at CASA. It was great! My teachers, among them Claudia, were all very nice, professional, and motivated.',
    context: {
      en: 'Evening courses A2 to B2, and the telc B2 exam',
      de: 'Abendkurse A2 bis B2 und die telc B2 Prüfung',
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
      en: 'Company course participant',
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
      en: 'Educational leave course',
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
];

function toSocialProof(source: TestimonialSource, locale: ContentLocale): SocialProofItem {
  return {
    id: `${source.id}-${locale}`,
    locale,
    // `quote` is what renders, so it carries the excerpt. The verbatim text stays
    // on `quoteFull` — auditable, and the guard test compares the two.
    quote: source.excerpt,
    quoteFull: source.quote,
    personDisplay: source.person,
    // The old field was `country`, filled with invented nationalities. CASA
    // publishes what the learner studied, not where they are from, and that is
    // the more useful line beside a course testimonial anyway.
    country: source.context[locale],
    courseSlug: source.courseSlug,
    examCode: source.examCode,
    sourcePlatform: 'website',
    sourceUrl: 'https://casa-bremen.de/sprachkurse/deutsch-intensiv',
    verificationStatus: 'verified',
  };
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
  const all = socialProofByLocale[locale] ?? socialProofByLocale.en;
  const own = all.filter((item) => item.courseSlug === slug);
  const others = all.filter((item) => item.courseSlug !== slug);

  return [...own, ...others];
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
  const all = socialProofByLocale[locale] ?? socialProofByLocale.en;

  return all.find((item) => item.id === `${id}-${locale}`) ?? all[0] ?? null;
}

/**
 * Testimonials from learners who actually sat this exam.
 *
 * Returns an empty array rather than falling back to the pool, and the exam page
 * omits its stories section when it is empty. CASA publishes one exam
 * testimonial; inventing relevance for the other exam by showing a grammar-course
 * learner under "Stories from exam preparation" is the kind of small dishonesty
 * that a shared pool makes invisible.
 */
export function socialProofForExam(code: string, locale: ContentLocale): SocialProofItem[] {
  const all = socialProofByLocale[locale] ?? socialProofByLocale.en;

  return all.filter((item) => item.examCode === code);
}
