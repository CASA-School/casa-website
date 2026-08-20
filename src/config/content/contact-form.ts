/**
 * The contact form's topic catalogue and its localized copy.
 *
 * Extracted from src/app/contact/page.tsx so the course detail route can mount
 * the same form. Three course formats — German for Medical, German for Groups
 * and Firmenunterricht — publish no dates, no weekly hours and no price, so
 * their pages carried a facts rail whose rows read "On request", "By
 * arrangement" and "To be announced": four of five rows on the medical page
 * carried no information at all. Those pages now end in the enquiry that is the
 * only real action available on them, and they use THIS form rather than a
 * second one, so the validation, the API route and the webhook fan-out stay
 * single-sourced.
 *
 * `/contact` still owns the page; this owns the catalogue.
 */
type TopicConfig = {
  key: string;
  labels: {
    en: string;
    de: string;
  };
  aliases: string[];
};

export const topicCatalog: TopicConfig[] = [
  {
    key: 'course-advice',
    labels: { en: 'Course advice', de: 'Kursberatung' },
    aliases: ['course-advice', 'course', 'courses', 'kurs', 'kursberatung'],
  },
  {
    key: 'registration-support',
    labels: { en: 'Registration support', de: 'Anmeldung' },
    aliases: ['registration', 'register', 'anmeldung'],
  },
  {
    key: 'placement-test',
    labels: { en: 'Placement test', de: 'Einstufung' },
    aliases: ['placement', 'placement-test', 'placement-online', 'placement-in-person', 'einstufung'],
  },
  {
    key: 'exam-registration',
    labels: { en: 'Exam registration', de: 'Prüfungsanmeldung' },
    aliases: ['exam', 'exam-registration', 'prüfung', 'prüfungsanmeldung'],
  },
  {
    key: 'bildungszeit-azav',
    labels: { en: 'Bildungszeit / AZAV', de: 'Bildungszeit / AZAV' },
    aliases: ['bildungszeit', 'azav', 'educational-leave', 'funding'],
  },
  {
    key: 'medical-german',
    labels: { en: 'Medical German', de: 'Deutsch für Medizin' },
    aliases: ['medical', 'medical-german', 'medizin', 'deutsch-für-medizin', 'fsp'],
  },
  {
    key: 'company-courses',
    labels: { en: 'Company courses', de: 'Firmenunterricht' },
    aliases: ['company', 'company-courses', 'corporate', 'business', 'firmenunterricht', 'firma'],
  },
  {
    key: 'group-booking',
    labels: { en: 'Group booking', de: 'Gruppenanfrage' },
    aliases: ['group', 'group-booking', 'groups', 'gruppe', 'gruppen', 'gruppenanfrage', 'schulklasse'],
  },
  {
    key: 'accommodation-support',
    labels: { en: 'Accommodation support', de: 'Unterkunft' },
    aliases: ['accommodation', 'housing', 'unterkunft'],
  },
  {
    key: 'host-family',
    labels: { en: 'Host family application', de: 'Gastfamilie werden' },
    aliases: ['host-family', 'host', 'become-host', 'gastfamilie', 'gastfamilie-werden'],
  },
  {
    key: 'agency-partnership',
    labels: { en: 'Agency partnership', de: 'Agenturpartnerschaft' },
    aliases: ['agency', 'agency-partnership', 'agentur', 'agenturpartnerschaft'],
  },
  {
    key: 'careers',
    labels: { en: 'Career opportunities', de: 'Karriere' },
    aliases: ['career', 'careers', 'job', 'jobs', 'karriere'],
  },
];

function normalizeTopicValue(value: string | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves `?topic=` to a catalog key. Returns an empty string when nothing
 * matches; the form then falls back to its first option.
 */
export function getInitialTopicKey(rawTopic: string | undefined, locale: 'en' | 'de') {
  const normalized = normalizeTopicValue(rawTopic);
  if (!normalized) {
    return '';
  }

  const match = topicCatalog.find((item) => {
    const localizedLabel = locale === 'de' ? item.labels.de : item.labels.en;
    return item.aliases.includes(normalized) || normalizeTopicValue(localizedLabel) === normalized;
  });

  return match?.key ?? '';
}

export const formCopyByLocale = {
  en: {
    formTitle: 'Send your request',
    formBody: 'Tell us your current level, target, preferred start date, and whether exam, visa, Bildungszeit/AZAV, or housing deadlines matter. We will answer with a clear next step.',
    submit: 'Send',
    submitting: 'Sending your request...',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Anna',
    lastNameLabel: 'Last name (optional)',
    lastNamePlaceholder: 'Mueller',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    topicLabel: 'Topic',
    topicPlaceholder: 'Select a topic',
    messageLabel: 'Message',
    messagePlaceholder: 'Example: I am currently A2, need evening classes, want to start in August, and may need telc B2 or housing support.',
    successTitle: 'Request received',
    successBody: 'Thank you. CASA usually replies within one business day with a concrete recommendation.',
    sendAnother: 'Send another request',
    errorTitle: 'Submission issue',
    errorBody: 'Please try again or contact us directly if your request is time-sensitive.',
    responseTitle: 'Response promise',
    responseValue: 'Usually within 1 business day',
    responseBody: 'For urgent deadlines, call the office directly during opening hours.',
    callCta: 'Call the office',
    officeDetails: 'Office details',
    officeHours: 'Office hours',
    placementPromptTitle: 'Need level advice first?',
    placementPromptBody: 'Take the placement test before registration.',
    placementPromptCta: 'Start level check',
    registrationPromptTitle: 'Already decided?',
    registrationPromptBody: 'Go directly to course registration.',
    registrationPromptCta: 'Reserve course spot',
  },
  de: {
    formTitle: 'Anfrage senden',
    formBody: 'Nennen Sie bitte Ihr aktuelles Niveau, Ziel, Wunschstart und ob Prüfung, Visum, Bildungszeit/AZAV oder Unterkunft wichtig sind. Wir antworten mit einem klaren nächsten Schritt.',
    submit: 'Senden',
    submitting: 'Anfrage wird übermittelt...',
    firstNameLabel: 'Vorname',
    firstNamePlaceholder: 'Anna',
    lastNameLabel: 'Nachname (optional)',
    lastNamePlaceholder: 'Müller',
    emailLabel: 'E-Mail',
    emailPlaceholder: 'you@example.com',
    topicLabel: 'Thema',
    topicPlaceholder: 'Thema auswählen',
    messageLabel: 'Nachricht',
    messagePlaceholder: 'Beispiel: Ich bin aktuell A2, suche Abendkurse, möchte im August starten und brauche eventuell telc B2 oder Unterkunft.',
    successTitle: 'Anfrage eingegangen',
    successBody: 'Vielen Dank. CASA meldet sich in der Regel innerhalb eines Werktages mit einer konkreten Empfehlung.',
    sendAnother: 'Weitere Anfrage senden',
    errorTitle: 'Übermittlung nicht möglich',
    errorBody: 'Bitte erneut versuchen oder bei Zeitdruck direkt im Büro melden.',
    responseTitle: 'Antwortzeit',
    responseValue: 'Meist innerhalb eines Werktags',
    responseBody: 'Bei dringenden Fristen rufen Sie das Büro bitte direkt an.',
    callCta: 'Büro anrufen',
    officeDetails: 'Kontaktdaten',
    officeHours: 'Öffnungszeiten',
    placementPromptTitle: 'Unsicher beim Niveau?',
    placementPromptBody: 'Starten Sie zuerst mit der Einstufung.',
    placementPromptCta: 'Level-Check starten',
    registrationPromptTitle: 'Schon entschieden?',
    registrationPromptBody: 'Direkt zur Kursanmeldung wechseln.',
    registrationPromptCta: 'Zur Kursanmeldung',
  },
} as const;

/** Localized `{key,label}` pairs, the shape ContactInquiryForm expects. */
export function contactTopicOptions(locale: 'en' | 'de') {
  return topicCatalog.map((topic) => ({
    key: topic.key,
    label: locale === 'de' ? topic.labels.de : topic.labels.en,
  }));
}
