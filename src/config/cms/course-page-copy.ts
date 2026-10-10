import type { SlotKind } from '@/lib/cms/slot-kinds';

/**
 * The course page's own words: the ones every course page shares.
 *
 * These were `locale === 'de' ? … : …` pairs inside the page component, where
 * no editor can reach them. Here each has a stable key, both languages and the
 * label the website editor shows. The page reads them through
 * `getPageContent(locale).t(key)`, which returns the live text, or this
 * default when nobody has changed it.
 *
 * Changing one changes it on every course page; the editor says so. Copy that
 * belongs to one course lives with that course (config/courses/*), and its keys
 * are `course.<slug>.…` (src/lib/cms/catalog.ts).
 */

export type CopyEntry = {
  de: string;
  en: string;
  label: string;
  section: string;
  kind: SlotKind;
  max?: number;
};

export const COURSE_PAGE_COPY = {
  'coursePage.eyebrow': { de: 'Kursdetail', en: 'Course detail', label: 'Eyebrow', section: 'Hero', kind: 'label' },
  'coursePage.leadFallback': {
    de: 'Schritt für Schritt von einer Niveaustufe zur nächsten.',
    en: 'Step by step from one level to the next.',
    label: 'Lead without course text',
    section: 'Hero',
    kind: 'lead',
  },
  'coursePage.breadcrumb.home': { de: 'Start', en: 'Home', label: 'Breadcrumb · Home', section: 'Hero', kind: 'label' },
  'coursePage.breadcrumb.courses': { de: 'Kurse', en: 'Courses', label: 'Breadcrumb · Courses', section: 'Hero', kind: 'label' },

  'coursePage.cta.checkLevel': { de: 'Niveau zuerst prüfen', en: 'Check your level first', label: 'Button · Check level', section: 'Hero', kind: 'button' },
  'coursePage.cta.register': { de: 'Jetzt anmelden', en: 'Register now', label: 'Button · Register', section: 'Hero', kind: 'button' },
  'coursePage.cta.advice': { de: 'Beratung anfragen', en: 'Get advice', label: 'Button · Advice', section: 'Hero', kind: 'button' },
  'coursePage.cta.interest': { de: 'Interesse anmelden', en: 'Register your interest', label: 'Button · Interest list', section: 'Hero', kind: 'button' },
  'coursePage.cta.question': { de: 'Frage stellen', en: 'Ask a question', label: 'Button · Question', section: 'Hero', kind: 'button' },

  'coursePage.info.title': { de: 'Kursinfo', en: 'Course info', label: 'Heading', section: 'Course info', kind: 'heading' },
  'coursePage.info.nextStart': { de: 'Nächster Start', en: 'Next start date', label: 'Next start', section: 'Course info', kind: 'label' },
  'coursePage.info.joining': { de: 'Einstieg', en: 'Joining', label: 'Joining a running course', section: 'Course info', kind: 'label' },
  'coursePage.info.dates': { de: 'Zeitraum', en: 'Dates', label: 'Dates', section: 'Course info', kind: 'label' },
  'coursePage.info.lessons': {
    de: 'Unterrichtseinheiten pro Woche',
    en: 'Lessons a week',
    label: 'Lessons a week',
    section: 'Course info',
    kind: 'label',
  },
  'coursePage.info.levels': { de: 'Niveaubereich', en: 'Level range', label: 'Level range', section: 'Course info', kind: 'label' },
  'coursePage.info.price': { de: 'Preis', en: 'Price', label: 'Price', section: 'Course info', kind: 'label' },
  'coursePage.info.note': {
    de: 'Termine und freie Plätze bestätigen wir dir bei der Anmeldung.',
    en: 'We confirm the dates and your place when you register.',
    label: 'Note',
    section: 'Course info',
    kind: 'note',
  },
  'coursePage.info.noteInterest': {
    de: 'Einen festen Termin gibt es noch nicht. Melde dein Interesse an, dann melden wir uns, sobald die Gruppe steht.',
    en: 'There are no fixed dates yet. Register your interest and we will get in touch once the group is complete.',
    label: 'Note · Interest list',
    section: 'Course info',
    kind: 'note',
  },

  'coursePage.goals.practiceTitle': { de: 'Das übst du', en: 'What you practise', label: 'Practice heading', section: 'Learning goals', kind: 'heading' },

  'coursePage.steps.title': { de: 'So geht es weiter', en: 'What happens next', label: 'Heading', section: 'Next steps', kind: 'heading' },
  'coursePage.steps.lead': {
    de: 'Von der Einstufung bis zum ersten Kurstag sind es drei Schritte.',
    en: 'There are three steps between your placement and your first day in class.',
    label: 'Lead',
    section: 'Next steps',
    kind: 'lead',
  },
  'coursePage.steps.1.title': { de: 'Einstufung machen', en: 'Take the placement test', label: 'Step 1 · Title', section: 'Next steps', kind: 'card-title' },
  'coursePage.steps.1.text': {
    de: 'Mach den kostenlosen Online-Test oder komm zur Einstufung bei uns vorbei. Wenn du noch gar kein Deutsch sprichst, beginnst du direkt bei A1.',
    en: 'Do the free online test, or come to the school and take the placement test in person. If you do not speak any German yet, you start straight at A1.',
    label: 'Step 1 · Text',
    section: 'Next steps',
    kind: 'card-text',
  },
  'coursePage.steps.2.title': { de: 'Termin buchen', en: 'Book your start date', label: 'Step 2 · Title', section: 'Next steps', kind: 'card-title' },
  'coursePage.steps.2.text': {
    de: 'Such dir einen Starttermin aus und schick uns deine Anmeldung.',
    en: 'Choose a start date and send us your registration.',
    label: 'Step 2 · Text',
    section: 'Next steps',
    kind: 'card-text',
  },
  'coursePage.steps.3.title': { de: 'Start vorbereiten', en: 'Get ready to start', label: 'Step 3 · Title', section: 'Next steps', kind: 'card-title' },
  'coursePage.steps.3.text': {
    de: 'Plane deine Zeit und leg deine Unterlagen bereit. Wenn du noch eine Unterkunft in Bremen brauchst, vermitteln wir dir gern ein Zimmer.',
    en: 'Plan your time and get your documents ready. If you still need somewhere to live in Bremen, we are happy to arrange a room for you.',
    label: 'Step 3 · Text',
    section: 'Next steps',
    kind: 'card-text',
  },

  'coursePage.testimonials.title': {
    de: 'Was Lernende über CASA sagen',
    en: 'What learners say about CASA',
    label: 'Heading',
    section: 'Learner voices',
    kind: 'heading',
  },
  'coursePage.testimonials.lead': {
    de: 'Lernende erzählen, wie sie ihren Kurs bei uns erlebt haben.',
    en: 'Learners describe what their course with us was like.',
    label: 'Lead',
    section: 'Learner voices',
    kind: 'lead',
  },
  'coursePage.related.title': { de: 'Andere Kurse bei CASA', en: 'Other courses at CASA', label: 'Heading', section: 'Other courses', kind: 'heading' },
  'coursePage.rail.title': { de: 'Auf einen Blick', en: 'At a glance', label: 'Heading', section: 'At a glance', kind: 'heading' },
} satisfies Record<string, CopyEntry>;

export type CoursePageCopyKey = keyof typeof COURSE_PAGE_COPY;
