import type { ContentLocale } from '@/lib/content/types';

/**
 * Per-course page prose: who the course is for, and what happens next.
 *
 * THIS EXISTS BECAUSE FIVE COURSE PAGES WERE THE SAME PAGE.
 *
 * `src/app/courses/[slug]/page.tsx` branched only on the archetype and the quote
 * audience, which is three variants for seven courses. So Intensive German,
 * Evening Course, Bildungszeit, German for Medical and Special Courses every one
 * rendered the heading "This course fits learners who want structure and human
 * support", under it the same three bullets ("Clear weekly learning goals",
 * "Practice tasks with direct feedback", "Next-step orientation for exams or
 * daily life"), and the same three next steps ("Complete registration", "Confirm
 * placement", "Prepare your start"). Measured: the seven pages differed by 471 to
 * 581 words and were otherwise identical in prose. A reader comparing two formats
 * found the numbers changed and nothing else did — which is the same failure the
 * archetype registry was built to fix, one layer up.
 *
 * The archetype still owns the page SHAPE. This owns what the shape says. A slug
 * absent from here falls back to the archetype default, so nothing regresses by
 * omission — German for Groups and Firmenunterricht are deliberately absent,
 * because `package-inquiry` copy is already written for an organiser rather than
 * a learner and is specific enough.
 *
 * EVERY FACT BELOW IS FROM docs/COURSE_FACTS_SOURCE_OF_TRUTH.md. Read it before
 * changing a number here. Two rules it enforces that are easy to break by
 * paraphrase:
 *
 *   - Bildungszeit is the one place the site quotes CLOCK HOURS (30-40 a week),
 *     not UE. Do not convert or blend the two.
 *   - German for Medical publishes only its B2/C1 entry and the FSP framing.
 *     Its fee, weekly hours and dates are NOT public and are not to be written
 *     here, in any form, until staff confirm them.
 */

export type CourseAudienceContent = {
  title: string;
  bullets: string[];
};

export type CourseProcessStep = {
  step: string;
  title: string;
  description: string;
};

export type CourseNextSteps = {
  /** Overrides the archetype's generic lead-in when the journey differs. */
  description?: string;
  steps: CourseProcessStep[];
};

type LocalisedCourseContent = {
  audience?: CourseAudienceContent;
  nextSteps?: CourseNextSteps;
};

function content(locale: ContentLocale): Record<string, LocalisedCourseContent> {
  const de = locale === 'de';

  return {
    /* ------------------------------------------------------------------ */
    'intensive-german': {
      audience: {
        title: de
          ? 'In einem Jahr von A1 bis C1'
          : 'For learners who need a level, not just lessons',
        bullets: [
          de
            ? 'Mit 20 Unterrichtseinheiten pro Woche schaffst du eine ganze Niveaustufe in etwa 8 bis 9 Wochen.'
            : 'A full CEFR level in about 8 to 9 weeks at 20 lessons a week',
          // The afternoon course is four days, not five. The facts doc calls this
          // "the single easiest fact on this page to mis-copy".
          de
            ? 'Du lernst vormittags oder nachmittags. Der Nachmittagskurs läuft von Montag bis Donnerstag.'
            : 'Morning and afternoon courses — the afternoon course runs Monday to Thursday',
          de
            ? 'Neue Kurse beginnen jeden Monat, und die Einstufung zeigt, auf welchem Niveau du einsteigst.'
            : 'Monthly start dates, entry after placement',
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    'evening-german': {
      audience: {
        title: de
          ? 'Deutsch lernen neben dem Beruf'
          : 'For people already working a full week',
        bullets: [
          de
            ? 'Du lernst an zwei Abenden pro Woche von 18:30 bis 20:00 Uhr, montags und mittwochs oder dienstags und donnerstags.'
            : 'Two evenings a week, 18:30 to 20:00 — Mon/Wed or Tue/Thu',
          de
            ? 'In einem Trimester schließt du eine halbe Niveaustufe ab, im Jahr also etwa 1½ Niveaustufen.'
            : 'Half a CEFR level per trimester, so roughly 1.5 levels a year',
          // 476 EUR is a per-trimester fee, not an entry point — which is why the
          // course carries pricing_mode 'fixed' rather than 'from'.
          de
            ? 'Du buchst und bezahlst immer ein Trimester.'
            : 'Priced per trimester, so a term is one decision rather than a subscription',
        ],
      },
      nextSteps: {
        description: de
          ? 'Der Abendkurs läuft das ganze Jahr über in Trimestern.'
          : 'The evening course runs year-round in trimesters.',
        steps: [
          {
            step: '1',
            title: de ? 'Einstufung machen' : 'Get placed',
            description: de
              ? 'Mach den kostenlosen Online-Einstufungstest und schick uns dein Ergebnis, oder komm zur Einstufung bei uns vorbei.'
              : 'Take the free online placement test and send us your result, or come in for a placement.',
          },
          {
            step: '2',
            title: de ? 'Trimester wählen' : 'Pick your trimester',
            description: de
              ? 'Such dir ein Trimester aus und melde dich an.'
              : 'You book one trimester rather than an open-ended run.',
          },
          {
            /*
             * The level decides the evenings: on casa-bremen.de each level of a
             * trimester is listed under one pair (Mo/Mi or Di/Do). The German line
             * no longer says the learner picks them.
             */
            step: '3',
            title: de ? 'Deine Abende' : 'Fix your evenings',
            description: de
              ? 'Jede Niveaustufe läuft entweder montags und mittwochs oder dienstags und donnerstags. Deine Abende bleiben das ganze Trimester über gleich.'
              : 'Mon/Wed or Tue/Thu — the pairing stays the same all trimester.',
          },
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    bildungszeit: {
      audience: {
        title: de
          ? 'Für alle, die im Land Bremen arbeiten'
          : 'For employees in Bremen using their statutory educational leave',
        bullets: [
          de
            ? 'Nach dem Bremischen Bildungszeitgesetz hast du in zwei Jahren grundsätzlich Anspruch auf zehn Tage Bildungszeit.'
            : 'Ten days over two years — the entitlement under the Bremisches Bildungszeitgesetz',
          // Clock hours, deliberately. This is the one CASA page that quotes them.
          de
            ? 'Anerkannt wird ein Sprachkurs mit 30 bis 40 Stunden Unterricht pro Woche. Dafür besuchst du zwei Intensivkurse parallel, einen am Vormittag und einen am Nachmittag.'
            : 'Recognition requires 30 to 40 hours of instruction a week, and this format reaches it by running two intensive courses in parallel, one in the morning and one in the afternoon',
          de
            ? 'Du kannst eine bis neun Wochen buchen und an jedem Montag einsteigen.'
            : 'Blocks from one to nine weeks, joining on any Monday',
          // level_min is B1 in the catalogue, and the live site says so plainly.
          // Worth stating: it is the one format on the site that is not open at A1.
          de ? 'Du brauchst mindestens Sprachkenntnisse auf B1-Niveau.' : 'From B1 — this is not a beginners’ route',
        ],
      },
      nextSteps: {
        description: de
          ? 'Die Bildungszeit vereinbarst du mit deinem Arbeitgeber. Wir planen den Kurs passend dazu.'
          : 'Educational leave is agreed between you and your employer. We plan the course around it.',
        steps: [
          {
            step: '1',
            title: de ? 'Niveau prüfen' : 'Confirm your level',
            description: de
              ? 'Die Einstufung zeigt, ob du schon mindestens B1 erreicht hast.'
              : 'Entry starts at B1, confirmed by the placement test.',
          },
          {
            step: '2',
            title: de ? 'Zeitraum wählen' : 'Choose your block',
            description: de
              ? 'Du wählst eine bis neun Wochen und beginnst an einem Montag.'
              : 'One to nine weeks, starting on a Monday.',
          },
          {
            /*
             * ASSUMPTION, deliberately kept vague. The Bremisches
             * Bildungszeitgesetz entitlement and the 30-40 hour threshold are
             * verified; CASA's own paperwork for an employer application is NOT
             * documented anywhere in this repo. So this step points the reader at
             * the office rather than promising a specific document. Confirm with
             * staff and then say exactly what CASA issues.
             */
            step: '3',
            title: de ? 'Mit dem Arbeitgeber klären' : 'Arrange it with your employer',
            description: de
              ? 'Frag im Büro nach, welche Angaben zum Kurs du für deinen Antrag brauchst.'
              : 'Ask the office which course details your application needs.',
          },
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    /*
     * Every bullet here is a restatement of the verified `conditions` already in
     * course-practical-facts.ts. Nothing is added. In particular there is no
     * fee, no weekly hour count and no date, because CASA publishes none of the
     * three for this course — see the facts doc, and note that a dated news post
     * suggesting 26.06-28.08.2026 was checked and found inconclusive.
     */
    'medical-german': {
      audience: {
        title: de
          ? 'Kommunikation und Dokumentation im Klinikalltag'
          : 'For doctors working toward and beyond the Fachsprachprüfung',
        bullets: [
          de
            ? 'Der Kurs orientiert sich an den Niveaustufen B2 und C1.'
            : 'Entry at B2 and C1, the two levels CASA publishes for this course',
          de
            ? 'Die Inhalte richten sich nach den Fachgebieten und dem Kenntnisstand der Gruppe.'
            : 'Content follows the specialisms and current level of the people in the room',
          de
            ? 'Du übst Gespräche, das Hörverstehen und die schriftliche Dokumentation im Beruf.'
            : 'Trains the written clinical documentation the job requires, alongside speaking and listening',
          de
            ? 'Termine, Umfang und Preis legen wir für jede Gruppe fest und nennen sie dir auf Anfrage.'
            : 'Dates, weekly hours and the fee are set per group and given on request',
        ],
      },
      nextSteps: {
        /*
         * This archetype's CTA policy is `advisory-call`, and the generic steps
         * it was inheriting opened with "Complete registration" — a self-serve
         * action that does not exist for this course. The steps now match the
         * policy.
         */
        description: de
          ? 'Dieser Kurs beginnt mit einem Gespräch im Büro.'
          : 'This course starts with a conversation, not a registration.',
        steps: [
          {
            step: '1',
            title: de ? 'Im Büro melden' : 'Contact the office',
            description: de
              ? 'Erzähl uns von deinem Fachgebiet, deinem aktuellen Niveau und deinem Zeitrahmen.'
              : 'Tell us your specialism, your current level, and your timeframe.',
          },
          {
            step: '2',
            title: de ? 'Niveau prüfen' : 'Check your level',
            description: de
              ? 'Der Kurs setzt B2 oder C1 voraus. Mit der Einstufung klären wir, auf welchem Niveau du einsteigst.'
              : 'The course assumes B2 or C1; placement settles which of the two.',
          },
          {
            step: '3',
            title: de ? 'Gruppe und Termine abstimmen' : 'Agree the group and the dates',
            description: de
              ? 'Umfang, Termine und Kosten hängen von der Gruppe ab. Sobald die Gruppe steht, nennen wir sie dir.'
              : 'Scope, dates and cost depend on the group, and are quoted once it is set.',
          },
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    /*
     * Facts from special-course-modules.ts: every module is one evening a week,
     * 90 minutes, 12 weeks, 192 EUR, in the Herbst 2026 term. Levels across the
     * catalogue run A2/B1 to C1+, and the four skills are grammar, writing,
     * speaking and exam preparation.
     */
    'special-courses': {
      audience: {
        title: de
          ? 'Gezielt wiederholen und vertiefen'
          : 'For learners who want one skill lifted, not a whole level',
        bullets: [
          de
            ? 'Jedes Modul hat einen Schwerpunkt, zum Beispiel Grammatik, Schreiben, Aussprache, Sprechen oder die Vorbereitung auf eine Prüfung.'
            : 'One module, one focus: grammar, writing, pronunciation, or exam training',
          de
            ? 'Ein Modul läuft 12 Wochen lang an einem Abend pro Woche, jeweils 90 Minuten. Du kannst es neben einem anderen Kurs oder auch einzeln besuchen.'
            : 'One evening a week, 90 minutes, 12 weeks — alongside another course or on its own',
          de
            ? 'Je nach Modul liegt das Einstiegsniveau zwischen A2/B1 und C1+.'
            : 'From A2/B1 up to C1+ depending on the module, so the entry level fits the module rather than the course',
        ],
      },
      nextSteps: {
        description: de
          ? 'Bis zu deinem Modul sind es drei kurze Schritte.'
          : 'A module is a small decision, and the path to it is correspondingly short.',
        steps: [
          {
            step: '1',
            title: de ? 'Modul wählen' : 'Pick your module',
            description: de
              ? 'Im Wochenplan oben siehst du Abend, Uhrzeit und Niveau jedes Moduls.'
              : 'The week grid above shows each module’s evening, time, and level.',
          },
          {
            step: '2',
            title: de ? 'Niveau prüfen' : 'Check the level',
            description: de
              ? 'Bei jedem Modul steht, welches Niveau du brauchst. Wenn du unsicher bist, hilft dir die Einstufung.'
              : 'Every module states its level. If you are unsure, placement settles it.',
          },
          {
            step: '3',
            title: de ? 'Platz reservieren' : 'Reserve your place',
            description: de
              ? 'Die Gruppen sind klein. Mit deiner Anmeldung reservierst du dir einen Platz.'
              : 'Modules are small, and reserving holds your place for the term.',
          },
        ],
      },
    },
  };
}

export function getCourseAudienceContent(
  slug: string,
  locale: ContentLocale
): CourseAudienceContent | undefined {
  return content(locale)[slug]?.audience;
}

export function getCourseNextSteps(slug: string, locale: ContentLocale): CourseNextSteps | undefined {
  return content(locale)[slug]?.nextSteps;
}
