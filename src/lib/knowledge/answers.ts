import { coursePracticalFacts } from '@/config/courses/course-practical-facts';
import { footerConfig } from '@/config/footer';
import { FOOTER_TEXT_DE } from '@/config/footer-text';
import { NO_VALUE, type FactValues } from '@/lib/cms/facts';
import { getCoursePath } from '@/lib/content/course-routes';

import type { KnowledgeLocale } from './engine';
import { fold } from './text';

/**
 * Direct answers from the live values: "Was kostet der Intensivkurs?", "When
 * is the next telc B2 exam?", "Wann habt ihr geöffnet?". The figure comes from
 * the same facts the pages print (src/lib/cms/facts.server.ts), so CLARA and
 * the search box never quote a price or a date the page does not show.
 *
 * Returns null whenever the question or the value is not clear enough; the
 * caller then answers from the pages instead.
 */

export type QuickAnswer = {
  kind: 'price' | 'start' | 'exam-date' | 'lessons' | 'hours' | 'address' | 'contact';
  message: string;
  href: string;
  label: string;
};

type Course = 'intensive-german' | 'evening-german' | 'special-courses' | 'medical-german' | 'bildungszeit' | 'in-company' | 'german-for-groups';
type ExamCode = 'telc_b2' | 'telc_c1_hochschule';
type Entity = { kind: 'course'; slug: Course } | { kind: 'exam'; code: ExamCode } | { kind: 'exams' } | { kind: 'accommodation' } | { kind: 'enrolment' };

const COURSE_NAME: Record<Course, { de: string; en: string; deNext: string; enNext: string }> = {
  'intensive-german': { de: 'Der Intensivkurs', en: 'The intensive course', deNext: 'Der nächste Intensivkurs', enNext: 'The next intensive course' },
  'evening-german': { de: 'Der Abendkurs', en: 'The evening course', deNext: 'Der nächste Abendkurs', enNext: 'The next evening course' },
  'special-courses': { de: 'Ein Spezialkurs', en: 'A special course', deNext: 'Der nächste Spezialkurs', enNext: 'The next special course' },
  'medical-german': { de: 'Deutsch für Pflege und Medizin', en: 'German for nursing and medicine', deNext: 'Der nächste Kurs Deutsch für Pflege und Medizin', enNext: 'The next German for nursing and medicine course' },
  bildungszeit: { de: 'Die Bildungszeit', en: 'Bildungszeit', deNext: 'Die nächste Bildungszeit', enNext: 'The next Bildungszeit' },
  'in-company': { de: 'Firmenunterricht', en: 'In-company teaching', deNext: 'Firmenunterricht', enNext: 'In-company teaching' },
  'german-for-groups': { de: 'Unterricht für Gruppen', en: 'Classes for groups', deNext: 'Unterricht für Gruppen', enNext: 'Classes for groups' },
};

const EXAM_NAME = { telc_b2: 'telc Deutsch B2', telc_c1_hochschule: 'telc Deutsch C1 Hochschule' } as const;
const EXAM_PATH = { telc_b2: '/exams/b2', telc_c1_hochschule: '/exams/c1' } as const;

/** Course pages a visitor may be on, for "Und was kostet das?" asked there. */
const PAGE_ENTITY: Array<[RegExp, Entity]> = [
  [/^\/courses\/intensive-german/, { kind: 'course', slug: 'intensive-german' }],
  [/^\/courses\/evening-course/, { kind: 'course', slug: 'evening-german' }],
  [/^\/courses\/special-courses/, { kind: 'course', slug: 'special-courses' }],
  [/^\/courses\/german-for-medical/, { kind: 'course', slug: 'medical-german' }],
  [/^\/courses\/bildungszeit/, { kind: 'course', slug: 'bildungszeit' }],
  [/^\/courses\/firmenunterricht/, { kind: 'course', slug: 'in-company' }],
  [/^\/courses\/german-for-groups/, { kind: 'course', slug: 'german-for-groups' }],
  [/^\/exams\/b2/, { kind: 'exam', code: 'telc_b2' }],
  [/^\/exams\/c1/, { kind: 'exam', code: 'telc_c1_hochschule' }],
  [/^\/accommodation/, { kind: 'accommodation' }],
];

function entityIn(text: string): Entity | null {
  const t = ` ${fold(text)} `;
  const examContext = /telc|prufung|exam|zertifikat|certificate/.test(t);
  // Both exams named ("B2 or C1 Hochschule?"): answer for both.
  if (/\bc1\b/.test(t) && /\bb2\b/.test(t) && (examContext || /hochschule/.test(t))) return { kind: 'exams' };
  if (/\bc1\b/.test(t) && (examContext || /hochschule/.test(t))) return { kind: 'exam', code: 'telc_c1_hochschule' };
  if (/\bb2\b/.test(t) && examContext) return { kind: 'exam', code: 'telc_b2' };
  if (/einschreibegebuhr|anmeldegebuhr|einschreibung|enrolment fee|enrollment fee|registration fee/.test(t)) return { kind: 'enrolment' };
  if (/bildungszeit|bildungsurlaub|training leave/.test(t)) return { kind: 'course', slug: 'bildungszeit' };
  if (/medizin|pflege|arzt|arzte|medical|nursing|doctor|fachsprach/.test(t)) return { kind: 'course', slug: 'medical-german' };
  if (/intensiv/.test(t)) return { kind: 'course', slug: 'intensive-german' };
  if (/abend|evening/.test(t)) return { kind: 'course', slug: 'evening-german' };
  if (/spezialkurs|special course|aussprache|pronunciation|konversation|conversation/.test(t)) return { kind: 'course', slug: 'special-courses' };
  if (/firmen|unternehmen|in-company|company|betrieb/.test(t)) return { kind: 'course', slug: 'in-company' };
  if (/\bgruppen?\b|schulklasse|klassenfahrt|\bgroups?\b|school class/.test(t)) return { kind: 'course', slug: 'german-for-groups' };
  if (/unterkunft|wohnen|\bwg\b|gastfamilie|zimmer|miete|kaution|accommodation|housing|host family|shared flat|\brooms?\b|\brent\b|deposit/.test(t)) return { kind: 'accommodation' };
  return null;
}

type Kind = QuickAnswer['kind'] | 'deadline';

function kindIn(text: string): Kind | null {
  const t = ` ${fold(text)} `;
  if (/offnungszeit|burozeit|sprechzeit|geoffnet|office hours|opening hours|wann (seid|habt|ist) (ihr|das buro)|when are you open|when is the office open/.test(t)) return 'hours';
  if (/adresse|anfahrt|\bwo\b[^?]{0,20}\b(ist|seid|finde|liegt|befindet)\b|address|where (exactly )?(is|are) (you|casa|the school|your school)|how do i get to/.test(t)) return 'address';
  if (/telefon|nummer|anrufen|phone|call you|e-?mail adresse|email address|wie erreiche|how (can|do) i (reach|contact)/.test(t)) return 'contact';
  if (/anmeldeschluss|frist|deadline|bis wann.*anmeld|register by|registration closes/.test(t)) return 'deadline';
  if (/wie viele (stunden|unterrichts)|stunden pro woche|unterrichtseinheiten|lessons (a|per) week|hours (a|per) week|how many (hours|lessons)/.test(t)) return 'lessons';
  if (/kost|preis|gebuhr|teuer|kaution|price|cost|\bfees?\b|deposit|how much|wie viel(?!e)(?! uhr)|wie hoch|\beuro\b|€/.test(t)) return 'price';
  if (/wann|when|beginn|start|nachste|next|termin|\bdates?\b/.test(t)) return 'start';
  return null;
}

const value = (facts: FactValues, id: string) => {
  const found = facts[id];
  return found && found !== NO_VALUE ? found : undefined;
};

export function quickAnswer(
  question: string,
  { locale, facts, context, pagePath }: { locale: KnowledgeLocale; facts: FactValues; context?: string; pagePath?: string }
): QuickAnswer | null {
  const de = locale === 'de';
  const kind = kindIn(question);
  if (!kind) return null;

  if (kind === 'hours') {
    const hours = footerConfig.contact.officeHours.map((line) => (de ? FOOTER_TEXT_DE[line] ?? line : line));
    return {
      kind,
      message: de
        ? `Unser Büro ist für dich da: ${hours.join(', ')}. Du kannst in dieser Zeit auch ohne Termin vorbeikommen.`
        : `Our office is open ${hours.join(', ')}. You are welcome to drop in during these hours without an appointment.`,
      href: '/contact',
      label: de ? 'Kontakt' : 'Contact',
    };
  }
  if (kind === 'address') {
    const address = de ? FOOTER_TEXT_DE['Am Dobben 14-16, 28203 Bremen, Germany'] ?? footerConfig.contact.address : footerConfig.contact.address;
    return {
      kind,
      message: de ? `Du findest uns in Bremen: ${address}.` : `You will find us in Bremen: ${address}.`,
      href: '/contact',
      label: de ? 'Kontakt und Anfahrt' : 'Contact and directions',
    };
  }
  if (kind === 'contact') {
    const email = footerConfig.contact.emails[0]?.label ?? 'info@casa-bremen.de';
    return {
      kind,
      message: de
        ? `Du erreichst uns telefonisch unter ${footerConfig.contact.phone} und per E-Mail an ${email}. Oder schreib uns über das Kontaktformular.`
        : `You can reach us by phone on ${footerConfig.contact.phone} and by email at ${email}, or write to us through the contact form.`,
      href: '/contact',
      label: de ? 'Zum Kontaktformular' : 'Go to the contact form',
    };
  }

  const pageEntity = pagePath ? PAGE_ENTITY.find(([pattern]) => pattern.test(pagePath))?.[1] ?? null : null;
  const entity = entityIn(question) ?? (context ? entityIn(context) : null) ?? pageEntity;
  if (!entity) return null;

  if (entity.kind === 'enrolment') {
    const fee = value(facts, 'course.enrolment-fee');
    if (!fee) return null;
    return {
      kind: 'price',
      message: de
        ? `Wenn du dich zum ersten Mal an unserer Schule anmeldest, zahlst du einmalig eine Einschreibegebühr von ${fee}.`
        : `The first time you register at our school, there is a one-off enrolment fee of ${fee}.`,
      href: '/courses',
      label: de ? 'Zu den Kursen' : 'Go to the courses',
    };
  }

  if (entity.kind === 'accommodation') {
    if (kind !== 'price') return null;
    const rent = value(facts, 'accommodation.rent-4-weeks');
    const extra = value(facts, 'accommodation.extra-week');
    const booking = value(facts, 'accommodation.booking-fee');
    const deposit = value(facts, 'accommodation.deposit');
    if (!rent) return null;
    return {
      kind,
      message: de
        ? `Ein Zimmer in einer CASA-WG oder bei einer Gastfamilie kostet ${rent} für 4 Wochen${extra ? ` und ${extra} für jede weitere Woche` : ''}.${booking ? ` Dazu kommen eine einmalige Vermittlungsgebühr von ${booking}` : ''}${booking && deposit ? ` und eine Kaution von ${deposit}, die du nach deiner Abreise zurückbekommst.` : booking ? '.' : ''} Eine Unterkunft vermitteln wir nur Teilnehmenden der Intensivkurse.`
        : `A room in a CASA shared flat or with a host family costs ${rent} for 4 weeks${extra ? ` and ${extra} for each further week` : ''}.${booking ? ` There is also a one-off booking fee of ${booking}` : ''}${booking && deposit ? ` and a deposit of ${deposit}, which you get back after you leave.` : booking ? '.' : ''} We arrange accommodation only for participants of the intensive courses.`,
      href: '/accommodation',
      label: de ? 'Zur Unterkunft' : 'Go to accommodation',
    };
  }

  if (entity.kind === 'exams') {
    const codes: ExamCode[] = ['telc_b2', 'telc_c1_hochschule'];
    const label = de ? 'Zu den Prüfungen' : 'Go to the exams';
    if (kind === 'price') {
      const lines = codes.flatMap((code) => {
        const fee = value(facts, `exam.${code}.fee`);
        return fee ? [de ? `${EXAM_NAME[code]} kostet ${fee}.` : `${EXAM_NAME[code]} costs ${fee}.`] : [];
      });
      return lines.length ? { kind, message: lines.join(' '), href: '/exams', label } : null;
    }
    if (kind === 'start' || kind === 'deadline') {
      const lines = codes.flatMap((code) => {
        const date = value(facts, `exam.${code}.next-date`);
        const deadline = value(facts, `exam.${code}.deadline`);
        if (!date) return [];
        return [
          de
            ? `${EXAM_NAME[code]}: am ${date}${deadline ? `, Anmeldeschluss ${deadline}` : ''}.`
            : `${EXAM_NAME[code]}: on ${date}${deadline ? `, registration closes ${deadline}` : ''}.`,
        ];
      });
      if (!lines.length) return null;
      return { kind: 'exam-date', message: `${de ? 'Die nächsten Prüfungstermine:' : 'The next exam dates:'} ${lines.join(' ')}`, href: '/exams', label };
    }
    return null;
  }

  if (entity.kind === 'exam') {
    const name = EXAM_NAME[entity.code];
    const href = EXAM_PATH[entity.code];
    const label = de ? `Zu ${name}` : `Go to ${name}`;
    if (kind === 'price') {
      const fee = value(facts, `exam.${entity.code}.fee`);
      const part = value(facts, `exam.${entity.code}.part-fee`);
      const prep = value(facts, `exam.${entity.code}.preparation-price`);
      if (!fee) return null;
      return {
        kind,
        message: de
          ? `${name} kostet ${fee}${part ? `, ein einzelner Prüfungsteil ${part}` : ''}.${prep ? ` Der Vorbereitungskurs kostet ${prep}.` : ''}`
          : `${name} costs ${fee}${part ? `, or ${part} for a single part` : ''}.${prep ? ` The preparation course costs ${prep}.` : ''}`,
        href,
        label,
      };
    }
    if (kind === 'start' || kind === 'deadline') {
      const date = value(facts, `exam.${entity.code}.next-date`);
      const deadline = value(facts, `exam.${entity.code}.deadline`);
      if (!date) {
        return {
          kind: 'exam-date',
          message: de
            ? `Für ${name} steht gerade kein neuer Termin fest. Schreib uns, dann sagen wir dir Bescheid, sobald es einen gibt.`
            : `There is no new date for ${name} at the moment. Write to us and we will let you know as soon as there is one.`,
          href,
          label,
        };
      }
      return {
        kind: 'exam-date',
        message: de
          ? `Die nächste Prüfung ${name} ist am ${date}.${deadline ? ` Anmeldeschluss ist der ${deadline}.` : ''}`
          : `The next ${name} exam is on ${date}.${deadline ? ` Registration closes on ${deadline}.` : ''}`,
        href,
        label,
      };
    }
    return null;
  }

  // "Intensivkurs mit Unterkunft": the course's price, then the room's.
  const withRoom = (answer: QuickAnswer | null): QuickAnswer | null => {
    if (!answer || answer.kind !== 'price' || !/unterkunft|wohnen|\bwg\b|gastfamilie|zimmer|accommodation|housing|host family|shared flat|\broom\b/.test(fold(question))) return answer;
    const room = quickAnswer(de ? 'Was kostet die Unterkunft?' : 'What does accommodation cost?', { locale, facts });
    return room ? { ...answer, message: `${answer.message} ${room.message}` } : answer;
  };

  const name = COURSE_NAME[entity.slug];
  const href = getCoursePath(entity.slug);
  const label = de ? `Mehr zu ${name.de.replace(/^(Der|Die|Ein) /, '')}` : `More about ${name.en.replace(/^(The|A) /, '').replace(/^./, (c) => c.toLowerCase())}`;

  if (kind === 'price') return withRoom(coursePrice(entity.slug));

  function coursePrice(slug: Course): QuickAnswer | null {
    if (slug === 'intensive-german') {
      const four = value(facts, 'course.intensive-german.price-4-weeks');
      const eight = value(facts, 'course.intensive-german.price-8-weeks');
      const enrol = value(facts, 'course.enrolment-fee');
      // "Each additional week" is on the course page's fee list, not a live value.
      const extra = coursePracticalFacts['intensive-german']?.fees?.find((fee) => /additional week/i.test(fee.label.en))?.amount[locale];
      if (!four) return null;
      return {
        kind: 'price',
        message: de
          ? `Der Intensivkurs kostet ${four} für 4 Wochen${eight ? `, ${eight} für 8 Wochen` : ''}${extra ? ` und ${extra} für jede weitere Woche` : ''}.${enrol ? ` Bei deiner ersten Anmeldung kommt eine einmalige Einschreibegebühr von ${enrol} dazu, außerdem das Lehrbuch.` : ' Dazu kommt das Lehrbuch.'}`
          : `The intensive course costs ${four} for 4 weeks${eight ? `, ${eight} for 8 weeks` : ''}${extra ? ` and ${extra} for each additional week` : ''}.${enrol ? ` On your first registration there is a one-off enrolment fee of ${enrol}, plus the textbook.` : ' The textbook is extra.'}`,
        href,
        label,
      };
    }
    if (slug === 'special-courses') {
      const perModule = value(facts, 'course.special-courses.price-per-module');
      const evening = value(facts, 'course.special-courses.price-per-evening');
      if (!perModule) return null;
      return {
        kind: 'price',
        message: de
          ? `Ein Spezialkurs kostet ${perModule} pro Modul${evening ? `, also ${evening} pro Abend` : ''}.`
          : `A special course costs ${perModule} per module${evening ? `, which is ${evening} an evening` : ''}.`,
        href,
        label,
      };
    }
    // Its fee is on the course page, not in the catalogue's price field.
    if (slug === 'medical-german') return null;
    const price = value(facts, `course.${slug}.price`);
    if (!price) return null;
    if (/anfrage|request/i.test(price)) {
      return {
        kind: 'price',
        message: de
          ? `Für ${name.de} gibt es keinen Listenpreis: Wir machen dir nach einem unverbindlichen Gespräch ein Angebot.`
          : `${name.en} has no list price: we make you an offer after a no-obligation conversation.`,
        href,
        label,
      };
    }
    return {
      kind: 'price',
      message: de
        ? `${name.de} kostet ${price}${slug === 'evening-german' ? ' pro Trimester, dazu kommt das Lehrbuch' : ''}.`
        : `${name.en} costs ${price}${slug === 'evening-german' ? ' per term, plus the textbook' : ''}.`,
      href,
      label,
    };
  }

  if (kind === 'start') {
    const start = value(facts, `course.${entity.slug}.next-start`);
    const end = value(facts, `course.${entity.slug}.next-end`);
    if (!start) return null;
    return {
      kind,
      message: de
        ? `${name.deNext} beginnt am ${start}${end ? ` und läuft bis zum ${end}` : ''}.`
        : `${name.enNext} starts on ${start}${end ? ` and runs until ${end}` : ''}.`,
      href,
      label,
    };
  }

  if (kind === 'lessons') {
    const lessons = value(facts, `course.${entity.slug}.lessons`);
    if (!lessons) return null;
    return {
      kind,
      message: de
        ? `${name.de} hat ${lessons} Unterrichtseinheiten à 45 Minuten pro Woche.`
        : `${name.en} has ${lessons} lessons of 45 minutes a week.`,
      href,
      label,
    };
  }

  return null;
}
