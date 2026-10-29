import type { ContentLocale } from '@/lib/content/types';
import { say } from '@/lib/cms/copy';

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
  /** In place of the course's audience line, where the section needs its own. */
  description?: string;
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
  /** `false`: the page has no audience section. */
  audience?: CourseAudienceContent | false;
  nextSteps?: CourseNextSteps;
};

function content(locale: ContentLocale): Record<string, LocalisedCourseContent> {

  return {
    /* ------------------------------------------------------------------ */
    'intensive-german': {
      audience: {
        title: say(locale, 'In einem Jahr von A1 bis C1', 'From A1 to C1 in a year'),
        // Its own lead: the course's audience line also shows on the homepage card, where „Das ist
        // möglich" would point at nothing.
        description: say(locale, 'Das ist möglich für alle, die sich intensiv mit Deutsch beschäftigen möchten – für dein Studium, deinen Beruf und deinen Alltag.', 'It is possible for anyone who wants to work intensively on their German – for your studies, your job and your everyday life.'),
        bullets: [
          say(locale, 'Mit {course.intensive-german.lessons} Unterrichtseinheiten pro Woche kannst du die nächste Niveaustufe in 8 Wochen erreichen.', 'With {course.intensive-german.lessons} lessons a week, you can reach the next level in 8 weeks.'),
          say(locale, 'Du lernst vormittags oder nachmittags, je nach Kursstart.', 'You study in the morning or in the afternoon, depending on when your course starts.'),
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    'evening-german': {
      // „Deutsch lernen neben dem Beruf" left the page in CASA's content review (2026-10-20).
      audience: false,
      nextSteps: {
        description: say(locale, 'Der Abendkurs läuft das ganze Jahr über in Trimestern.', 'The evening course runs all year round in trimesters.'),
        steps: [
          {
            step: '1',
            title: say(locale, 'Einstufung machen', 'Take the placement test'),
            description: say(locale, 'Mach den kostenlosen Online-Einstufungstest und schick uns dein Ergebnis, oder komm zur Einstufung bei uns vorbei.', 'Do the free online placement test and send us your result, or come to the school and take it in person.'),
          },
          {
            step: '2',
            title: say(locale, 'Trimester wählen', 'Choose your trimester'),
            description: say(locale, 'Such dir ein Trimester aus und melde dich an.', 'Pick a trimester and register for it.'),
          },
          {
            /*
             * The level decides the evenings: on casa-bremen.de each level of a
             * trimester is listed under one pair (Mo/Mi or Di/Do). The German line
             * no longer says the learner picks them.
             */
            step: '3',
            title: say(locale, 'Deine Abende', 'Your evenings'),
            description: say(locale, 'Jede Niveaustufe läuft entweder montags und mittwochs oder dienstags und donnerstags. Deine Abende bleiben das ganze Trimester über gleich.', 'Each level runs either on Mondays and Wednesdays or on Tuesdays and Thursdays. Your evenings stay the same for the whole trimester.'),
          },
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    bildungszeit: {
      // No audience section (CASA's content review, 2026-10-29): each of its points, the ten days,
      // the 30–40 hours with two intensive courses, the weekly start and B1, is in „Wichtige Punkte",
      // and the weeks are in the next steps.
      audience: false,
      nextSteps: {
        description: say(locale, 'Die Bildungszeit vereinbarst du mit deinem Arbeitgeber. Wir beraten dich gern.', 'You arrange your Bildungszeit with your employer. We are happy to advise you.'),
        steps: [
          {
            step: '1',
            title: say(locale, 'Niveau prüfen', 'Check your level'),
            description: say(locale, 'Die Einstufung zeigt, ob du schon mindestens B1 erreicht hast.', 'The placement test shows whether you have already reached B1 or higher.'),
          },
          {
            step: '2',
            title: say(locale, 'Zeitraum wählen', 'Choose your dates'),
            description: say(locale, 'Du wählst eine bis neun Wochen und beginnst an einem Montag.', 'You choose from one to nine weeks and start on a Monday.'),
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
            title: say(locale, 'Mit dem Arbeitgeber klären', 'Arrange it with your employer'),
            description: say(locale, 'Frag im Büro nach, welche Angaben zum Kurs du für deinen Antrag brauchst.', 'Ask us in the office which course details you need for your application.'),
          },
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    /*
     * Every bullet here is a restatement of the `conditions` in
     * course-practical-facts.ts. Since 2026-10-09 CASA's terms are known
     * (Fridays 13:00–16:30, ten sessions, €400) but there are still no set
     * dates: the course forms from its interest list (config/courses/
     * interest-list.ts), and the next steps say so.
     */
    'medical-german': {
      audience: {
        title: say(locale, 'Kommunikation und Dokumentation im Klinikalltag', 'Communication and documentation in everyday hospital work'),
        bullets: [
          say(locale, 'Der Kurs orientiert sich an den Niveaustufen B2 und C1.', 'The course is geared to levels B2 and C1.'),
          say(locale, 'Die Inhalte richten sich jeweils nach den Fachgebieten und dem Kenntnisstand der Gruppe.', 'The content follows the specialisms and current level of each group.'),
          say(locale, 'Der Kurs findet freitags von 13 bis 16:30 Uhr statt, an zehn Terminen mit je 4 UE.', 'The course runs on Fridays from 13:00 to 16:30, over ten sessions of 4 lessons.'),
        ],
      },
      nextSteps: {
        /*
         * The interest list (2026-10-09): there is nothing to register for until
         * enough people are interested, so the first step is the list itself —
         * the popup every "Interesse anmelden" link opens — not the office.
         */
        description: say(locale, 'Für diesen Kurs gibt es noch keinen festen Termin. So kommt die Gruppe zustande.', 'This course has no fixed dates yet. This is how the group comes together.'),
        steps: [
          {
            step: '1',
            title: say(locale, 'Interesse anmelden', 'Register your interest'),
            description: say(locale, 'Trag dich mit deinem Niveau und deinen freien Zeiten in die Interessentenliste ein. Das ist unverbindlich.', 'Add your name to the interest list with your level and the times you are free. It doesn’t commit you to anything.'),
          },
          {
            step: '2',
            title: say(locale, 'Die Gruppe kommt zusammen', 'The group comes together'),
            description: say(locale, 'Sobald genug Interessierte zusammen sind, legen wir den Kurszeitraum fest. Der Kurs setzt B2 oder C1 voraus.', 'As soon as there are enough people, we set the course dates. The course requires B2 or C1.'),
          },
          {
            step: '3',
            title: say(locale, 'Termine erhalten und anmelden', 'Get the dates and register'),
            description: say(locale, 'Wir melden uns per E-Mail oder Telefon mit den Terminen. Dann meldest du dich verbindlich an.', 'We get in touch by email or phone with the dates. Then you register for your place.'),
          },
        ],
      },
    },

    /* ------------------------------------------------------------------ */
    /*
     * Facts from special-course-modules.ts: every module is one evening a week,
     * 90 minutes, usually 12 weeks at 192 EUR (16 EUR an evening), in the Herbst 2026 term. Levels across the
     * catalogue run A2/B1 to C1+, and the four skills are grammar, writing,
     * speaking and exam preparation.
     */
    'special-courses': {
      audience: {
        title: say(locale, 'Gezielt wiederholen und vertiefen', 'Revise what you know and go deeper'),
        bullets: [
          say(locale, 'Jedes Modul hat einen Schwerpunkt, zum Beispiel Grammatik, Schreiben, Aussprache, Sprechen oder die Vorbereitung auf eine Prüfung.', 'Each module has one focus, such as grammar, writing, pronunciation, speaking or preparing for an exam.'),
          say(locale, 'Ein Modul läuft meist 12 Wochen lang an einem Abend pro Woche, jeweils 90 Minuten. Du kannst es neben einem anderen Kurs oder auch einzeln besuchen.', 'A module usually runs for 12 weeks, on one evening a week for 90 minutes. You can take it alongside another course or on its own.'),
          say(locale, 'Je nach Modul liegt das Einstiegsniveau zwischen A2/B1 und C1+.', 'Depending on the module, the entry level is between A2/B1 and C1+.'),
        ],
      },
      nextSteps: {
        description: say(locale, 'Bis zu deinem Modul sind es drei kurze Schritte.', 'There are three short steps to your module.'),
        steps: [
          {
            step: '1',
            title: say(locale, 'Modul wählen', 'Choose your module'),
            description: say(locale, 'Im Wochenplan oben siehst du Abend, Uhrzeit und Niveau jedes Moduls.', 'The weekly timetable above shows the evening, time and level of each module.'),
          },
          {
            step: '2',
            title: say(locale, 'Niveau prüfen', 'Check the level'),
            description: say(locale, 'Bei jedem Modul steht, welches Niveau du brauchst. Wenn du unsicher bist, hilft dir die Einstufung.', 'Each module shows the level you need. If you are not sure, the placement test will help.'),
          },
          {
            step: '3',
            title: say(locale, 'Platz reservieren', 'Reserve your place'),
            description: say(locale, 'Die Gruppen sind klein. Mit deiner Anmeldung reservierst du dir einen Platz.', 'The groups are small. When you register, you reserve your place.'),
          },
        ],
      },
    },
  };
}

/** The page's audience section: its own content, `false` for none, undefined for the archetype's default. */
export function getCourseAudienceContent(
  slug: string,
  locale: ContentLocale
): CourseAudienceContent | false | undefined {
  return content(locale)[slug]?.audience;
}

export function getCourseNextSteps(slug: string, locale: ContentLocale): CourseNextSteps | undefined {
  return content(locale)[slug]?.nextSteps;
}
