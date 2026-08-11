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
      course_match: 'Starkes Ziel.',
      placement: 'Guter Startpunkt.',
      exam_pathway: 'Klar, das bekommen wir strukturiert hin.',
      accommodation: 'Gute Frage für einen ruhigen Start in Bremen.',
      visa: 'Wichtiger Punkt.',
      registration: 'Perfekt, dann gehen wir direkt in den Prozess.',
      contact: 'Direkter Kontakt ist hier sinnvoll.',
      career: 'Spannend - hier ist der schnellste Einstieg.',
      resource: 'Gerne, hier sind die besten CASA-Quellen.',
      school: 'Geschichte und Struktur von CASA zu kennen, ist immer gut.',
      smalltalk: 'Sehr gerne.',
      unknown: 'Ich helfe Ihnen gerne weiter.',
    };
    return deCopy[intent];
  }

  const enCopy: Record<AssistantIntent, string> = {
    course_match: 'Great direction.',
    placement: 'Smart starting point.',
    exam_pathway: 'Perfect, we can map this clearly.',
    accommodation: 'Good question for a smooth Bremen start.',
    visa: 'Important point.',
    registration: 'Perfect, let us move straight into the process.',
    contact: 'Direct contact is the right move here.',
    career: 'Nice, here is the fastest path.',
    resource: 'Sure, these are the best CASA resources.',
    school: 'Knowing CASA history and background is always good.',
    smalltalk: 'Happy to help.',
    unknown: 'I can help with that.',
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
        'Ich kann im Chat keine sensiblen Dokumente wie Passkopien oder medizinische Unterlagen verarbeiten. Der sichere Weg ist der offizielle CASA-Prozess.',
      cta: { label: 'Zum Kontaktformular', href: '/contact' },
      quickLinks: [
        { label: 'Kontakt', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
      ],
      planSteps: plan(locale, [], [
        'Kontaktformular öffnen',
        'Anliegen und Kontext kurz beschreiben',
        'Rückmeldung des CASA-Teams abwarten',
      ]),
    };
  }

  return {
    intent: 'contact',
    message:
      'I cannot process sensitive documents in chat (passport scans, IDs, or medical files). The safe path is the official CASA process.',
    cta: { label: 'Open contact form', href: '/contact' },
    quickLinks: [
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
    ],
    planSteps: plan(locale, [
      'Open the contact form',
      'Describe your case in one short message',
      'Wait for the CASA team response',
    ], []),
  };
}

function visaResponse(locale: AssistantRuntimeLocale): Pick<AssistantResponsePayload, 'message' | 'cta' | 'intent' | 'planSteps' | 'quickLinks'> {
  if (locale === 'de') {
    return {
      intent: 'visa',
      message:
        'Wichtiger Punkt. Laut CASA-Hinweisen braucht der Sprachvisumspfad meist mindestens 3 Monate Kursdauer und mindestens 20 Lektionen pro Woche.\n\nDas ist keine verbindliche Rechtsberatung. Bitte lassen Sie Ihren konkreten Fall zusätzlich vom CASA-Team und der zuständigen Botschaft prüfen.',
      cta: { label: 'Visa-Beratung anfragen', href: '/contact?topic=Course advice' },
      quickLinks: [
        { label: 'Intensivkurse', href: '/courses/intensive-german' },
        { label: 'Kontakt', href: '/contact?topic=Course advice' },
      ],
      planSteps: plan(locale, [], [
        'Passenden Intensivkurs auswählen',
        'Anmeldung und Kursbestätigung sichern',
        'Dokumente mit Botschaft und CASA abstimmen',
      ]),
    };
  }

  return {
    intent: 'visa',
    message:
      'Important point. CASA visa guidance usually means at least 3 months of study and at least 20 lessons per week.\n\nThis is not legal certainty. Please confirm your exact case with the CASA team and your responsible embassy.',
    cta: { label: 'Request visa guidance', href: '/contact?topic=Course advice' },
    quickLinks: [
      { label: 'Intensive Courses', href: '/courses/intensive-german' },
      { label: 'Contact Office', href: '/contact?topic=Course advice' },
    ],
    planSteps: plan(locale, [
      'Pick a suitable intensive course',
      'Secure registration and course confirmation',
      'Validate your case with embassy and CASA office',
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
        `${wittyLead(locale, 'exam_pathway')} CASA begleitet aktuell telc Deutsch B2 und telc Deutsch C1 Hochschule mit eigenen Vorbereitungskursen und klaren Buchungswegen.`,
      cta: { label: 'Prüfungsweg öffnen', href: targetHref },
      quickLinks: uniqueLinks([
        { label: 'Prüfungen', href: '/exams' },
        { label: 'Prüfung anmelden', href: '/registration/exam' },
        { label: 'Prüfungsberatung', href: '/contact' },
      ]),
      planSteps: plan(locale, [], [
        'Prüfungsziel wählen (B2 oder C1 Hochschule)',
        'Termin und Frist prüfen',
        'Prüfungsanmeldung abschließen',
      ]),
      basedOn: ['/exams', '/registration/exam'],
    };
  }

  return {
    intent: 'exam_pathway' as const,
    message:
      `${wittyLead(locale, 'exam_pathway')} CASA currently supports telc Deutsch B2 and telc Deutsch C1 Hochschule with dedicated preparation courses and clear booking routes.`,
    cta: { label: 'Open exam pathway', href: targetHref },
    quickLinks: uniqueLinks([
      { label: 'Exams', href: '/exams' },
      { label: 'Register exam', href: '/registration/exam' },
      { label: 'Exam guidance', href: '/contact' },
    ]),
    planSteps: plan(locale, [
      'Select your target exam (B2 or C1 Hochschule)',
      'Check date and deadline',
      'Complete exam registration',
    ], []),
    basedOn: ['/exams', '/registration/exam'],
  };
}

function accommodationResponse(locale: AssistantRuntimeLocale) {
  if (locale === 'de') {
    return {
      intent: 'accommodation' as const,
      message:
        `${wittyLead(locale, 'accommodation')} Ich kann Ihnen WG und Gastfamilie gegenüberstellen und sofort zum passenden Anfrageweg führen.`,
      cta: { label: 'Unterkunft vergleichen', href: '/accommodation' },
      quickLinks: uniqueLinks([
        { label: 'Unterkunft', href: '/accommodation' },
        { label: 'Unterkunftsanfrage', href: '/contact?topic=accommodation' },
      ]),
      planSteps: plan(locale, [], [
        'WG oder Gastfamilie vergleichen',
        'Präferenzen notieren (z. B. Allergien, Ruhezeiten)',
        'Anfrage an CASA senden',
      ]),
      basedOn: ['/accommodation', '/contact?topic=accommodation'],
    };
  }

  return {
    intent: 'accommodation' as const,
    message:
      `${wittyLead(locale, 'accommodation')} I can compare shared flats and host families and route you to the best request flow.`,
    cta: { label: 'Compare accommodation', href: '/accommodation' },
    quickLinks: uniqueLinks([
      { label: 'Accommodation', href: '/accommodation' },
      { label: 'Housing request', href: '/contact?topic=accommodation' },
    ]),
    planSteps: plan(locale, [
      'Compare shared flat vs host family',
      'List your key preferences',
      'Submit your request to CASA',
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
        `${wittyLead(locale, 'registration')} Ich leite Sie direkt in die ${
          examMode ? 'Prüfungs-' : 'Kurs-'
        }anmeldung und zeige danach den nächsten sicheren Schritt.`,
      cta: {
        label: examMode ? 'Prüfung anmelden' : 'Kurs anmelden',
        href,
      },
      quickLinks: uniqueLinks([
        { label: 'Kursanmeldung', href: '/registration/course' },
        { label: 'Prüfungsanmeldung', href: '/registration/exam' },
        { label: 'Kontakt', href: '/contact' },
      ]),
      planSteps: plan(locale, [], [
        'Passendes Angebot wählen',
        'Anmeldedaten vollständig ausfüllen',
        'Bestätigung und nächste Frist prüfen',
      ]),
      basedOn: [href],
    };
  }

  return {
    intent: 'registration' as const,
    message:
      `${wittyLead(locale, 'registration')} I will route you directly to ${
        examMode ? 'exam' : 'course'
      } registration and then to the safest next step.`,
    cta: {
      label: examMode ? 'Register exam' : 'Register course',
      href,
    },
    quickLinks: uniqueLinks([
      { label: 'Course registration', href: '/registration/course' },
      { label: 'Exam registration', href: '/registration/exam' },
      { label: 'Contact', href: '/contact' },
    ]),
    planSteps: plan(locale, [
      'Choose the matching offer',
      'Complete registration details',
      'Confirm next deadline after submission',
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
          `${wittyLead(locale, 'contact')} Die öffentliche CASA-Seite hat derzeit kein aktives Lernenden- oder Team-Dashboard. Für Login- oder Kontothemen ist der sichere Weg der direkte Kontakt zum Team.`,
        cta: { label: 'Kontakt öffnen', href: '/contact' },
        quickLinks: uniqueLinks([
          { label: 'Kontaktformular', href: '/contact' },
          { label: 'FAQ', href: '/faq' },
        ]),
        planSteps: plan(locale, [], [
          'Supportanliegen kurz beschreiben',
          'Kontaktformular absenden',
          'Rückmeldung des CASA-Teams abwarten',
        ]),
        basedOn: ['/contact', '/faq'],
      };
    }

    return {
      intent: 'contact' as const,
      message:
        `${wittyLead(locale, 'contact')} CASA does not currently offer a live learner or staff dashboard on the public site. For login or account questions, the safe path is direct contact with the team.`,
      cta: { label: 'Open contact', href: '/contact' },
      quickLinks: uniqueLinks([
        { label: 'Contact form', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
      ]),
      planSteps: plan(locale, [
        'Describe the support issue briefly',
        'Submit the contact form',
        'Wait for the CASA team follow-up',
      ], []),
      basedOn: ['/contact', '/faq'],
    };
  }

  if (locale === 'de') {
    return {
      intent: 'contact' as const,
      message:
        `${wittyLead(locale, 'contact')} Wenn Sie möchten, bringe ich Sie direkt zur richtigen Kontaktstrecke für Beratung oder Unterkunftsfragen.`,
      cta: { label: 'Kontakt öffnen', href: '/contact' },
      quickLinks: uniqueLinks([
        { label: 'Kontaktformular', href: '/contact' },
        { label: 'Unterkunftsanfrage', href: '/contact?topic=accommodation' },
      ]),
      planSteps: plan(locale, [], [
        'Thema kurz benennen',
        'Kontaktformular ausfüllen',
        'Rückmeldung abwarten',
      ]),
      basedOn: ['/contact'],
    };
  }

  return {
    intent: 'contact' as const,
    message:
      `${wittyLead(locale, 'contact')} I can route you to the right admissions or accommodation contact path instantly.`,
    cta: { label: 'Open contact', href: '/contact' },
    quickLinks: uniqueLinks([
      { label: 'Contact form', href: '/contact' },
      { label: 'Housing request', href: '/contact?topic=accommodation' },
    ]),
    planSteps: plan(locale, [
      'Choose your topic',
      'Submit the contact form',
      'Wait for CASA follow-up',
    ], []),
      basedOn: ['/contact'],
  };
}

function careerResponse(locale: AssistantRuntimeLocale) {
  return {
    intent: 'career' as const,
    message:
      locale === 'de'
        ? `${wittyLead(locale, 'career')} Auf der Karriereseite finden Sie offene Rollen in Lehre, Operations und Support.`
        : `${wittyLead(locale, 'career')} The careers page lists open teaching, operations, and support roles.`,
    cta: {
      label: locale === 'de' ? 'Karriere ansehen' : 'View careers',
      href: '/careers',
    },
    quickLinks: [{ label: locale === 'de' ? 'Karriere' : 'Careers', href: '/careers' }],
    planSteps: plan(locale, [
      'Open careers',
      'Review role scope and requirements',
      'Submit your application',
    ], [
      'Karriereseite öffnen',
      'Rollenprofil und Anforderungen prüfen',
      'Bewerbung absenden',
    ]),
    basedOn: ['/careers'],
  };
}

function resourceResponse(locale: AssistantRuntimeLocale) {
  if (locale === 'de') {
    return {
      intent: 'resource' as const,
      message:
        `${wittyLead(locale, 'resource')} Für schnelle Orientierung eignen sich News und der gebündelte Leitfaden "Studium & Leben in Deutschland".`,
      cta: { label: 'Ressourcen öffnen', href: '/news' },
      quickLinks: uniqueLinks([
        { label: 'News', href: '/news' },
        { label: 'Studium & Leben in Deutschland', href: '/resources/study-in-germany' },
      ]),
      planSteps: plan(locale, [], [
        'Passenden Ressourcenbereich wählen',
        'Relevante Artikel kurz filtern',
        'Nächsten Handlungsschritt ableiten',
      ]),
      basedOn: ['/news', '/resources/study-in-germany'],
    };
  }

  return {
    intent: 'resource' as const,
    message:
      `${wittyLead(locale, 'resource')} News plus the combined Study & Life in Germany guide are the fastest way to get practical orientation.`,
    cta: { label: 'Open resources', href: '/news' },
    quickLinks: uniqueLinks([
      { label: 'News', href: '/news' },
      { label: 'Study & Life in Germany', href: '/resources/study-in-germany' },
    ]),
    planSteps: plan(locale, [
      'Choose the most relevant resource stream',
      'Skim top practical articles',
      'Take the next concrete action',
    ], []),
    basedOn: ['/news', '/resources/study-in-germany'],
  };
}

function smalltalkResponse(locale: AssistantRuntimeLocale) {
  if (locale === 'de') {
    return {
      intent: 'smalltalk' as const,
      message:
        'Hallo, ich bin CLARA - Ihre CASA-Navigationshilfe. Ich kann Ihnen in Sekunden den besten Kurs-, Prüfungs-, Unterkunfts- oder Anmeldeweg zeigen.',
      cta: { label: 'Mit Kursauswahl starten', href: '/courses' },
      quickLinks: uniqueLinks([
        { label: 'Kurse', href: '/courses' },
        { label: 'Prüfungen', href: '/exams' },
        { label: 'Unterkunft', href: '/accommodation' },
      ]),
      planSteps: plan(locale, [], [
        'Ziel nennen (Kurs, Prüfung, Unterkunft, Anmeldung)',
        'Ich gebe den besten nächsten Schritt',
      ]),
      basedOn: ['/courses', '/exams', '/accommodation'],
    };
  }

  return {
    intent: 'smalltalk' as const,
    message:
      'Hi, I am CLARA - your CASA navigation assistant. I can route you to the best course, exam, accommodation, or registration path in seconds.',
    cta: { label: 'Start with course options', href: '/courses' },
    quickLinks: uniqueLinks([
      { label: 'Courses', href: '/courses' },
      { label: 'Exams', href: '/exams' },
      { label: 'Accommodation', href: '/accommodation' },
    ]),
    planSteps: plan(locale, [
      'Tell me your goal (course, exam, housing, registration)',
      'I will give your fastest next step',
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
        message: `${wittyLead(locale, intentFromTopic(lead.topic))} Auf Basis der CASA-Infos: ${leadSummary}${
          secondSummary ? `\n\nErgänzend: ${secondSummary}` : ''
        }`,
        cta: {
          label: 'Nächsten Schritt öffnen',
          href: lead.url,
        },
        quickLinks: uniqueLinks(
          kb.routeSuggestions.length > 0
            ? kb.routeSuggestions
            : [{ label: 'Kontakt', href: '/contact' }]
        ),
        planSteps: plan(locale, [], [
          'Empfohlene Seite öffnen',
          'Wichtigste Informationen prüfen',
          'Bei Bedarf direkt Kontakt aufnehmen',
        ]),
        basedOn: kb.passages.map((passage) => passage.url),
      };
    }

    return {
      intent: intentFromTopic(lead.topic) as AssistantIntent,
      message: `${wittyLead(locale, intentFromTopic(lead.topic))} Based on CASA information: ${leadSummary}${
        secondSummary ? `\n\nAlso relevant: ${secondSummary}` : ''
      }`,
      cta: {
        label: 'Open next step',
        href: lead.url,
      },
      quickLinks: uniqueLinks(
        kb.routeSuggestions.length > 0
          ? kb.routeSuggestions
          : [{ label: 'Contact', href: '/contact' }]
      ),
      planSteps: plan(locale, [
        'Open the recommended page',
        'Check the key guidance',
        'Contact CASA if you need case-specific advice',
      ], []),
      basedOn: kb.passages.map((passage) => passage.url),
    };
  }

  if (locale === 'de') {
    return {
      intent: 'unknown' as const,
      message:
        'Ich kann bei Kurswahl, Prüfungswegen, Unterkunft, Anmeldung und Supportfragen helfen. Nennen Sie Ihr Ziel in einem Satz, dann liefere ich den schnellsten nächsten Schritt.',
      cta: { label: 'Kurse ansehen', href: '/courses' },
      quickLinks: uniqueLinks([
        { label: 'Kurse', href: '/courses' },
        { label: 'Prüfungen', href: '/exams' },
        { label: 'Kontakt', href: '/contact' },
      ]),
      planSteps: plan(locale, [], ['Ziel nennen', 'Besten nächsten Schritt öffnen']),
      basedOn: ['/courses'],
    };
  }

  return {
    intent: 'unknown' as const,
    message:
      'I can help with courses, exam pathways, accommodation, registration, and support questions. Share your goal in one sentence and I will map the fastest next step.',
    cta: { label: 'Browse courses', href: '/courses' },
    quickLinks: uniqueLinks([
      { label: 'Courses', href: '/courses' },
      { label: 'Exams', href: '/exams' },
      { label: 'Contact', href: '/contact' },
    ]),
    planSteps: plan(locale, ['Tell me your goal', 'Open your best next step'], []),
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
            ? `${wittyLead(runtimeLocale, 'placement')} Für eine präzise Empfehlung brauche ich zuerst Ihr aktuelles Niveau (A1, A2, B1, B2 oder C1).`
            : `${wittyLead(runtimeLocale, 'placement')} For a precise recommendation, I first need your current level (A1, A2, B1, B2, or C1).`,
        cta: {
          label: runtimeLocale === 'de' ? 'Einstufung starten' : 'Start placement',
          href: '/placement-test',
        },
        quickLinks: uniqueLinks([
          {
            label: runtimeLocale === 'de' ? 'Einstufungstest' : 'Placement Test',
            href: '/placement-test',
          },
          {
            label: runtimeLocale === 'de' ? 'Kurse' : 'Courses',
            href: '/courses',
          },
        ]),
        planSteps: plan(runtimeLocale, [
          'Confirm your CEFR level',
          'Match course format and schedule',
          'Start registration',
        ], [
          'CEFR-Niveau klären',
          'Kursformat und Zeitplan abgleichen',
          'Anmeldung starten',
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
            ? `${wittyLead(runtimeLocale, 'course_match')} Welcher Rhythmus passt besser: Intensiv unter der Woche oder Abendformat neben Arbeit/Studium?`
            : `${wittyLead(runtimeLocale, 'course_match')} Which rhythm fits better: intensive weekdays or evening format around work/study?`,
        cta: {
          label: runtimeLocale === 'de' ? 'Kursoptionen öffnen' : 'Open course options',
          href: '/courses',
        },
        quickLinks: uniqueLinks([
          {
            label: runtimeLocale === 'de' ? 'Intensivkurse' : 'Intensive Courses',
            href: '/courses/intensive-german',
          },
          {
            label: runtimeLocale === 'de' ? 'Abendkurse' : 'Evening Courses',
            href: '/courses/evening-course',
          },
        ]),
        planSteps: plan(runtimeLocale, [
          'Choose intensive or evening rhythm',
          'Review best-fit options',
          'Reserve your seat',
        ], [
          'Intensiv oder Abendformat wählen',
          'Passende Optionen prüfen',
          'Kursplatz sichern',
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
          ? `${wittyLead(runtimeLocale, 'course_match')} Hier sind die stärksten Kursoptionen auf Basis Ihrer Angaben. Ich habe sie so sortiert, dass Sie schnell den besten Startpfad finden.`
          : `${wittyLead(runtimeLocale, 'course_match')} Here are the strongest course options based on your inputs. I sorted them for the fastest reliable start path.`,
      cta: {
        label: runtimeLocale === 'de' ? 'Kursanmeldung starten' : 'Start course registration',
        href: '/registration/course',
      },
      cards,
      quickLinks: uniqueLinks([
        { label: runtimeLocale === 'de' ? 'Kursanmeldung' : 'Course Registration', href: '/registration/course' },
        { label: runtimeLocale === 'de' ? 'Kursseite' : 'Courses', href: '/courses' },
        { label: runtimeLocale === 'de' ? 'Beratung' : 'Contact', href: '/contact?topic=Course advice' },
      ]),
      planSteps: plan(runtimeLocale, [
        'Pick your preferred course option',
        'Confirm your start date',
        'Complete registration',
      ], [
        'Passende Kursoption wählen',
        'Starttermin bestätigen',
        'Anmeldung abschließen',
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
        ? 'Hinweis: Ich arbeite nach dem CLARA-Sicherheitsleitfaden.'
        : 'Note: I follow the CLARA safety guide.'
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
