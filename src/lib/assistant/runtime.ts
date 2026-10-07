import { performance } from 'node:perf_hooks';

import { resolveAssistantLocale } from '@/lib/assistant/locale';
import { ASSISTANT_SYSTEM_PROMPT } from '@/lib/assistant/prompt';
import { listCourseOptions } from '@/lib/assistant/tools/list-course-options';
import { searchPublicKB } from '@/lib/assistant/tools/search-public-kb';
import type {
  AssistantCourseFilters,
  AssistantIntent,
  AssistantMessage,
  AssistantPlanStep,
  AssistantQuickLink,
  AssistantResponsePayload,
  AssistantRuntimeLocale,
  AssistantToolCall,
  AssistantUiLocale,
  AssistantUserContext,
} from '@/lib/assistant/types';

const COURSE_LEVEL_REGEX = /\b(a1|a2|b1|b2|c1)\b/i;
const INTENT_KEYS: AssistantIntent[] = [
  'course_match',
  'placement',
  'exam_pathway',
  'accommodation',
  'visa',
  'registration',
  'contact',
  'career',
  'resource',
  'school',
  'smalltalk',
  'unknown',
];

const INTENT_HINTS: Record<
  Exclude<AssistantIntent, 'unknown'>,
  Record<AssistantRuntimeLocale, string[]>
> = {
  course_match: {
    en: ['course', 'courses', 'class', 'learn german', 'german level'],
    de: ['kurs', 'kurse', 'deutschkurs', 'lernen', 'sprachkurs'],
  },
  placement: {
    en: ['placement', 'level test', 'which level', 'a1', 'a2', 'b1', 'b2', 'c1'],
    de: ['einstufung', 'niveau', 'einstufungstest', 'welches niveau', 'a1', 'a2', 'b1', 'b2', 'c1'],
  },
  exam_pathway: {
    en: ['exam', 'telc', 'certificate', 'c1 hochschule', 'b2'],
    de: ['prüfung', 'prufung', 'telc', 'zertifikat', 'c1 hochschule', 'b2'],
  },
  accommodation: {
    en: ['accommodation', 'housing', 'host family', 'shared flat', 'room'],
    de: ['unterkunft', 'wohnen', 'gastfamilie', 'wg', 'zimmer'],
  },
  visa: {
    en: ['visa', 'embassy', 'residence permit', 'permit'],
    de: ['visum', 'botschaft', 'aufenthalt', 'aufenthaltstitel'],
  },
  registration: {
    en: ['register', 'registration', 'enroll', 'book seat', 'apply'],
    de: ['anmeldung', 'anmelden', 'einschreiben', 'platz buchen', 'bewerben'],
  },
  contact: {
    en: ['contact', 'call', 'phone', 'email', 'admissions', 'office', 'support', 'help', 'login', 'account'],
    de: ['kontakt', 'anrufen', 'telefon', 'email', 'admissions', 'büro', 'support', 'hilfe', 'login', 'konto'],
  },
  career: {
    en: ['career', 'job', 'vacancy', 'work at casa'],
    de: ['karriere', 'job', 'stelle', 'arbeiten bei casa'],
  },
  resource: {
    en: ['resource', 'news', 'study in germany', 'living in germany', 'why germany'],
    de: ['ressourcen', 'news', 'studieren in deutschland', 'leben in deutschland', 'warum deutschland'],
  },
  school: {
    en: ['school', 'casa', 'bremen', 'about', 'founded', 'since', 'history', 'class size', 'students', 'countries', 'location', 'address'],
    de: ['schule', 'casa', 'bremen', 'über uns', 'uber uns', 'geschichte', 'gründung', 'gründungsjahr', 'klassengröße', 'schüler', 'länder', 'standort', 'adresse'],
  },
  smalltalk: {
    en: ['hello', 'hi', 'thanks', 'thank you', 'how are you'],
    de: ['hallo', 'hi', 'danke', 'wie gehts', 'wie geht es dir'],
  },
};

const COURSE_DETAIL_HINTS = [
  'price',
  'cost',
  'duration',
  'schedule',
  'time',
  'day',
  'days',
  'lesson',
  'fees',
  'abend',
  'intensive',
  'evening',
  'morning',
  'weekend',
  'weekday',
  'preis',
  'kosten',
  'dauer',
  'zeitplan',
  'termine',
  'stunden',
  'intensiv',
  'wochenende',
  'a1',
  'a2',
  'b1',
  'b2',
  'c1',
];

const EXAM_DETAIL_HINTS = [
  'date',
  'dates',
  'deadline',
  'result',
  'certificate',
  'score',
  'kosten',
  'preis',
  'termin',
  'fristen',
  'zertifikat',
  'punkte',
  'telc',
];

const ACCOMMODATION_DETAIL_HINTS = [
  'cost',
  'price',
  'room',
  'shared',
  'flat',
  'host family',
  'wg',
  'zimmer',
  'gastfamilie',
  'kaution',
  'deposit',
];

const FOLLOW_UP_HINTS = [
  'and',
  'also',
  'then',
  'next',
  'more',
  'detail',
  'details',
  'that',
  'this',
  'it',
  'same',
  'what about',
  'how about',
  'und',
  'auch',
  'dann',
  'danach',
  'mehr',
  'weitere',
  'details',
  'das',
  'dies',
  'wie',
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function latestUserMessage(messages: AssistantMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';
}

function userCorpus(messages: AssistantMessage[]) {
  return messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join(' ');
}

function previousUserCorpus(messages: AssistantMessage[]) {
  const userMessages = messages.filter((message) => message.role === 'user');
  if (userMessages.length <= 1) {
    return '';
  }

  return userMessages
    .slice(0, -1)
    .map((message) => message.content)
    .join(' ');
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function hasExplicitIntentShift(text: string) {
  return includesAny(text, [
    'visa',
    'visum',
    'portal',
    'dashboard',
    'contact',
    'kontakt',
    'career',
    'karriere',
    'resource',
    'ressourcen',
    'accommodation',
    'unterkunft',
    'exam',
    'prüfung',
    'portal',
    'dashboard',
    'registration',
    'anmeldung',
    'course',
    'kurs',
  ]);
}

function isLikelyFollowUp(text: string) {
  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  if (tokenCount <= 4) {
    return true;
  }

  return tokenCount <= 8 && includesAny(text, FOLLOW_UP_HINTS);
}

function continuationIntent(input: {
  latestMessage: string;
  previousCorpus: string;
  locale: AssistantRuntimeLocale;
  userContext: AssistantUserContext;
}): AssistantIntent | null {
  if (!input.previousCorpus.trim()) {
    return null;
  }

  const normalizedLatest = normalizeText(input.latestMessage);
  if (!isLikelyFollowUp(normalizedLatest)) {
    return null;
  }

  if (hasExplicitIntentShift(normalizedLatest)) {
    return null;
  }

  const previousIntent = detectIntent({
    latestMessage: input.previousCorpus,
    corpus: input.previousCorpus,
    locale: input.locale,
    userContext: input.userContext,
  });

  if (previousIntent === 'unknown' || previousIntent === 'smalltalk') {
    return null;
  }

  if (previousIntent === 'course_match' && includesAny(normalizedLatest, COURSE_DETAIL_HINTS)) {
    return 'course_match';
  }

  if (previousIntent === 'exam_pathway' && includesAny(normalizedLatest, EXAM_DETAIL_HINTS)) {
    return 'exam_pathway';
  }

  if (previousIntent === 'accommodation' && includesAny(normalizedLatest, ACCOMMODATION_DETAIL_HINTS)) {
    return 'accommodation';
  }

  return previousIntent;
}

function countIntentMatches(text: string, locale: AssistantRuntimeLocale, intent: Exclude<AssistantIntent, 'unknown'>) {
  const primary = INTENT_HINTS[intent][locale];
  const secondary = INTENT_HINTS[intent][locale === 'de' ? 'en' : 'de'];
  return [...primary, ...secondary].reduce(
    (score, hint) => (text.includes(normalizeText(hint)) ? score + 1 : score),
    0
  );
}

function extractCourseFilters(text: string): AssistantCourseFilters {
  const normalized = normalizeText(text);
  const filters: AssistantCourseFilters = {};

  const levelMatch = normalized.match(COURSE_LEVEL_REGEX);
  if (levelMatch) {
    filters.level = levelMatch[1].toUpperCase() as NonNullable<AssistantCourseFilters['level']>;
  }

  if (includesAny(normalized, ['intensive', 'intensiv', 'weekday', 'morning', 'vormittag'])) {
    filters.schedule = 'intensive';
  } else if (includesAny(normalized, ['evening', 'abend', 'after work', 'part time', 'teilzeit'])) {
    filters.schedule = 'evening';
  } else if (includesAny(normalized, ['flexible', 'flexibel'])) {
    filters.schedule = 'flexible';
  }

  if (includesAny(normalized, ['telc', 'exam', 'prüfung', 'zertifikat', 'certificate'])) {
    filters.goal = 'exam';
  } else if (includesAny(normalized, ['medical', 'doctor', 'medizin'])) {
    filters.goal = 'medical';
  } else if (includesAny(normalized, ['career', 'business', 'professional', 'beruf'])) {
    filters.goal = 'career';
  } else if (includesAny(normalized, ['general', 'alltag', 'daily'])) {
    filters.goal = 'general';
  }

  return filters;
}

function uniqueLinks(links: AssistantQuickLink[]) {
  return Array.from(new Map(links.filter((link) => Boolean(link.href)).map((link) => [link.href, link])).values());
}

function plan(locale: AssistantRuntimeLocale, en: string[], de: string[]): AssistantPlanStep[] {
  const source = locale === 'de' ? de : en;
  return source.map((label, index) => ({
    id: `plan-${index + 1}`,
    label,
  }));
}

function wittyLead(locale: AssistantRuntimeLocale, intent: AssistantIntent) {
  if (locale === 'de') {
    const deCopy: Record<AssistantIntent, string> = {
      course_match: 'Gern helfe ich dir, den passenden Kurs zu finden.',
      placement: 'Gern helfe ich dir, dein Niveau herauszufinden.',
      exam_pathway: 'Gern erkläre ich dir unsere Prüfungen.',
      accommodation: 'Gern helfe ich dir bei der Unterkunft.',
      visa: 'Das ist eine wichtige Frage.',
      registration: 'Gern zeige ich dir, wie die Anmeldung funktioniert.',
      contact: 'Da hilft dir unser Team am besten weiter.',
      career: 'Schön, dass du dich für die Arbeit bei CASA interessierst.',
      resource: 'Gern zeige ich dir passende Seiten von CASA.',
      school: 'Gern erzähle ich dir mehr über CASA.',
      smalltalk: 'Sehr gern.',
      unknown: 'Gern helfe ich dir weiter.',
    };
    return deCopy[intent];
  }

  const enCopy: Record<AssistantIntent, string> = {
    course_match: 'I’d be glad to help you find the right course.',
    placement: 'I’d be glad to help you find out your level.',
    exam_pathway: 'I’m happy to explain our exams.',
    accommodation: 'I’m happy to help you with accommodation.',
    visa: 'That’s an important question.',
    registration: 'I’m happy to show you how registration works.',
    contact: 'Our team is best placed to help you with that.',
    career: 'We’re glad you’re interested in working at CASA.',
    resource: 'I’m happy to show you some useful pages from CASA.',
    school: 'I’m happy to tell you more about CASA.',
    smalltalk: 'Happy to help.',
    unknown: 'I’m happy to help.',
  };
  return enCopy[intent];
}

function intentFromTopic(topic: string | undefined): AssistantIntent {
  if (!topic) return 'unknown';
  if (topic === 'courses') return 'course_match';
  if (topic === 'placement') return 'placement';
  if (topic === 'exams') return 'exam_pathway';
  if (topic === 'accommodation') return 'accommodation';
  if (topic === 'visa') return 'visa';
  if (topic === 'registration') return 'registration';
  if (topic === 'portal') return 'contact';
  if (topic === 'careers') return 'career';
  if (topic === 'resources') return 'resource';
  if (topic === 'contact') return 'contact';
  if (topic === 'school') return 'school';
  return 'unknown';
}

function detectIntent(input: {
  latestMessage: string;
  corpus: string;
  locale: AssistantRuntimeLocale;
  userContext: AssistantUserContext;
  kbTopic?: string;
}): AssistantIntent {
  const normalized = normalizeText(`${input.latestMessage} ${input.corpus}`);
  const scores: Record<AssistantIntent, number> = Object.fromEntries(
    INTENT_KEYS.map((intent) => [intent, 0])
  ) as Record<AssistantIntent, number>;

  (
    [
      'course_match',
      'placement',
      'exam_pathway',
      'accommodation',
      'visa',
      'registration',
      'contact',
      'career',
      'resource',
      'smalltalk',
    ] as const
  ).forEach((intent) => {
    scores[intent] = countIntentMatches(normalized, input.locale, intent);
  });

  if (includesAny(normalized, ['visa', 'visum', 'aufenthalt', 'residence permit'])) {
    scores.visa += 2.8;
  }
  if (includesAny(normalized, ['telc', 'prüfung', 'exam'])) {
    scores.exam_pathway += 2;
  }
  if (includesAny(normalized, ['unterkunft', 'accommodation', 'host family', 'gastfamilie', 'wg'])) {
    scores.accommodation += 2;
  }
  if (includesAny(normalized, ['kurs', 'course', 'deutschkurs', 'class'])) {
    scores.course_match += 1.6;
  }
  if (includesAny(normalized, ['einstufung', 'placement', 'level'])) {
    scores.placement += 1.8;
  }

  if (includesAny(normalized, ['portal', 'dashboard', 'konto', 'account', 'login'])) {
    scores.contact += 3;
  }

  const kbIntent = intentFromTopic(input.kbTopic);
  if (kbIntent !== 'unknown') {
    scores[kbIntent] += 1.2;
  }

  const sorted = [...INTENT_KEYS]
    .filter((intent) => intent !== 'unknown')
    .sort((a, b) => scores[b] - scores[a]);

  const winner = sorted[0];
  if (!winner || scores[winner] < 1.2) {
    return 'unknown';
  }

  return winner;
}

function safetyRefusal(locale: AssistantRuntimeLocale): Pick<AssistantResponsePayload, 'message' | 'cta' | 'intent' | 'planSteps' | 'quickLinks'> {
  if (locale === 'de') {
    return {
      intent: 'contact',
      message:
        'Sensible Dokumente wie Passkopien oder medizinische Unterlagen kann ich im Chat nicht bearbeiten. Bitte wende dich dafür direkt an unser Team.',
      cta: { label: 'Zum Kontaktformular', href: '/contact' },
      quickLinks: [
        { label: 'Kontakt', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
      ],
      planSteps: plan(locale, [], [
        'Öffne das Kontaktformular.',
        'Beschreib kurz dein Anliegen.',
        'Unser Team meldet sich bei dir.',
      ]),
    };
  }

  return {
    intent: 'contact',
    message:
      'I can’t handle sensitive documents such as passport copies or medical records in the chat. Please contact our team directly about them.',
    cta: { label: 'Go to the contact form', href: '/contact' },
    quickLinks: [
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
    ],
    planSteps: plan(locale, [
      'Open the contact form.',
      'Briefly describe what you need.',
      'Our team will get back to you.',
    ], []),
  };
}

/*
 * No duration or weekly minimum in the chat, and no course called
 * visa-suitable: that is not verified per course
 * (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md, "The visa eligibility problem"), and
 * the embassy, not CASA, sets the requirement. CASA's own wording lives in the
 * FAQ, so the answer points there and to the advice team.
 */
function visaResponse(locale: AssistantRuntimeLocale): Pick<AssistantResponsePayload, 'message' | 'cta' | 'intent' | 'planSteps' | 'quickLinks'> {
  if (locale === 'de') {
    return {
      intent: 'visa',
      message:
        'Das ist eine wichtige Frage. Wie lange ein Kurs für ein Sprachvisum dauern muss und wie viele Unterrichtseinheiten pro Woche nötig sind, legt die zuständige deutsche Auslandsvertretung fest. Was CASA dazu sagt, findest du in unseren FAQ, und unser Beratungsteam sagt dir, welcher Kurs zu deinem Fall passt.\n\nDas ist keine verbindliche Rechtsberatung. Bitte lass deinen Fall zusätzlich vom CASA-Team und von der zuständigen Botschaft prüfen.',
      cta: { label: 'Beratung zum Visum anfragen', href: '/contact?topic=Course advice' },
      quickLinks: [
        { label: 'FAQ', href: '/faq' },
        { label: 'Kontakt', href: '/contact?topic=Course advice' },
      ],
      planSteps: plan(locale, [], [
        'Kläre mit unserem Team, welcher Kurs zu dir passt.',
        'Melde dich an und warte auf deine Kursbestätigung.',
        'Stimm deine Unterlagen mit der Botschaft und mit uns ab.',
      ]),
    };
  }

  return {
    intent: 'visa',
    message:
      'That’s an important question. How long a course must last for a language visa, and how many lessons a week it needs, is decided by the German embassy or consulate responsible for you. You’ll find what CASA says about it in our FAQ, and our advice team can tell you which course suits your situation.\n\nThis is not binding legal advice. Please also have your case checked by the CASA team and by the embassy.',
    cta: { label: 'Ask for advice about your visa', href: '/contact?topic=Course advice' },
    quickLinks: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact?topic=Course advice' },
    ],
    planSteps: plan(locale, [
      'Check with our team which course suits you.',
      'Register and wait for your course confirmation.',
      'Go through your documents with the embassy and with us.',
    ], []),
  };
}

function examResponse(locale: AssistantRuntimeLocale, latestMessage: string) {
  const normalized = normalizeText(latestMessage);
  const targetHref = normalized.includes('c1')
      ? '/exams/c1'
      : normalized.includes('b2')
        ? '/exams/b2'
        : '/exams';

  if (locale === 'de') {
    return {
      intent: 'exam_pathway' as const,
      message:
        `${wittyLead(locale, 'exam_pathway')} Bei CASA kannst du telc Deutsch B2 und telc Deutsch C1 Hochschule ablegen, und für beide bieten wir eigene Vorbereitungskurse an.`,
      cta: { label: 'Zur Prüfungsseite', href: targetHref },
      quickLinks: uniqueLinks([
        { label: 'Prüfungen', href: '/exams' },
        { label: 'Prüfungsanmeldung', href: '/registration/exam' },
        { label: 'Prüfungsberatung', href: '/contact' },
      ]),
      planSteps: plan(locale, [], [
        'Entscheide dich für telc Deutsch B2 oder C1 Hochschule.',
        'Sieh dir Termin und Anmeldeschluss an.',
        'Melde dich online zur Prüfung an.',
      ]),
      basedOn: ['/exams', '/registration/exam'],
    };
  }

  return {
    intent: 'exam_pathway' as const,
    message:
      `${wittyLead(locale, 'exam_pathway')} At CASA you can take telc Deutsch B2 and telc Deutsch C1 Hochschule, and we run our own preparation courses for both.`,
    cta: { label: 'Go to the exam page', href: targetHref },
    quickLinks: uniqueLinks([
      { label: 'Exams', href: '/exams' },
      { label: 'Exam registration', href: '/registration/exam' },
      { label: 'Exam advice', href: '/contact' },
    ]),
    planSteps: plan(locale, [
      'Choose telc Deutsch B2 or telc Deutsch C1 Hochschule.',
      'Check the date and the registration deadline.',
      'Register for the exam online.',
    ], []),
    basedOn: ['/exams', '/registration/exam'],
  };
}

function accommodationResponse(locale: AssistantRuntimeLocale) {
  if (locale === 'de') {
    return {
      intent: 'accommodation' as const,
      message:
        `${wittyLead(locale, 'accommodation')} Ich zeige dir, wie sich WG und Gastfamilie unterscheiden und wo du eine Unterkunft anfragen kannst.`,
      cta: { label: 'Unterkunft vergleichen', href: '/accommodation' },
      quickLinks: uniqueLinks([
        { label: 'Unterkunft', href: '/accommodation' },
        { label: 'Unterkunftsanfrage', href: '/contact?topic=accommodation' },
      ]),
      planSteps: plan(locale, [], [
        'Vergleiche WG und Gastfamilie.',
        'Notiere deine Wünsche, zum Beispiel Allergien oder Ruhezeiten.',
        'Schick uns deine Anfrage.',
      ]),
      basedOn: ['/accommodation', '/contact?topic=accommodation'],
    };
  }

  return {
    intent: 'accommodation' as const,
    message:
      `${wittyLead(locale, 'accommodation')} I’ll show you how a shared flat and a host family differ, and where you can ask for accommodation.`,
    cta: { label: 'Compare accommodation', href: '/accommodation' },
    quickLinks: uniqueLinks([
      { label: 'Accommodation', href: '/accommodation' },
      { label: 'Accommodation request', href: '/contact?topic=accommodation' },
    ]),
    planSteps: plan(locale, [
      'Compare a shared flat and a host family.',
      'Note down what matters to you, for example allergies or quiet hours.',
      'Send us your request.',
    ], []),
    basedOn: ['/accommodation', '/contact?topic=accommodation'],
  };
}

function registrationResponse(locale: AssistantRuntimeLocale, latestMessage: string) {
  const normalized = normalizeText(latestMessage);
  const examMode = includesAny(normalized, ['exam', 'prüfung', 'telc']);
  const href = examMode ? '/registration/exam' : '/registration/course';

  if (locale === 'de') {
    return {
      intent: 'registration' as const,
      message:
        `${wittyLead(locale, 'registration')} Ich bringe dich direkt zur ${
          examMode ? 'Prüfungs' : 'Kurs'
        }anmeldung. Dort meldest du dich in drei Schritten online an.`,
      cta: {
        label: examMode ? 'Zur Prüfungsanmeldung' : 'Zur Kursanmeldung',
        href,
      },
      quickLinks: uniqueLinks([
        { label: 'Kursanmeldung', href: '/registration/course' },
        { label: 'Prüfungsanmeldung', href: '/registration/exam' },
        { label: 'Kontakt', href: '/contact' },
      ]),
      planSteps: plan(locale, [], [
        'Wähle deinen Kurs oder deine Prüfung.',
        'Füll das Formular vollständig aus.',
        'Lies unsere Bestätigung und achte auf die nächste Frist.',
      ]),
      basedOn: [href],
    };
  }

  return {
    intent: 'registration' as const,
    message:
      `${wittyLead(locale, 'registration')} I’ll take you straight to the ${
        examMode ? 'exam' : 'course'
      } registration form, which has three steps.`,
    cta: {
      label: examMode ? 'Go to exam registration' : 'Go to course registration',
      href,
    },
    quickLinks: uniqueLinks([
      { label: 'Course registration', href: '/registration/course' },
      { label: 'Exam registration', href: '/registration/exam' },
      { label: 'Contact', href: '/contact' },
    ]),
    planSteps: plan(locale, [
      'Choose your course or exam.',
      'Fill in the form completely.',
      'Read our confirmation and look out for the next deadline.',
    ], []),
    basedOn: [href],
  };
}

function contactResponse(locale: AssistantRuntimeLocale, latestMessage: string) {
  const normalized = normalizeText(latestMessage);
  const isAccountSupportRequest = includesAny(normalized, ['portal', 'dashboard', 'konto', 'account', 'login']);

  if (isAccountSupportRequest) {
    if (locale === 'de') {
      return {
        intent: 'contact' as const,
        message:
          `${wittyLead(locale, 'contact')} Auf unserer öffentlichen Website gibt es im Moment keinen Login-Bereich für Lernende oder das Team. Bei Fragen zu einem Konto oder Login schreib uns bitte über das Kontaktformular.`,
        cta: { label: 'Zum Kontaktformular', href: '/contact' },
        quickLinks: uniqueLinks([
          { label: 'Kontaktformular', href: '/contact' },
          { label: 'FAQ', href: '/faq' },
        ]),
        planSteps: plan(locale, [], [
          'Beschreib kurz dein Anliegen.',
          'Schick das Kontaktformular ab.',
          'Unser Team meldet sich bei dir.',
        ]),
        basedOn: ['/contact', '/faq'],
      };
    }

    return {
      intent: 'contact' as const,
      message:
        `${wittyLead(locale, 'contact')} Our public website has no login area for learners or staff at the moment. If you have a question about an account or a login, please write to us using the contact form.`,
      cta: { label: 'Go to the contact form', href: '/contact' },
      quickLinks: uniqueLinks([
        { label: 'Contact form', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
      ]),
      planSteps: plan(locale, [
        'Briefly describe what you need.',
        'Send the contact form.',
        'Our team will get back to you.',
      ], []),
      basedOn: ['/contact', '/faq'],
    };
  }

  if (locale === 'de') {
    return {
      intent: 'contact' as const,
      message:
        `${wittyLead(locale, 'contact')} Ich bringe dich gern zum Kontaktformular, ob du eine Beratung möchtest oder eine Frage zur Unterkunft hast.`,
      cta: { label: 'Zum Kontaktformular', href: '/contact' },
      quickLinks: uniqueLinks([
        { label: 'Kontaktformular', href: '/contact' },
        { label: 'Unterkunftsanfrage', href: '/contact?topic=accommodation' },
      ]),
      planSteps: plan(locale, [], [
        'Nenne kurz dein Thema.',
        'Füll das Kontaktformular aus.',
        'Wir melden uns bei dir.',
      ]),
      basedOn: ['/contact'],
    };
  }

  return {
    intent: 'contact' as const,
    message:
      `${wittyLead(locale, 'contact')} I’ll gladly take you to the contact form, whether you’d like advice or have a question about accommodation.`,
    cta: { label: 'Go to the contact form', href: '/contact' },
    quickLinks: uniqueLinks([
      { label: 'Contact form', href: '/contact' },
      { label: 'Accommodation request', href: '/contact?topic=accommodation' },
    ]),
    planSteps: plan(locale, [
      'Tell us briefly what it’s about.',
      'Fill in the contact form.',
      'We’ll get back to you.',
    ], []),
      basedOn: ['/contact'],
  };
}

function careerResponse(locale: AssistantRuntimeLocale) {
  return {
    intent: 'career' as const,
    message:
      locale === 'de'
        ? `${wittyLead(locale, 'career')} Auf unserer Karriereseite findest du offene Stellen im Unterricht, in der Verwaltung und in der Betreuung.`
        : `${wittyLead(locale, 'career')} On our careers page you’ll find open positions in teaching, administration and student support.`,
    cta: {
      label: locale === 'de' ? 'Zur Karriereseite' : 'Go to the careers page',
      href: '/careers',
    },
    quickLinks: [{ label: locale === 'de' ? 'Karriere' : 'Careers', href: '/careers' }],
    planSteps: plan(locale, [
      'Open our careers page.',
      'Read what the position asks for.',
      'Send us your application.',
    ], [
      'Öffne unsere Karriereseite.',
      'Lies, was die Stelle verlangt.',
      'Schick uns deine Bewerbung.',
    ]),
    basedOn: ['/careers'],
  };
}

function resourceResponse(locale: AssistantRuntimeLocale) {
  if (locale === 'de') {
    return {
      intent: 'resource' as const,
      message:
        `${wittyLead(locale, 'resource')} Einen guten Überblick geben dir unsere Seite „Aktuelles“ und der Ratgeber „Studium & Leben in Deutschland“.`,
      cta: { label: 'Zu Aktuelles', href: '/news' },
      quickLinks: uniqueLinks([
        { label: 'Aktuelles', href: '/news' },
        { label: 'Studium & Leben in Deutschland', href: '/resources/study-in-germany' },
      ]),
      planSteps: plan(locale, [], [
        'Wähle das Thema, das dich interessiert.',
        'Lies die passenden Artikel.',
        'Überleg dir deinen nächsten Schritt.',
      ]),
      basedOn: ['/news', '/resources/study-in-germany'],
    };
  }

  return {
    intent: 'resource' as const,
    message:
      `${wittyLead(locale, 'resource')} Our News page and the guide “Study & life in Germany” give you a good overview.`,
    cta: { label: 'Go to News', href: '/news' },
    quickLinks: uniqueLinks([
      { label: 'News', href: '/news' },
      { label: 'Study & life in Germany', href: '/resources/study-in-germany' },
    ]),
    planSteps: plan(locale, [
      'Choose the topic that interests you.',
      'Read the articles that fit.',
      'Think about your next step.',
    ], []),
    basedOn: ['/news', '/resources/study-in-germany'],
  };
}

function smalltalkResponse(locale: AssistantRuntimeLocale) {
  if (locale === 'de') {
    return {
      intent: 'smalltalk' as const,
      message:
        'Hallo, ich bin CLARA und helfe dir, dich auf der Website von CASA zurechtzufinden. Ich zeige dir gern den Weg zu Kursen, Prüfungen, Unterkunft oder Anmeldung.',
      cta: { label: 'Zu den Kursen', href: '/courses' },
      quickLinks: uniqueLinks([
        { label: 'Kurse', href: '/courses' },
        { label: 'Prüfungen', href: '/exams' },
        { label: 'Unterkunft', href: '/accommodation' },
      ]),
      planSteps: plan(locale, [], [
        'Sag mir, ob es um einen Kurs, eine Prüfung, die Unterkunft oder die Anmeldung geht.',
        'Ich zeige dir den nächsten Schritt.',
      ]),
      basedOn: ['/courses', '/exams', '/accommodation'],
    };
  }

  return {
    intent: 'smalltalk' as const,
    message:
      'Hello, I’m CLARA, and I help you find your way around the CASA website. I’m happy to show you the way to courses, exams, accommodation or registration.',
    cta: { label: 'Go to the courses', href: '/courses' },
    quickLinks: uniqueLinks([
      { label: 'Courses', href: '/courses' },
      { label: 'Exams', href: '/exams' },
      { label: 'Accommodation', href: '/accommodation' },
    ]),
    planSteps: plan(locale, [
      'Tell me whether it’s about a course, an exam, accommodation or registration.',
      'I’ll show you the next step.',
    ], []),
    basedOn: ['/courses', '/exams', '/accommodation'],
  };
}

function trimSummary(content: string, max = 220) {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) {
    return compact;
  }

  const sliced = compact.slice(0, max);
  const sentenceCut = sliced.lastIndexOf('.');
  if (sentenceCut > 120) {
    return sliced.slice(0, sentenceCut + 1);
  }

  return `${sliced.trimEnd()}...`;
}

function kbFallbackResponse(
  locale: AssistantRuntimeLocale,
  kb: ReturnType<typeof searchPublicKB>
) {
  const lead = kb.passages[0];
  const second = kb.passages[1];
  const leadSummary = lead ? trimSummary(lead.content, 210) : '';
  const secondSummary = second ? trimSummary(second.content, 140) : '';

  if (lead) {
    if (locale === 'de') {
      return {
        intent: intentFromTopic(lead.topic) as AssistantIntent,
        message: `${wittyLead(locale, intentFromTopic(lead.topic))} Auf unserer Website steht dazu: ${leadSummary}${
          secondSummary ? `\n\nAußerdem steht dort: ${secondSummary}` : ''
        }`,
        cta: {
          label: 'Zur passenden Seite',
          href: lead.url,
        },
        quickLinks: uniqueLinks(
          kb.routeSuggestions.length > 0
            ? kb.routeSuggestions
            : [{ label: 'Kontakt', href: '/contact' }]
        ),
        planSteps: plan(locale, [], [
          'Öffne die passende Seite.',
          'Lies dort die wichtigsten Informationen.',
          'Wenn du noch Fragen hast, schreib uns.',
        ]),
        basedOn: kb.passages.map((passage) => passage.url),
      };
    }

    return {
      intent: intentFromTopic(lead.topic) as AssistantIntent,
      message: `${wittyLead(locale, intentFromTopic(lead.topic))} This is what our website says about it: ${leadSummary}${
        secondSummary ? `\n\nIt also says: ${secondSummary}` : ''
      }`,
      cta: {
        label: 'Go to the right page',
        href: lead.url,
      },
      quickLinks: uniqueLinks(
        kb.routeSuggestions.length > 0
          ? kb.routeSuggestions
          : [{ label: 'Contact', href: '/contact' }]
      ),
      planSteps: plan(locale, [
        'Open the page that fits.',
        'Read the most important information there.',
        'If you still have questions, write to us.',
      ], []),
      basedOn: kb.passages.map((passage) => passage.url),
    };
  }

  if (locale === 'de') {
    return {
      intent: 'unknown' as const,
      message:
        'Ich helfe dir bei der Kurswahl, bei Prüfungen, bei der Unterkunft, bei der Anmeldung und bei anderen Fragen rund um CASA. Schreib mir in einem Satz, was du vorhast, dann zeige ich dir den nächsten Schritt.',
      cta: { label: 'Kurse ansehen', href: '/courses' },
      quickLinks: uniqueLinks([
        { label: 'Kurse', href: '/courses' },
        { label: 'Prüfungen', href: '/exams' },
        { label: 'Kontakt', href: '/contact' },
      ]),
      planSteps: plan(locale, [], ['Schreib mir, was du vorhast.', 'Öffne die Seite, die ich dir zeige.']),
      basedOn: ['/courses'],
    };
  }

  return {
    intent: 'unknown' as const,
    message:
      'I can help you choose a course and answer questions about exams, accommodation, registration and anything else to do with CASA. Tell me in one sentence what you’re planning, and I’ll show you the next step.',
    cta: { label: 'Browse courses', href: '/courses' },
    quickLinks: uniqueLinks([
      { label: 'Courses', href: '/courses' },
      { label: 'Exams', href: '/exams' },
      { label: 'Contact', href: '/contact' },
    ]),
    planSteps: plan(locale, ['Tell me what you’re planning.', 'Open the page I show you.'], []),
    basedOn: ['/courses'],
  };
}

type RunAssistantTurnInput = {
  messages: AssistantMessage[];
  locale?: AssistantUiLocale | null;
  userContext: AssistantUserContext;
};

export async function runAssistantTurn({
  messages,
  locale,
  userContext,
}: RunAssistantTurnInput): Promise<AssistantResponsePayload> {
  const toolCalls: AssistantToolCall[] = [];
  const runtimeLocale = resolveAssistantLocale(locale, messages);
  const latestMessageRaw = latestUserMessage(messages);
  const latestMessage = normalizeText(latestMessageRaw);
  const corpus = normalizeText(userCorpus(messages));
  const previousCorpusRaw = previousUserCorpus(messages);

  const kbStart = performance.now();
  const kb = searchPublicKB(`${latestMessageRaw} ${corpus}`, runtimeLocale, 4);
  toolCalls.push({
    name: 'searchPublicKB',
    durationMs: Math.round(performance.now() - kbStart),
    ok: true,
  });

  const sensitiveDocQuestion = includesAny(latestMessage, [
    'passport',
    'scan',
    'upload id',
    'visa document',
    'reisepass',
    'passkopie',
    'dokument hochladen',
    'medical record',
    'medical file',
  ]);

  if (sensitiveDocQuestion) {
    const safe = safetyRefusal(runtimeLocale);
    return {
      locale: runtimeLocale,
      intent: safe.intent,
      message: safe.message,
      cta: safe.cta,
      quickLinks: safe.quickLinks,
      planSteps: safe.planSteps,
      toolCalls,
      basedOn: ['/contact'],
    };
  }

  const intent = detectIntent({
    latestMessage: latestMessageRaw,
    corpus,
    locale: runtimeLocale,
    userContext,
    kbTopic: kb.passages[0]?.topic,
  });
  const continuedIntent = continuationIntent({
    latestMessage: latestMessageRaw,
    previousCorpus: previousCorpusRaw,
    locale: runtimeLocale,
    userContext,
  });
  const resolvedIntent = continuedIntent ?? intent;

  if (resolvedIntent === 'visa') {
    const visa = visaResponse(runtimeLocale);
    return {
      locale: runtimeLocale,
      intent: visa.intent,
      message: visa.message,
      cta: visa.cta,
      quickLinks: visa.quickLinks,
      planSteps: visa.planSteps,
      toolCalls,
      basedOn: ['/courses', '/contact?topic=Course advice'],
    };
  }

  if (resolvedIntent === 'exam_pathway') {
    const exam = examResponse(runtimeLocale, latestMessageRaw);
    return {
      locale: runtimeLocale,
      intent: exam.intent,
      message: exam.message,
      cta: exam.cta,
      quickLinks: exam.quickLinks,
      planSteps: exam.planSteps,
      toolCalls,
      basedOn: exam.basedOn,
    };
  }

  if (resolvedIntent === 'accommodation') {
    const accommodation = accommodationResponse(runtimeLocale);
    return {
      locale: runtimeLocale,
      intent: accommodation.intent,
      message: accommodation.message,
      cta: accommodation.cta,
      quickLinks: accommodation.quickLinks,
      planSteps: accommodation.planSteps,
      toolCalls,
      basedOn: accommodation.basedOn,
    };
  }

  if (resolvedIntent === 'registration') {
    const registration = registrationResponse(runtimeLocale, latestMessageRaw);
    return {
      locale: runtimeLocale,
      intent: registration.intent,
      message: registration.message,
      cta: registration.cta,
      quickLinks: registration.quickLinks,
      planSteps: registration.planSteps,
      toolCalls,
      basedOn: registration.basedOn,
    };
  }

  if (resolvedIntent === 'career') {
    const career = careerResponse(runtimeLocale);
    return {
      locale: runtimeLocale,
      intent: career.intent,
      message: career.message,
      cta: career.cta,
      quickLinks: career.quickLinks,
      planSteps: career.planSteps,
      toolCalls,
      basedOn: career.basedOn,
    };
  }

  if (resolvedIntent === 'resource') {
    const resource = resourceResponse(runtimeLocale);
    return {
      locale: runtimeLocale,
      intent: resource.intent,
      message: resource.message,
      cta: resource.cta,
      quickLinks: resource.quickLinks,
      planSteps: resource.planSteps,
      toolCalls,
      basedOn: resource.basedOn,
    };
  }

  if (resolvedIntent === 'contact') {
    const contact = contactResponse(runtimeLocale, latestMessageRaw);
    return {
      locale: runtimeLocale,
      intent: contact.intent,
      message: contact.message,
      cta: contact.cta,
      quickLinks: contact.quickLinks,
      planSteps: contact.planSteps,
      toolCalls,
      basedOn: contact.basedOn,
    };
  }

  if (resolvedIntent === 'smalltalk') {
    const smalltalk = smalltalkResponse(runtimeLocale);
    return {
      locale: runtimeLocale,
      intent: smalltalk.intent,
      message: smalltalk.message,
      cta: smalltalk.cta,
      quickLinks: smalltalk.quickLinks,
      planSteps: smalltalk.planSteps,
      toolCalls,
      basedOn: smalltalk.basedOn,
    };
  }

  const courseSignals = includesAny(`${latestMessage} ${corpus}`, [
    'course',
    'kurs',
    'placement',
    'einstufung',
    'level',
    'class',
  ]);

  if (resolvedIntent === 'course_match' || resolvedIntent === 'placement' || courseSignals) {
    const filters = extractCourseFilters(`${latestMessageRaw} ${corpus}`);
    const missingLevel = !filters.level;
    const missingSchedule = !filters.schedule;

    if (missingLevel) {
      return {
        locale: runtimeLocale,
        intent: 'placement',
        message:
          runtimeLocale === 'de'
            ? `${wittyLead(runtimeLocale, 'placement')} Damit ich dir einen passenden Kurs empfehlen kann, brauche ich zuerst dein aktuelles Niveau, also A1, A2, B1, B2 oder C1. Wenn du es nicht kennst, mach einfach einen der kostenlosen Einstufungstests.`
            : `${wittyLead(runtimeLocale, 'placement')} To recommend a course that suits you, I first need to know your current level (A1, A2, B1, B2 or C1). If you don’t know it, simply take one of the free placement tests.`,
        cta: {
          label: runtimeLocale === 'de' ? 'Zum Einstufungstest' : 'Go to the placement test',
          href: '/placement-test',
        },
        quickLinks: uniqueLinks([
          {
            label: runtimeLocale === 'de' ? 'Einstufungstest' : 'Placement test',
            href: '/placement-test',
          },
          {
            label: runtimeLocale === 'de' ? 'Kurse' : 'Courses',
            href: '/courses',
          },
        ]),
        planSteps: plan(runtimeLocale, [
          'Find out your level.',
          'Choose the course format that fits your daily life.',
          'Register online.',
        ], [
          'Finde dein Niveau heraus.',
          'Wähle das Kursformat, das zu deinem Alltag passt.',
          'Melde dich online an.',
        ]),
        toolCalls,
        basedOn: ['/placement-test', '/courses'],
      };
    }

    if (missingSchedule) {
      return {
        locale: runtimeLocale,
        intent: 'course_match',
        message:
          runtimeLocale === 'de'
            ? `${wittyLead(runtimeLocale, 'course_match')} Möchtest du lieber im Intensivkurs unter der Woche lernen oder abends neben Arbeit oder Studium?`
            : `${wittyLead(runtimeLocale, 'course_match')} Would you rather learn on an intensive course during the week, or in the evenings alongside work or study?`,
        cta: {
          label: runtimeLocale === 'de' ? 'Zu den Kursen' : 'Go to the courses',
          href: '/courses',
        },
        quickLinks: uniqueLinks([
          {
            label: runtimeLocale === 'de' ? 'Intensivkurse' : 'Intensive courses',
            href: '/courses/intensive-german',
          },
          {
            label: runtimeLocale === 'de' ? 'Abendkurse' : 'Evening courses',
            href: '/courses/evening-course',
          },
        ]),
        planSteps: plan(runtimeLocale, [
          'Choose between the intensive course and the evening course.',
          'Look at the dates that suit you.',
          'Register for your course.',
        ], [
          'Entscheide dich für den Intensivkurs oder den Abendkurs.',
          'Sieh dir die passenden Termine an.',
          'Melde dich für deinen Kurs an.',
        ]),
        toolCalls,
        basedOn: ['/courses'],
      };
    }

    const toolStart = performance.now();
    const cards = await listCourseOptions(filters, runtimeLocale, 4);
    toolCalls.push({
      name: 'listCourseOptions',
      durationMs: Math.round(performance.now() - toolStart),
      ok: true,
    });

    if (cards.length === 0) {
      const fallback = kbFallbackResponse(runtimeLocale, kb);
      return {
        locale: runtimeLocale,
        intent: fallback.intent,
        message: fallback.message,
        cta: fallback.cta,
        cards: [],
        quickLinks: fallback.quickLinks,
        planSteps: fallback.planSteps,
        toolCalls,
        basedOn: fallback.basedOn,
      };
    }

    return {
      locale: runtimeLocale,
      intent: 'course_match',
      message:
        runtimeLocale === 'de'
          ? `${wittyLead(runtimeLocale, 'course_match')} Diese Kurse passen zu deinen Angaben. Ich habe sie so sortiert, dass der passendste oben steht.`
          : `${wittyLead(runtimeLocale, 'course_match')} These courses match what you’ve told me. I’ve sorted them so that the best match is at the top.`,
      cta: {
        label: runtimeLocale === 'de' ? 'Zur Kursanmeldung' : 'Go to course registration',
        href: '/registration/course',
      },
      cards,
      quickLinks: uniqueLinks([
        { label: runtimeLocale === 'de' ? 'Kursanmeldung' : 'Course registration', href: '/registration/course' },
        { label: runtimeLocale === 'de' ? 'Alle Kurse' : 'All courses', href: '/courses' },
        { label: runtimeLocale === 'de' ? 'Beratung' : 'Advice', href: '/contact?topic=Course advice' },
      ]),
      planSteps: plan(runtimeLocale, [
        'Choose a course.',
        'Pick a start date.',
        'Send your registration.',
      ], [
        'Wähle einen Kurs aus.',
        'Such dir einen Starttermin aus.',
        'Schick deine Anmeldung ab.',
      ]),
      toolCalls,
      basedOn: cards.map((card) => card.href),
    };
  }

  const fallback = kbFallbackResponse(runtimeLocale, kb);
  return {
    locale: runtimeLocale,
    intent: fallback.intent,
    message: `${fallback.message}\n\n${
      runtimeLocale === 'de'
        ? 'Dabei halte ich mich an den Sicherheitsleitfaden für CLARA.'
        : 'I keep to the safety guidelines for CLARA when I answer.'
    }`,
    cta: fallback.cta,
    quickLinks: fallback.quickLinks,
    planSteps: fallback.planSteps,
    toolCalls,
    basedOn: fallback.basedOn,
  };
}

export function getAssistantSystemPrompt() {
  return ASSISTANT_SYSTEM_PROMPT;
}

export const assistantToolSkeleton = {
  searchPublicKB: 'implemented',
  listCourseOptions: 'implemented',
  listExamSessions: 'skeleton-ready',
  getUserDashboardSummary: 'skeleton-ready',
  createRegistrationDraft: 'skeleton-ready',
  createAgencyLead: 'skeleton-ready',
  modelApiBridge: 'skeleton-ready',
} as const;
