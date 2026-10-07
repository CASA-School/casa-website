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
          : 'From A1 to C1 in a year',
        bullets: [
          de
            ? 'Mit 20 Unterrichtseinheiten pro Woche schaffst du eine ganze Niveaustufe in etwa 8 bis 9 Wochen.'
            : 'With 20 lessons a week, you complete a whole level in about 8 to 9 weeks.',
          // The afternoon course is four days, not five. The facts doc calls this
          // "the single easiest fact on this page to mis-copy".
          de
            ? 'Du lernst vormittags oder nachmittags. Der Nachmittagskurs läuft von Montag bis Donnerstag.'
            : 'You study in the morning or in the afternoon. The afternoon course runs from Monday to Thursday.',
          de
            ? 'Neue Kurse beginnen jeden Monat, und die Einstufung zeigt, auf welchem Niveau du einsteigst.'
            : 'New courses begin every month, and the placement test shows which level you start at.',
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    'evening-german': {
      audience: {
        title: de
          ? 'Deutsch lernen neben dem Beruf'
          : 'Learning German alongside your job',
        bullets: [
          de
            ? 'Du lernst an zwei Abenden pro Woche von 18:30 bis 20:00 Uhr, montags und mittwochs oder dienstags und donnerstags.'
            : 'You study on two evenings a week from 18:30 to 20:00, on Mondays and Wednesdays or on Tuesdays and Thursdays.',
          de
            ? 'In einem Trimester schließt du eine halbe Niveaustufe ab, im Jahr also etwa 1½ Niveaustufen.'
            : 'In one trimester you complete half a level, so about one and a half levels a year.',
          // 476 EUR is a per-trimester fee, not an entry point — which is why the
          // course carries pricing_mode 'fixed' rather than 'from'.
          de
            ? 'Du buchst und bezahlst immer ein Trimester.'
            : 'You always book and pay for one trimester at a time.',
        ],
      },
      nextSteps: {
        description: de
          ? 'Der Abendkurs läuft das ganze Jahr über in Trimestern.'
          : 'The evening course runs all year round in trimesters.',
        steps: [
          {
            step: '1',
            title: de ? 'Einstufung machen' : 'Take the placement test',
            description: de
              ? 'Mach den kostenlosen Online-Einstufungstest und schick uns dein Ergebnis, oder komm zur Einstufung bei uns vorbei.'
              : 'Do the free online placement test and send us your result, or come to the school and take it in person.',
          },
          {
            step: '2',
            title: de ? 'Trimester wählen' : 'Choose your trimester',
            description: de
              ? 'Such dir ein Trimester aus und melde dich an.'
              : 'Pick a trimester and register for it.',
          },
          {
            /*
             * The level decides the evenings: on casa-bremen.de each level of a
             * trimester is listed under one pair (Mo/Mi or Di/Do). The German line
             * no longer says the learner picks them.
             */
            step: '3',
            title: de ? 'Deine Abende' : 'Your evenings',
            description: de
              ? 'Jede Niveaustufe läuft entweder montags und mittwochs oder dienstags und donnerstags. Deine Abende bleiben das ganze Trimester über gleich.'
              : 'Each level runs either on Mondays and Wednesdays or on Tuesdays and Thursdays. Your evenings stay the same for the whole trimester.',
          },
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    bildungszeit: {
      audience: {
        title: de
          ? 'Für alle, die im Land Bremen arbeiten'
          : 'For everyone who works in the state of Bremen',
        bullets: [
          de
            ? 'Nach dem Bremischen Bildungszeitgesetz hast du in zwei Jahren grundsätzlich Anspruch auf zehn Tage Bildungszeit.'
            : 'Under the Bremisches Bildungszeitgesetz, you are generally entitled to ten days of Bildungszeit over two years.',
          // Clock hours, deliberately. This is the one CASA page that quotes them.
          de
            ? 'Anerkannt wird ein Sprachkurs mit 30 bis 40 Stunden Unterricht pro Woche. Dafür besuchst du zwei Intensivkurse parallel, einen am Vormittag und einen am Nachmittag.'
            : 'A language course is recognised if it has 30 to 40 hours of teaching a week. To reach that, you attend two intensive courses side by side, one in the morning and one in the afternoon.',
          de
            ? 'Du kannst eine bis neun Wochen buchen und an jedem Montag einsteigen.'
            : 'You can book from one to nine weeks and start on any Monday.',
          // level_min is B1 in the catalogue, and the live site says so plainly.
          // Worth stating: it is the one format on the site that is not open at A1.
          de ? 'Du brauchst mindestens Sprachkenntnisse auf B1-Niveau.' : 'Your German needs to be at B1 level or above.',
        ],
      },
      nextSteps: {
        description: de
          ? 'Die Bildungszeit vereinbarst du mit deinem Arbeitgeber. Wir planen den Kurs passend dazu.'
          : 'You arrange your Bildungszeit with your employer, and we plan the course to fit.',
        steps: [
          {
            step: '1',
            title: de ? 'Niveau prüfen' : 'Check your level',
            description: de
              ? 'Die Einstufung zeigt, ob du schon mindestens B1 erreicht hast.'
              : 'The placement test shows whether you have already reached B1 or higher.',
          },
          {
            step: '2',
            title: de ? 'Zeitraum wählen' : 'Choose your dates',
            description: de
              ? 'Du wählst eine bis neun Wochen und beginnst an einem Montag.'
              : 'You choose from one to nine weeks and start on a Monday.',
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
              : 'Ask us in the office which course details you need for your application.',
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
          : 'Communication and documentation in everyday hospital work',
        bullets: [
          de
            ? 'Der Kurs orientiert sich an den Niveaustufen B2 und C1.'
            : 'The course is geared to levels B2 and C1.',
          de
            ? 'Die Inhalte richten sich nach den Fachgebieten und dem Kenntnisstand der Gruppe.'
            : 'The content follows the specialisms and current level of the group.',
          de
            ? 'Du übst Gespräche, das Hörverstehen und die schriftliche Dokumentation im Beruf.'
            : 'You practise conversations, listening and the written documentation your work involves.',
          de
            ? 'Termine, Umfang und Preis legen wir für jede Gruppe fest und nennen sie dir auf Anfrage.'
            : 'We set the dates, the hours and the price for each group, and we will give you the details on request.',
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
          : 'This course starts with a conversation in our office.',
        steps: [
          {
            step: '1',
            title: de ? 'Im Büro melden' : 'Contact the office',
            description: de
              ? 'Erzähl uns von deinem Fachgebiet, deinem aktuellen Niveau und deinem Zeitrahmen.'
              : 'Tell us about your specialism, your current level and your timeframe.',
          },
          {
            step: '2',
            title: de ? 'Niveau prüfen' : 'Check your level',
            description: de
              ? 'Der Kurs setzt B2 oder C1 voraus. Mit der Einstufung klären wir, auf welchem Niveau du einsteigst.'
              : 'The course requires B2 or C1. The placement test shows which of the two levels you start at.',
          },
          {
            step: '3',
            title: de ? 'Gruppe und Termine abstimmen' : 'Agree the group and the dates',
            description: de
              ? 'Umfang, Termine und Kosten hängen von der Gruppe ab. Sobald die Gruppe steht, nennen wir sie dir.'
              : 'The hours, dates and cost depend on the group. As soon as the group is settled, we will let you know.',
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
          : 'Revise what you know and go deeper',
        bullets: [
          de
            ? 'Jedes Modul hat einen Schwerpunkt, zum Beispiel Grammatik, Schreiben, Aussprache, Sprechen oder die Vorbereitung auf eine Prüfung.'
            : 'Each module has one focus, such as grammar, writing, pronunciation, speaking or preparing for an exam.',
          de
            ? 'Ein Modul läuft 12 Wochen lang an einem Abend pro Woche, jeweils 90 Minuten. Du kannst es neben einem anderen Kurs oder auch einzeln besuchen.'
            : 'A module runs for 12 weeks, on one evening a week for 90 minutes. You can take it alongside another course or on its own.',
          de
            ? 'Je nach Modul liegt das Einstiegsniveau zwischen A2/B1 und C1+.'
            : 'Depending on the module, the entry level is between A2/B1 and C1+.',
        ],
      },
      nextSteps: {
        description: de
          ? 'Bis zu deinem Modul sind es drei kurze Schritte.'
          : 'There are three short steps to your module.',
        steps: [
          {
            step: '1',
            title: de ? 'Modul wählen' : 'Choose your module',
            description: de
              ? 'Im Wochenplan oben siehst du Abend, Uhrzeit und Niveau jedes Moduls.'
              : 'The weekly timetable above shows the evening, time and level of each module.',
          },
          {
            step: '2',
            title: de ? 'Niveau prüfen' : 'Check the level',
            description: de
              ? 'Bei jedem Modul steht, welches Niveau du brauchst. Wenn du unsicher bist, hilft dir die Einstufung.'
              : 'Each module shows the level you need. If you are not sure, the placement test will help.',
          },
          {
            step: '3',
            title: de ? 'Platz reservieren' : 'Reserve your place',
            description: de
              ? 'Die Gruppen sind klein. Mit deiner Anmeldung reservierst du dir einen Platz.'
              : 'The groups are small. When you register, you reserve your place.',
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
