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
        label: { en: 'One-off enrolment fee', de: 'Einmalige Einschreibegebühr' },
        amount: EUR('€50'),
        note: {
          en: 'Only charged the first time you register at our school.',
          de: 'Fällt nur bei deiner ersten Anmeldung an unserer Schule an.',
        },
      },
      {
        label: { en: 'Course materials', de: 'Lehrmaterial' },
        amount: EUR('€23.99 – €26.99'),
        note: { en: 'The price depends on the level.', de: 'Der Preis hängt von der Niveaustufe ab.' },
      },
    ],
    conditions: [
      {
        en: 'Our intensive courses have 20 lessons of 45 minutes a week. A complete level takes 8 to 9 weeks, so in a year you work through levels A1 to C1 and build a solid foundation for university study or a skilled job in Germany.',
        de: 'Unsere Intensivkurse umfassen 20 Unterrichtseinheiten à 45 Minuten pro Woche. Eine komplette Niveaustufe dauert 8 bis 9 Wochen. So durchläufst du in einem Jahr die Niveaustufen A1 bis C1 und legst eine solide Grundlage für ein Studium oder eine qualifizierte Arbeit in Deutschland.',
      },
      {
        en: 'Courses run in the morning from Monday to Friday, 09:00–12:30, or in the afternoon from Monday to Thursday, 13:00–17:30. So the afternoon course has four days of lessons a week.',
        de: 'Die Kurse finden vormittags von Montag bis Freitag, 9 bis 12:30 Uhr, oder nachmittags von Montag bis Donnerstag, 13 bis 17:30 Uhr, statt. Der Nachmittagskurs hat also vier Unterrichtstage in der Woche.',
      },
      {
        // The four skills, speaking above all, are the old casa-bremen.de wording.
        en: 'You learn all year round in international groups of 10 to 15 people. Teaching keeps strictly to the Common European Framework of Reference and works on listening, reading, writing and, above all, speaking.',
        de: 'Du lernst das ganze Jahr über in internationalen Gruppen mit 10 bis 15 Teilnehmenden. Der Unterricht orientiert sich streng am Gemeinsamen Europäischen Referenzrahmen und schult gezielt Hörverstehen, Lesen, Schreiben und besonders das Sprechen.',
      },
      {
        // CASA states this in bold on its own page. Withholding it sets a
        // learner up to arrive expecting telc training they have not booked.
        en: 'Exam preparation is not part of the intensive courses. If you need a telc certificate, you can book a preparation course as well.',
        de: 'Die Vorbereitung auf eine Prüfung ist nicht Bestandteil der Intensivkurse. Wenn du ein telc-Zertifikat brauchst, kannst du einen Vorbereitungskurs zusätzlich buchen.',
      },
      {
        en: 'To make good progress, you need to be in a course at the right level. That is why we assess you here at the school and may adjust your course level, even if you already have a certificate.',
        de: 'Damit du gut vorankommst, ist die passende Niveaustufe wichtig. Deshalb stufen wir dich vor Ort ein und behalten uns vor, dein Kursniveau anzupassen, auch wenn du schon ein Zertifikat hast.',
      },
      {
        // Personal guidance is the old casa-bremen.de wording, lost in the move.
        en: 'Your teachers add their own materials to the textbook to keep lessons up to date, stimulating and enjoyable. They also correct your written work regularly and give you personal guidance, because we want to respond to what each person needs.',
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
          en: 'Plus the course materials. Their price depends on the level.',
          de: 'Dazu kommt das Lehrwerk. Sein Preis hängt von der Niveaustufe ab.',
        },
      },
    ],
    conditions: [
      {
        en: 'Courses run all year round, usually twice a week from 18:30 to 20:00, either on Mondays and Wednesdays or on Tuesdays and Thursdays.',
        de: 'Die Kurse finden das ganze Jahr über in der Regel zweimal pro Woche von 18:30 bis 20:00 Uhr statt, entweder montags und mittwochs oder dienstags und donnerstags.',
      },
      {
        en: 'An evening course lasts about three and a half months. In that time you complete half a level, for example A1.2 or B2.1, so in a year you can manage about one and a half levels.',
        de: 'Ein Abendkurs dauert etwa 3½ Monate. In dieser Zeit schließt du eine halbe Niveaustufe ab, zum Beispiel A1.2 oder B2.1. Im Jahr schaffst du so etwa 1½ Niveaustufen.',
      },
      {
        en: 'If you have no German yet (A1.1), you always need to start at the beginning of a course.',
        de: 'Wenn du noch keine Deutschkenntnisse hast (A1.1), musst du immer am Kursstart beginnen.',
      },
      {
        en: 'If you already speak some German, you can join a course that is under way at any time, as long as there are places free. If a course is full, we are happy to put you on the waiting list.',
        de: 'Mit Vorkenntnissen kannst du jederzeit in einen laufenden Kurs einsteigen, wenn noch Plätze frei sind. Ist ein Kurs ausgebucht, setzen wir dich gern auf die Warteliste.',
      },
      {
        en: 'Lessons focus on everyday communication and take place in small international groups. Now and then we also organise leisure and cultural activities for the groups.',
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
        en: 'A module runs for 12 weeks, on one evening a week, for 90 minutes from 18:30 to 20:00.',
        de: 'Ein Modul läuft 12 Wochen lang an einem Abend pro Woche, jeweils 90 Minuten von 18:30 bis 20:00 Uhr.',
      },
      {
        en: 'You can take a module on its own or alongside another course. The modules are a good choice if you want to revise, refresh or go deeper into particular topics.',
        de: 'Du kannst ein Modul einzeln belegen oder neben einem anderen Kurs. Die Module eignen sich, wenn du gezielt bestimmte Lerninhalte wiederholen, auffrischen oder vertiefen möchtest.',
      },
      {
        en: 'Each module has its own entry level. Before you register, check which level your module requires.',
        de: 'Jedes Modul hat sein eigenes Einstiegsniveau. Schau vor der Anmeldung nach, welches Niveau dein Modul voraussetzt.',
      },
    ],
  },

  bildungszeit: {
    fees: [
      { label: { en: '1 week', de: '1 Woche' }, amount: EUR('€280') },
      { label: { en: '2 weeks', de: '2 Wochen' }, amount: EUR('€520') },
      {
        label: { en: 'Course materials', de: 'Lehrmaterialien' },
        amount: EUR('€46 – €54'),
        note: {
          en: 'For two books, because you attend two courses side by side. The price depends on the level.',
          de: 'Für zwei Bücher, weil du zwei Kurse parallel besuchst. Der Preis hängt von der Niveaustufe ab.',
        },
      },
      {
        label: { en: 'One-off enrolment fee', de: 'Einmalige Einschreibegebühr' },
        amount: EUR('€50'),
        note: {
          en: 'Only charged the first time you register at our school.',
          de: 'Fällt nur bei deiner ersten Anmeldung an unserer Schule an.',
        },
      },
    ],
    conditions: [
      {
        // The English hero explains the German name; this line does not repeat it.
        en: 'If you work in the state of Bremen, you are generally entitled to ten days of Bildungszeit over a period of two years. You can use this time for further training that is recognised under the Bremisches Bildungszeitgesetz.',
        de: 'Wer im Bundesland Bremen arbeitet, hat in einem Zeitraum von zwei Jahren grundsätzlich Anspruch auf zehn Tage Bildungszeit. Diese Zeit kannst du für eine Weiterbildung nutzen, die nach dem Bremischen Bildungszeitgesetz anerkannt ist.',
      },
      {
        en: 'For a language course to count as Bildungszeit, it needs 30–40 hours of teaching a week. Our super-intensive courses meet this requirement. You attend two intensive courses at the same time, one in the morning and one in the afternoon.',
        de: 'Damit ein Sprachkurs als Bildungszeit anerkannt wird, braucht er 30–40 Stunden Unterricht in der Woche. Unsere Superintensivkurse erfüllen diese Voraussetzung. Dafür besuchst du gleichzeitig zwei Intensivkurse, einen am Vormittag und einen am Nachmittag.',
      },
      {
        en: 'You can join from level B1 upwards.',
        de: 'Ab einem Niveau von B1 kannst du teilnehmen.',
      },
      {
        en: 'The timing is flexible, and you can always start on a Monday. We recommend starting your Bildungszeit when a new intensive course begins. That way you learn alongside the other participants from the very first day.',
        de: 'Der Zeitraum ist flexibel, und du kannst immer montags einsteigen. Wir empfehlen dir, die Bildungszeit zu beginnen, wenn ein neuer Intensivkurs startet. So lernst du von Anfang an mit den anderen Teilnehmerinnen und Teilnehmern zusammen.',
      },
    ],
  },

  'medical-german': {
    feeNote: {
      en: 'We set the dates, the number of hours and the fee separately for each group. Ask us in the office and we will give you the current details for your situation.',
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
        en: 'The course is for doctors and other healthcare professionals. Doctors can take it before or after the Fachsprachprüfung Medizin, the specialist language exam for doctors. It is based on levels B2 and C1 of the Common European Framework of Reference.',
        de: 'Der Kurs richtet sich an Ärztinnen und Ärzte vor und nach der Fachsprachprüfung Medizin und an medizinische Fachkräfte. Er orientiert sich an den Niveaustufen B2 und C1 des Gemeinsamen Europäischen Referenzrahmens.',
      },
      {
        en: 'We choose topics from the Fachsprachprüfung to suit the group’s specialisms and level, always with a direct link to everyday practice. They include history-taking, the physical examination, diagnosis, findings and treatment, conversations with relatives, case presentations, interdisciplinary discussions and medical reports.',
        de: 'Wir wählen die Themen der Fachsprachprüfung passend zu den Fachgebieten und zum Kenntnisstand der Gruppe aus, immer mit direktem Bezug zur Praxis. Dazu gehören das Anamnesegespräch, die körperliche Untersuchung, Diagnostik, Befund und Therapie, Gespräche mit Angehörigen, die Fallvorstellung, der interdisziplinäre Austausch und Arztbriefe.',
      },
      {
        en: 'In everyday hospital work it is very important to communicate accurately in professional terms and to take in every piece of information precisely. That is why you practise conversations with patients, relatives, doctors and nursing staff, as well as listening and the written documentation your job involves.',
        de: 'Im Klinikalltag ist es sehr wichtig, sich fachlich richtig zu verständigen und alle Informationen genau aufzunehmen. Deshalb übst du Gespräche mit Patientinnen und Patienten, Angehörigen, Ärztinnen und Ärzten und dem Pflegepersonal, dazu das Hörverstehen und die schriftliche Dokumentation im Beruf.',
      },
      {
        en: 'The course also prepares you to carry on studying in more depth on your own.',
        de: 'Der Kurs leitet dich außerdem zum vertiefenden Selbststudium an.',
      },
    ],
  },

  'in-company': {
    feeNote: {
      en: 'We work out the price separately for each company. The consultation and the quote are always without obligation.',
      de: 'Den Preis kalkulieren wir für jede Firma einzeln. Die Studienberatung und das Angebot sind stets unverbindlich.',
    },
    conditions: [
      {
        en: 'We are happy to take the time to sit down with you and get a picture of your team’s learning needs, goals and language skills. From that, we draw up the training plan.',
        de: 'Gerne nehmen wir uns Zeit für eine gemeinsame Studienberatung, in der wir uns ein Bild von Lernbedürfnissen, Lernzielen und Sprachkenntnissen machen. Daraus entwickeln wir anschließend den Ausbildungsplan.',
      },
      {
        en: 'For a company course to work well, it is important that the employees taking part are at roughly the same language level.',
        de: 'Für die erfolgreiche Umsetzung eines Firmenkurses ist es wichtig, dass sich die Mitarbeitenden ungefähr auf demselben Sprachniveau befinden.',
      },
      {
        en: 'CASA works with many Bremen companies that are looking for a reliable partner for the language and intercultural training of their staff.',
        de: 'CASA arbeitet mit vielen Bremer Firmen zusammen, die einen zuverlässigen Partner für die sprachliche und interkulturelle Qualifikation ihrer Mitarbeiterinnen und Mitarbeiter suchen.',
      },
    ],
  },

  'german-for-groups': {
    feeNote: {
      en: 'We work out the price separately for each group. Tell us the group size, ages, dates and what you would like to focus on, and we will be glad to put together an individual, no-obligation quote.',
      de: 'Wir kalkulieren für jede Gruppe einzeln. Nenn uns Gruppengröße, das ungefähre Sprachniveau, Alter, Zeitraum und eure Schwerpunkte, dann erstellen wir dir gern ein individuelles und unverbindliches Angebot.',
    },
    conditions: [
      {
        // The focus on speaking is the old casa-bremen.de wording.
        en: 'Teaching is 20 lessons a week, with materials we have written ourselves or put together specially. The focus is on spoken German and using it in conversation, and of course we practise grammar for that too. If you would like particular content or a different number of hours, we are happy to arrange it.',
        de: 'Der Unterricht umfasst 20 Unterrichtseinheiten pro Woche mit eigens entwickelten oder speziell zusammengestellten Materialien. Der Schwerpunkt liegt auf der gesprochenen Sprache und ihrer Anwendung im Gespräch, dafür üben wir natürlich auch Grammatik. Wenn du besondere Inhalte oder eine andere Stundenzahl wünschst, setzen wir deine Vorstellungen gern um.',
      },
      {
        en: 'Every participant receives a certificate of attendance at the end of the course.',
        de: 'Zum Abschluss des Kurses erhalten alle Teilnehmenden ein Teilnahmezertifikat.',
      },
      {
        // Who the hosts are is the old casa-bremen.de wording.
        en: 'We arrange accommodation for your group with Bremen host families, in single or double rooms, with or without meals. We choose every home in person, and all of them have good public transport links. Our hosts, whether they live on their own or are families with children, give guests from all over the world a warm welcome.',
        de: 'Wir kümmern uns um die Unterbringung deiner Gruppe in Einzel- oder Doppelzimmern bei Bremer Gastfamilien, wahlweise mit oder ohne Verpflegung. Alle Unterkünfte wählen wir persönlich aus, und alle sind gut an den Nahverkehr angebunden. Unsere Gastgeberinnen und Gastgeber, ob Einzelpersonen oder Familien mit Kindern, heißen Gäste aus aller Welt herzlich willkommen.',
      },
      {
        en: 'Host families meet the students when they arrive at the station or the airport, and everyone gets a public transport ticket for the whole of their stay.',
        de: 'Die Gastfamilien begrüßen die Schülerinnen und Schüler bei ihrer Ankunft am Bahnhof oder Flughafen. Alle Teilnehmenden erhalten ein Ticket für den öffentlichen Nahverkehr für den Zeitraum ihres Aufenthaltes.',
      },
      {
        en: 'For accompanying adults we arrange accommodation as you wish, usually in a central hotel with single rooms and breakfast.',
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
