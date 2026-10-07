import type { ContentLocale } from '@/lib/content/types';

/**
 * The practical facts CASA publishes for each course format.
 *
 * WHY THIS FILE EXISTS
 *
 * `src/app/courses/page.tsx` already built a `facts` array carrying the real
 * figures — €940 for a full level, €117.50 per additional week, the €50
 * enrolment fee, €23.99–26.99 for a textbook — and passed it to
 * `CoursesFormatSelector`, which accepted the prop and rendered nothing. So the
 * numbers were correct, version-controlled, and invisible: every course detail
 * page instead read "Duration: On request" and "Next start date: To be
 * announced" while casa-bremen.de published a full fee table and term list.
 *
 * Fees and conditions now live here rather than inside a page component, for
 * the same reason course archetypes do: two surfaces need them, and a fact that
 * lives in one page's render function drifts from the other's the first time
 * someone edits it.
 *
 * RULES
 *
 * 1. Every number here must appear in docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.
 *    That file is the gate; this file is the presentation of it.
 * 2. Both locales, always. Routing is EN-only today, but the content layer is
 *    bilingual and the German wording is the source of truth — writing the
 *    German at the same time is what keeps the English honest.
 * 3. `conditions` are for expectation-setting, not marketing. A learner who
 *    reads "exam preparation is not part of the intensive programme" before
 *    booking does not arrive expecting it. Prefer the awkward true sentence.
 */

export type FeeRow = {
  label: { en: string; de: string };
  amount: { en: string; de: string };
  /** Shown smaller beneath the amount. For "varies by level" style caveats. */
  note?: { en: string; de: string };
};

export type CoursePracticalFacts = {
  /** Omit entirely for formats CASA quotes per enquiry. */
  fees?: FeeRow[];
  /** Replaces the fee table when there is no published price. */
  feeNote?: { en: string; de: string };
  /** Conditions and constraints, in the order a reader needs them. */
  conditions: { en: string; de: string }[];
};

/*
 * German pages write prices the German way: "117,50 €", "23,99 – 26,99 €"
 * (go-live brief 2026-10-01). Amounts are authored once, in the English form.
 */
function germanEuro(value: string) {
  const amounts = [...value.matchAll(/€\s?(\d+(?:\.\d+)?)/g)].map((match) => match[1].replace('.', ','));
  return amounts.length ? `${amounts.join(' – ')}\u00a0€` : value;
}

const EUR = (value: string) => ({ en: value, de: germanEuro(value) });

export const coursePracticalFacts: Record<string, CoursePracticalFacts> = {
  'intensive-german': {
    fees: [
      {
        label: { en: '4 weeks (half level)', de: '4 Wochen (Teilniveau)' },
        amount: EUR('€520'),
      },
      {
        label: { en: '8 weeks (complete level)', de: '8 Wochen (komplettes Niveau)' },
        amount: EUR('€940'),
      },
      {
        label: { en: 'Each additional week', de: 'Jede weitere Woche' },
        amount: EUR('€117.50'),
      },
      {
        label: { en: 'One-time enrolment fee', de: 'Einmalige Einschreibegebühr' },
        amount: EUR('€50'),
        note: {
          en: 'Charged once, on your first registration at CASA.',
          de: 'Fällt nur bei deiner ersten Anmeldung an unserer Schule an.',
        },
      },
      {
        label: { en: 'Course book', de: 'Lehrmaterial' },
        amount: EUR('€23.99 – €26.99'),
        note: { en: 'Varies by level.', de: 'Der Preis hängt von der Niveaustufe ab.' },
      },
    ],
    conditions: [
      {
        en: '20 lessons a week of 45 minutes each. A complete CEFR level takes 8 to 9 weeks, so a year at CASA takes you from A1 to C1.',
        de: 'Unsere Intensivkurse umfassen 20 Unterrichtseinheiten à 45 Minuten pro Woche. Eine komplette Niveaustufe dauert 8 bis 9 Wochen. So durchläufst du in einem Jahr die Niveaustufen A1 bis C1 und legst eine solide Grundlage für ein Studium oder eine qualifizierte Arbeit in Deutschland.',
      },
      {
        en: 'Mornings Monday to Friday, 09:00–12:30, or afternoons Monday to Thursday, 13:00–17:30. The afternoon course runs four days, not five.',
        de: 'Die Kurse finden vormittags von Montag bis Freitag, 9 bis 12:30 Uhr, oder nachmittags von Montag bis Donnerstag, 13 bis 17:30 Uhr, statt. Der Nachmittagskurs hat also vier Unterrichtstage in der Woche.',
      },
      {
        // The four skills, speaking above all, are the old casa-bremen.de wording.
        en: 'International groups of 10 to 15 learners, taught year-round and strictly along the Common European Framework.',
        de: 'Du lernst das ganze Jahr über in internationalen Gruppen mit 10 bis 15 Teilnehmenden. Der Unterricht orientiert sich streng am Gemeinsamen Europäischen Referenzrahmen und schult gezielt Hörverstehen, Lesen, Schreiben und besonders das Sprechen.',
      },
      {
        // CASA states this in bold on its own page. Withholding it sets a
        // learner up to arrive expecting telc training they have not booked.
        en: 'Preparation for an exam is not part of the intensive courses. If you need a telc certificate, book preparation alongside.',
        de: 'Die Vorbereitung auf eine Prüfung ist nicht Bestandteil der Intensivkurse. Wenn du ein telc-Zertifikat brauchst, kannst du einen Vorbereitungskurs zusätzlich buchen.',
      },
      {
        en: 'Placement happens on site. CASA may adjust your course level regardless of certificates you already hold, because the right group matters more than the paperwork.',
        de: 'Damit du gut vorankommst, ist die passende Niveaustufe wichtig. Deshalb stufen wir dich vor Ort ein und behalten uns vor, dein Kursniveau anzupassen, auch wenn du schon ein Zertifikat hast.',
      },
      {
        // Personal guidance is the old casa-bremen.de wording, lost in the move.
        en: 'Written work is corrected regularly, and teachers supplement the course book with their own material.',
        de: 'Deine Lehrkräfte ergänzen das Lehrwerk mit eigenen Materialien, die den Unterricht aktuell, anregend und unterhaltsam machen. Außerdem korrigieren sie regelmäßig deine schriftlichen Arbeiten und beraten dich persönlich, denn wir möchten auf die Bedürfnisse jeder und jedes Einzelnen eingehen.',
      },
    ],
  },

  'evening-german': {
    fees: [
      {
        label: { en: 'Course fee per trimester', de: 'Kursgebühr pro Trimester' },
        amount: EUR('€476'),
        note: {
          en: 'Plus the course book, which varies by level.',
          de: 'Dazu kommt das Lehrwerk. Sein Preis hängt von der Niveaustufe ab.',
        },
      },
    ],
    conditions: [
      {
        en: 'Twice a week, 18:30–20:00, either Monday and Wednesday or Tuesday and Thursday.',
        de: 'Die Kurse finden das ganze Jahr über in der Regel zweimal pro Woche von 18:30 bis 20:00 Uhr statt, entweder montags und mittwochs oder dienstags und donnerstags.',
      },
      {
        en: 'A course runs about three and a half months and completes half a level, for example A1.2 or B2.1 — roughly one and a half levels a year.',
        de: 'Ein Abendkurs dauert etwa 3½ Monate. In dieser Zeit schließt du eine halbe Niveaustufe ab, zum Beispiel A1.2 oder B2.1. Im Jahr schaffst du so etwa 1½ Niveaustufen.',
      },
      {
        en: 'With no previous German at all (A1.1) you have to start at the beginning of a course.',
        de: 'Wenn du noch keine Deutschkenntnisse hast (A1.1), musst du immer am Kursstart beginnen.',
      },
      {
        en: 'With some German already, you can join a course that is under way whenever seats are free. If a course is full we are glad to put you on the waiting list.',
        de: 'Mit Vorkenntnissen kannst du jederzeit in einen laufenden Kurs einsteigen, wenn noch Plätze frei sind. Ist ein Kurs ausgebucht, setzen wir dich gern auf die Warteliste.',
      },
      {
        en: 'Teaching follows everyday communication, in small international groups, with occasional leisure and culture activities.',
        de: 'Der Unterricht orientiert sich an der Alltagskommunikation und findet in kleinen internationalen Gruppen statt. Für die Gruppen organisieren wir gelegentlich auch Freizeit- und Kulturaktivitäten.',
      },
    ],
  },

  'special-courses': {
    fees: [
      {
        label: { en: 'Per module', de: 'Pro Modul' },
        amount: EUR('€192'),
      },
    ],
    conditions: [
      {
        en: 'One 90-minute evening a week, 18:30–20:00, over 12 weeks.',
        de: 'Ein Modul läuft 12 Wochen lang an einem Abend pro Woche, jeweils 90 Minuten von 18:30 bis 20:00 Uhr.',
      },
      {
        en: 'Modules stand alone or run alongside a main course. Pick one when a specific skill needs work rather than your whole level.',
        de: 'Du kannst ein Modul einzeln belegen oder neben einem anderen Kurs. Die Module eignen sich, wenn du gezielt bestimmte Lerninhalte wiederholen, auffrischen oder vertiefen möchtest.',
      },
      {
        en: 'Entry levels differ per module — read the level on the module itself before booking.',
        de: 'Jedes Modul hat sein eigenes Einstiegsniveau. Schau vor der Anmeldung nach, welches Niveau dein Modul voraussetzt.',
      },
    ],
  },

  bildungszeit: {
    fees: [
      { label: { en: '1 week', de: '1 Woche' }, amount: EUR('€280') },
      { label: { en: '2 weeks', de: '2 Wochen' }, amount: EUR('€520') },
      {
        label: { en: 'Course books', de: 'Lehrmaterialien' },
        amount: EUR('€46 – €54'),
        note: {
          en: 'For two books — Bildungszeit runs two courses in parallel. Varies by level.',
          de: 'Für zwei Bücher, weil du zwei Kurse parallel besuchst. Der Preis hängt von der Niveaustufe ab.',
        },
      },
      {
        label: { en: 'One-time enrolment fee', de: 'Einmalige Einschreibegebühr' },
        amount: EUR('€50'),
        note: {
          en: 'Charged once, on your first registration at CASA.',
          de: 'Fällt nur bei deiner ersten Anmeldung an unserer Schule an.',
        },
      },
    ],
    conditions: [
      {
        en: 'Employees working in the state of Bremen are generally entitled to ten days of educational leave across two years, under the Bremisches Bildungszeitgesetz.',
        de: 'Wer im Bundesland Bremen arbeitet, hat in einem Zeitraum von zwei Jahren grundsätzlich Anspruch auf zehn Tage Bildungszeit. Diese Zeit kannst du für eine Weiterbildung nutzen, die nach dem Bremischen Bildungszeitgesetz anerkannt ist.',
      },
      {
        en: 'For a language course to be recognised as educational leave it has to run 30 to 40 hours a week. Our superintensive format meets that: you attend one intensive course in the morning and a second in the afternoon.',
        de: 'Damit ein Sprachkurs als Bildungszeit anerkannt wird, braucht er 30–40 Stunden Unterricht in der Woche. Unsere Superintensivkurse erfüllen diese Voraussetzung. Dafür besuchst du gleichzeitig zwei Intensivkurse, einen am Vormittag und einen am Nachmittag.',
      },
      {
        en: 'You can join from level B1 upward.',
        de: 'Ab einem Niveau von B1 kannst du teilnehmen.',
      },
      {
        en: 'The timing is flexible — you can start on any Monday. We recommend beginning when a new intensive course starts, so you learn with the group from the first day.',
        de: 'Der Zeitraum ist flexibel, und du kannst immer montags einsteigen. Wir empfehlen dir, die Bildungszeit zu beginnen, wenn ein neuer Intensivkurs startet. So lernst du von Anfang an mit den anderen Teilnehmerinnen und Teilnehmern zusammen.',
      },
    ],
  },

  'medical-german': {
    feeNote: {
      en: 'CASA does not publish dates, weekly hours or a fee for this course — they are set per group. Ask the office and you will get the current figures for your situation.',
      de: 'Termine, Stundenumfang und Gebühr legen wir für jede Gruppe einzeln fest. Frag uns im Büro, dann nennen wir dir die aktuellen Angaben für deine Situation.',
    },
    /*
     * The German lines bring back what the old /sprachkurse/deutsch-fuer-mediziner
     * page said and the move lost: its topic list (Arzt-Patienten-Gespräch,
     * Arzt-Arzt-Gespräch, schriftliche Dokumentation), why clear communication
     * matters on the ward, and who the conversations are with. The audience
     * follows the course's current name and its approved narrative: doctors and
     * other medical staff.
     */
    conditions: [
      {
        en: 'For doctors before and after the Fachsprachprüfung, at CEFR levels B2 and C1.',
        de: 'Der Kurs richtet sich an Ärztinnen und Ärzte vor und nach der Fachsprachprüfung Medizin und an medizinische Fachkräfte. Er orientiert sich an den Niveaustufen B2 und C1 des Gemeinsamen Europäischen Referenzrahmens.',
      },
      {
        en: 'Content is chosen around participants’ specialisms and current level, with direct bearing on daily clinical practice.',
        de: 'Wir wählen die Themen der Fachsprachprüfung passend zu den Fachgebieten und zum Kenntnisstand der Gruppe aus, immer mit direktem Bezug zur Praxis. Dazu gehören das Anamnesegespräch, die körperliche Untersuchung, Diagnostik, Befund und Therapie, Gespräche mit Angehörigen, die Fallvorstellung, der interdisziplinäre Austausch und Arztbriefe.',
      },
      {
        en: 'Alongside spoken communication and listening, the course trains the written documentation the job actually requires.',
        de: 'Im Klinikalltag ist es sehr wichtig, sich fachlich richtig zu verständigen und alle Informationen genau aufzunehmen. Deshalb übst du Gespräche mit Patientinnen und Patienten, Angehörigen, Ärztinnen und Ärzten und dem Pflegepersonal, dazu das Hörverstehen und die schriftliche Dokumentation im Beruf.',
      },
      {
        en: 'The course is designed to lead into deeper self-study rather than to replace it.',
        de: 'Der Kurs leitet dich außerdem zum vertiefenden Selbststudium an.',
      },
    ],
  },

  'in-company': {
    feeNote: {
      en: 'Quoted per company. Both the consultation and the quote are always without obligation.',
      de: 'Den Preis kalkulieren wir für jede Firma einzeln. Die Studienberatung und das Angebot sind stets unverbindlich.',
    },
    conditions: [
      {
        en: 'We start with a consultation to establish learning needs, goals and the language levels in your team, then build the training plan from it.',
        de: 'Gerne nehmen wir uns Zeit für eine gemeinsame Studienberatung, in der wir uns ein Bild von Lernbedürfnissen, Lernzielen und Sprachkenntnissen machen. Daraus entwickeln wir anschließend den Ausbildungsplan.',
      },
      {
        en: 'For a company course to work, participating employees should be at roughly the same language level.',
        de: 'Für die erfolgreiche Umsetzung eines Firmenkurses ist es wichtig, dass sich die Mitarbeitenden ungefähr auf demselben Sprachniveau befinden.',
      },
      {
        en: 'CASA has worked with Bremen employers for years on both the language and the intercultural side of staff qualification.',
        de: 'CASA arbeitet mit vielen Bremer Firmen zusammen, die einen zuverlässigen Partner für die sprachliche und interkulturelle Qualifikation ihrer Mitarbeiterinnen und Mitarbeiter suchen.',
      },
    ],
  },

  'german-for-groups': {
    feeNote: {
      en: 'Quoted per group. Tell us the size, ages, dates and what you want to focus on, and you get an individual, no-obligation offer.',
      de: 'Wir kalkulieren für jede Gruppe einzeln. Nennen Sie uns Gruppengröße, Alter, Zeitraum und Ihre Schwerpunkte, dann erstellen wir Ihnen gern ein individuelles und unverbindliches Angebot.',
    },
    conditions: [
      {
        // The focus on speaking is the old casa-bremen.de wording.
        en: '20 teaching hours a week, with our own or specially assembled materials. Prefer a different number of hours, or particular content? We build it that way.',
        de: 'Der Unterricht umfasst 20 Unterrichtseinheiten pro Woche mit eigens entwickelten oder speziell zusammengestellten Materialien. Der Schwerpunkt liegt auf der gesprochenen Sprache und ihrer Anwendung im Gespräch, dafür üben wir natürlich auch Grammatik. Wenn Sie besondere Inhalte oder eine andere Stundenzahl wünschen, setzen wir Ihre Vorstellungen gern um.',
      },
      {
        en: 'Every participant receives a certificate of participation at the end of the course.',
        de: 'Zum Abschluss des Kurses erhalten alle Teilnehmenden ein Teilnahmezertifikat.',
      },
      {
        // Who the hosts are is the old casa-bremen.de wording.
        en: 'Accommodation is with Bremen host families in single or double rooms, with or without meals. Every household is chosen by us in person and is well connected to public transport.',
        de: 'Wir kümmern uns um die Unterbringung Ihrer Gruppe in Einzel- oder Doppelzimmern bei Bremer Gastfamilien, wahlweise mit oder ohne Verpflegung. Alle Unterkünfte wählen wir persönlich aus, und alle sind gut an den Nahverkehr angebunden. Unsere Gastgeberinnen und Gastgeber, ob Einzelpersonen oder Familien mit Kindern, heißen Gäste aus aller Welt herzlich willkommen.',
      },
      {
        en: 'Host families meet arriving students at the station or the airport, and everyone gets a public transport ticket for the whole stay.',
        de: 'Die Gastfamilien begrüßen die Schülerinnen und Schüler bei ihrer Ankunft am Bahnhof oder Flughafen. Alle Teilnehmenden erhalten ein Ticket für den öffentlichen Nahverkehr für den Zeitraum ihres Aufenthaltes.',
      },
      {
        en: 'Accompanying adults are housed as they prefer, usually a centrally located hotel with single rooms and breakfast.',
        de: 'Für Begleitpersonen organisieren wir die Unterkunft nach Wunsch, üblicherweise in einem zentral gelegenen Hotel mit Einzelzimmern und Frühstück.',
      },
    ],
  },
};

export function getCoursePracticalFacts(slug: string): CoursePracticalFacts | undefined {
  return coursePracticalFacts[slug];
}

/** Flattens one locale out of the bilingual shape, for rendering. */
export function localizePracticalFacts(slug: string, locale: ContentLocale) {
  const facts = coursePracticalFacts[slug];

  if (!facts) {
    return null;
  }

  return {
    fees: facts.fees?.map((fee) => ({
      label: fee.label[locale],
      amount: fee.amount[locale],
      note: fee.note?.[locale],
    })),
    feeNote: facts.feeNote?.[locale],
    conditions: facts.conditions.map((condition) => condition[locale]),
  };
}
