import { organiserCopy } from '@/config/forms/organiser-brief-copy';
import { INTAKE_QUESTIONS } from '@/config/placement/intake';
import { isCompanyTopic, ORGANISER_CHOICES } from '@/lib/validation/contact';

import { LOGO_CONTENT_ID, LOGO_HEIGHT, LOGO_WIDTH } from './casa-logo';

/**
 * The notification email CASA staff receive for each public form.
 *
 * Written in the language of the form that was sent, so a German enquiry reads
 * German and an English one English, including the reply it prepares for the
 * sender. Every value is escaped; nothing from the payload reaches the HTML
 * unescaped.
 *
 * Built for mail clients, not browsers: tables and inline styles because
 * desktop Outlook renders with Word's engine, a ghost table to hold its width,
 * and one media query that stacks label and value on a phone. The logo is an
 * inline attachment (`cid:`), so no client blocks it as remote content. One
 * accent colour, CASA blue; the full red, blue and sun triad stays in the logo,
 * as on the website.
 */

export type FormKind = 'contact' | 'groups' | 'course' | 'exam' | 'careers' | 'placement' | 'appointment';
type Locale = 'de' | 'en';
type Payload = Record<string, unknown>;

type Row = { label: string; value: string | null; href?: string; detail?: string; block?: boolean; item?: boolean };
type Section = { title: string | null; rows: Row[] };
type Action = { label: string; href: string; hint: string | null };
type Mail = {
  subject: string;
  kindLabel: string;
  title: string;
  lead: string;
  chips: string[];
  action: Action | null;
  note: string | null;
  sections: Section[];
};

export type FormMailOptions = { test: boolean; stored?: boolean; testRecipient: string };

const COPY = {
  de: {
    language: 'Deutsch',
    yes: 'Ja',
    no: 'Nein',
    test: (to: string) => `Testbetrieb: Alle Formular-E-Mails gehen derzeit an ${to}.`,
    replyHint: 'Oder antworten Sie einfach auf diese E-Mail.',
    reference: 'Referenz',
    formLanguage: 'Sprache',
    stored: 'Auch im Arbeitsbereich gespeichert.',
    notStored: 'Nicht im Arbeitsbereich gespeichert. Diese E-Mail ist der einzige Eintrag.',
    generated: (source: string) => `Automatisch erstellt ${source} auf casa-bremen.de.`,
    address: 'CASA – Internationale Sprachschule gemeinnützige GmbH · Am Dobben 14–16 · 28203 Bremen',
    logoAlt: 'CASA Internationale Sprachschule',
    name: 'Name',
    salutation: 'Anrede',
    email: 'E-Mail',
    phone: 'Telefon',
    birthDate: 'Geburtsdatum',
    nationality: 'Staatsangehörigkeit',
    message: 'Nachricht',
    person: 'Person',
    contact: 'Kontakt',
    salutations: { mr: 'Herr', ms: 'Frau', mx: 'Mx.', neutral: 'Keine Anrede' } as Record<string, string>,
    greeting: (salutation: string, first: string | null, last: string | null) =>
      salutation === 'ms' && last ? `Sehr geehrte Frau ${last},`
      : salutation === 'mr' && last ? `Sehr geehrter Herr ${last},`
      : `Guten Tag ${[first, last].filter(Boolean).join(' ')},`,
    replyTo: (first: string) => `${first} antworten`,

    contactKind: 'Kontaktanfrage',
    contactTitle: 'Neue Kontaktanfrage',
    contactSource: 'aus dem Kontaktformular',
    contactLead: (name: string, topic: string | null) =>
      topic ? `${name} hat über das Kontaktformular eine Nachricht zum Thema „${topic}“ geschickt.`
      : `${name} hat über das Kontaktformular eine Nachricht geschickt.`,
    contactReply: 'Ihre Anfrage bei CASA',
    topic: 'Thema',
    enquiry: 'Anfrage',

    groupKind: 'Gruppenanfrage',
    groupTitle: 'Neue Gruppenanfrage',
    groupSource: 'aus der Gruppenanfrage',
    groupLead: (name: string, org: string | null, size: string | null) =>
      `${name}${org ? ` (${org})` : ''} fragt einen Gruppenaufenthalt${size ? ` für ${size} Personen` : ''} an.`,
    groupReply: 'Ihre Gruppenanfrage bei CASA',
    group: 'Gruppe',
    companyKind: 'Firmenanfrage',
    companyTitle: 'Neue Anfrage für Firmenunterricht',
    companySource: 'aus der Anfrage für Firmenunterricht',
    companyLead: (name: string, org: string | null, size: string | null) =>
      `${name}${org ? ` (${org})` : ''} fragt Deutschunterricht${size ? ` für ${size} Teilnehmende` : ''} an.`,
    companyReply: 'Ihre Anfrage zum Firmenunterricht bei CASA',
    company: 'Firmenunterricht',
    people: (n: string) => `${n} Personen`,

    courseKind: 'Kursanmeldung',
    courseTitle: 'Neue Kursanmeldung',
    courseSource: 'aus der Kursanmeldung',
    courseLead: (name: string, course: string | null) =>
      course ? `${name} hat sich für den Kurs „${course}“ angemeldet.` : `${name} hat sich für einen Kurs angemeldet.`,
    courseReply: 'Ihre Kursanmeldung bei CASA',
    course: 'Kurs',
    dates: 'Zeitraum',
    schedule: 'Unterricht',
    location: 'Ort',
    courseOption: 'Termin',
    declaredLevel: 'Selbst eingeschätztes Niveau',
    visaAndStay: 'Visum und Unterkunft',
    visa: 'Visum',
    visaNeeded: 'Benötigt',
    visaNotNeeded: 'Nicht benötigt',
    accommodation: 'Unterkunft',
    accommodationNone: 'Nicht gewünscht',
    accommodationTypes: { host: 'Gastfamilie', flat: 'Wohngemeinschaft' } as Record<string, string>,
    allergies: 'Allergien',
    allergyConsent: 'Einwilligung zur Weitergabe an die Unterkunft liegt vor.',
    notes: 'Weitere Hinweise',
    chipVisa: 'Visum benötigt',
    chipStay: { host: 'Gastfamilie gewünscht', flat: 'WG gewünscht' } as Record<string, string>,
    chipStayAny: 'Unterkunft gewünscht',
    chipAllergies: 'Allergien angegeben',

    examKind: 'Prüfungsanmeldung',
    examTitle: 'Neue Prüfungsanmeldung',
    examSource: 'aus der Prüfungsanmeldung',
    examLead: (name: string, exam: string | null) =>
      exam ? `${name} hat sich zur Prüfung „${exam}“ angemeldet.` : `${name} hat sich zu einer Prüfung angemeldet.`,
    examReply: 'Ihre Prüfungsanmeldung bei CASA',
    exam: 'Prüfung',
    examSession: 'Termin',
    examPart: 'Prüfungsteil',
    examParts: { full: 'Gesamte Prüfung', written: 'Nur schriftlich', oral: 'Nur mündlich' } as Record<string, string>,
    officialName: 'Name wie im Ausweis',
    confirmed: 'Bestätigt',

    appointmentKind: 'Terminanfrage',
    appointmentTitle: 'Neue Terminanfrage',
    appointmentSource: 'aus der Terminbuchung',
    appointmentLead: (name: string, day: string | null, time: string | null) =>
      day && time ? `${name} möchte eine Gruppenberatung am ${day}, um ${time} Uhr vereinbaren.`
      : `${name} möchte eine Gruppenberatung vereinbaren.`,
    appointmentNote: 'Diese Uhrzeit ist ab sofort für andere Anfragen reserviert.',
    appointment: 'Termin',
    date: 'Datum',
    time: 'Uhrzeit',
    timeValue: (t: string) => `${t} Uhr (Bremer Zeit)`,
    subjectTime: (t: string) => `${t} Uhr`,
    duration: 'Dauer',
    minutes: (n: string) => `${n} Minuten`,
    confirmAppointment: 'Termin bestätigen',
    confirmHint: (address: string) => `Die Antwort geht an ${address}. Ergänzen Sie vor dem Senden, wie das Gespräch stattfindet.`,
    confirmSubject: (day: string, time: string) => `Ihr Beratungstermin bei CASA: ${day}, ${time} Uhr`,
    confirmBody: (greeting: string, day: string, time: string, minutes: string) =>
      `${greeting}\n\nvielen Dank für Ihre Anfrage. Gerne bestätige ich Ihren Beratungstermin am ${day}, um ${time} Uhr (Bremer Zeit). `
      + `Wir nehmen uns etwa ${minutes} Minuten Zeit für Ihre Fragen und Ideen.\n\n`
      + 'So sprechen wir: [Telefon, Videolink oder bei CASA, Am Dobben 14–16, 28203 Bremen]\n\n'
      + 'Ich freue mich auf unser Gespräch.\n\nMit freundlichen Grüßen\n',

    careersKind: 'Bewerbung',
    careersTitle: 'Neue Bewerbung',
    careersSource: 'aus dem Bewerbungsformular',
    careersLead: (position: string | null) =>
      position ? `Für die Stelle „${position}“ ist eine neue Bewerbung eingegangen.` : 'Eine neue Bewerbung ist eingegangen.',
    careersNote: 'Bewerbung und Lebenslauf finden Sie im Arbeitsbereich unter „Bewerbungen“. Diese E-Mail enthält bewusst keine persönlichen Angaben.',
    position: 'Stelle',

    placementKind: 'Einstufungstest',
    placementTitle: 'Einstufungstest abgeschlossen',
    placementSource: 'aus dem Einstufungstest',
    placementLead: (band: string | null) =>
      band ? `Ein Einstufungstest auf der Website ist abgeschlossen. Das System empfiehlt ${band}; die Einstufung bestätigt eine Lehrkraft.`
      : 'Ein Einstufungstest auf der Website ist abgeschlossen.',
    placementNote: 'Prüfen und bestätigen Sie die Empfehlung im Arbeitsbereich unter „Einstufungstests“.',
    recommendation: 'Empfehlung',
    confidence: 'Sicherheit',
    confidences: { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' } as Record<string, string>,
    result: 'Ergebnis',
    confirmation: 'Bestätigung',
    byTeacher: 'Durch eine Lehrkraft',
    automatic: 'Automatisch möglich',
    speaking: 'Gespräch nötig',
    answered: 'Beantwortet',
    accessKey: 'Zugangsschlüssel',
    skills: 'Fertigkeiten',
    skillNames: { language_use: 'Sprachgebrauch', reading: 'Lesen', listening: 'Hören' } as Record<string, string>,
    notMeasured: 'Nicht geprüft',
    tasks: (n: number) => `${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'}`,
    toCheck: 'Worauf zu achten ist',
    intake: 'Einstiegsfragen',
    intakeLabels: { priorLearning: 'Bisher gelernt', goal: 'Ziel', lastContact: 'Zuletzt regelmäßig Deutsch' } as Record<string, string>,
    chipSpeaking: 'Gespräch nötig',
    chipLowConfidence: 'Geringe Sicherheit',
    reasons: {
      technical_problem: 'Beim Test ist etwas schiefgegangen; das Ergebnis ist nicht verlässlich.',
      incomplete_objective_evidence: 'Zu wenig beantwortet, um allein danach einzustufen.',
      router_level_disagreement: 'Einstiegsteil und Niveaumodul zeigen auf verschiedene Niveaus.',
      low_confidence: 'Die Antworten stützen das Niveau nur schwach.',
      unresolved_boundary: 'Die Grenzprüfung hat nicht entschieden, auf welcher Seite die Person liegt.',
      b1plus_b2_boundary: 'An der Grenze B1+/B2, wo sich die Kursstruktur ändert.',
      above_auto_confirm_ceiling: 'Über B1.2; das bestätigt CASA nie automatisch.',
      uneven_skill_profile: 'In einer Fertigkeit stark, in einer anderen schwach.',
      speaking_required: 'Ab B1+ gehört ein Gespräch zur Einstufung.',
      incomplete_production: 'Die Schreibaufgabe wurde begonnen, aber nicht beendet.',
      learner_requested_review: 'Die Person möchte, dass jemand das Ergebnis ansieht.',
      shadow_mode: 'Pilotbetrieb: Jedes Ergebnis ist eine Empfehlung für das Team, keine Einstufung.',
    } as Record<string, string>,
  },
  en: {
    language: 'English',
    yes: 'Yes',
    no: 'No',
    test: (to: string) => `Test mode: all form emails currently go to ${to}.`,
    replyHint: 'Or simply reply to this email.',
    reference: 'Reference',
    formLanguage: 'Language',
    stored: 'Also stored in the staff workspace.',
    notStored: 'Not stored in the staff workspace. This email is the only record.',
    generated: (source: string) => `Generated automatically ${source} on casa-bremen.de.`,
    address: 'CASA – Internationale Sprachschule gemeinnützige GmbH · Am Dobben 14–16 · 28203 Bremen, Germany',
    logoAlt: 'CASA Internationale Sprachschule',
    name: 'Name',
    salutation: 'Salutation',
    email: 'Email',
    phone: 'Phone',
    birthDate: 'Date of birth',
    nationality: 'Nationality',
    message: 'Message',
    person: 'Person',
    contact: 'Contact',
    salutations: { mr: 'Mr', ms: 'Ms', mx: 'Mx', neutral: 'No salutation' } as Record<string, string>,
    greeting: (salutation: string, first: string | null, last: string | null) =>
      salutation === 'ms' && last ? `Dear Ms ${last},`
      : salutation === 'mr' && last ? `Dear Mr ${last},`
      : salutation === 'mx' && last ? `Dear Mx ${last},`
      : `Dear ${[first, last].filter(Boolean).join(' ')},`,
    replyTo: (first: string) => `Reply to ${first}`,

    contactKind: 'Contact enquiry',
    contactTitle: 'New contact enquiry',
    contactSource: 'from the contact form',
    contactLead: (name: string, topic: string | null) =>
      topic ? `${name} sent a message through the contact form about “${topic}”.`
      : `${name} sent a message through the contact form.`,
    contactReply: 'Your enquiry to CASA',
    topic: 'Topic',
    enquiry: 'Enquiry',

    groupKind: 'Group enquiry',
    groupTitle: 'New group enquiry',
    groupSource: 'from the group enquiry form',
    groupLead: (name: string, org: string | null, size: string | null) =>
      `${name}${org ? ` (${org})` : ''} is asking about a group stay${size ? ` for ${size} people` : ''}.`,
    groupReply: 'Your group enquiry to CASA',
    group: 'Group',
    companyKind: 'Company enquiry',
    companyTitle: 'New company training enquiry',
    companySource: 'from the company training enquiry',
    companyLead: (name: string, org: string | null, size: string | null) =>
      `${name}${org ? ` (${org})` : ''} is asking about German classes${size ? ` for ${size} participants` : ''}.`,
    companyReply: 'Your company training enquiry to CASA',
    company: 'Company training',
    people: (n: string) => `${n} people`,

    courseKind: 'Course registration',
    courseTitle: 'New course registration',
    courseSource: 'from the course registration',
    courseLead: (name: string, course: string | null) =>
      course ? `${name} has registered for the course “${course}”.` : `${name} has registered for a course.`,
    courseReply: 'Your course registration at CASA',
    course: 'Course',
    dates: 'Dates',
    schedule: 'Classes',
    location: 'Location',
    courseOption: 'Dates',
    declaredLevel: 'Self-assessed level',
    visaAndStay: 'Visa and accommodation',
    visa: 'Visa',
    visaNeeded: 'Needed',
    visaNotNeeded: 'Not needed',
    accommodation: 'Accommodation',
    accommodationNone: 'Not requested',
    accommodationTypes: { host: 'Host family', flat: 'Shared flat' } as Record<string, string>,
    allergies: 'Allergies',
    allergyConsent: 'Consent given to share with the accommodation.',
    notes: 'Additional notes',
    chipVisa: 'Visa needed',
    chipStay: { host: 'Host family requested', flat: 'Shared flat requested' } as Record<string, string>,
    chipStayAny: 'Accommodation requested',
    chipAllergies: 'Allergies noted',

    examKind: 'Exam registration',
    examTitle: 'New exam registration',
    examSource: 'from the exam registration',
    examLead: (name: string, exam: string | null) =>
      exam ? `${name} has registered for the exam “${exam}”.` : `${name} has registered for an exam.`,
    examReply: 'Your exam registration at CASA',
    exam: 'Exam',
    examSession: 'Date',
    examPart: 'Exam part',
    examParts: { full: 'Full exam', written: 'Written part only', oral: 'Oral part only' } as Record<string, string>,
    officialName: 'Name as on ID',
    confirmed: 'Confirmed',

    appointmentKind: 'Appointment request',
    appointmentTitle: 'New appointment request',
    appointmentSource: 'from the appointment booking',
    appointmentLead: (name: string, day: string | null, time: string | null) =>
      day && time ? `${name} would like a group consultation on ${day} at ${time}.`
      : `${name} would like a group consultation.`,
    appointmentNote: 'This time is now reserved and no longer offered to others.',
    appointment: 'Appointment',
    date: 'Date',
    time: 'Time',
    timeValue: (t: string) => `${t} (Bremen time)`,
    subjectTime: (t: string) => t,
    duration: 'Duration',
    minutes: (n: string) => `${n} minutes`,
    confirmAppointment: 'Confirm appointment',
    confirmHint: (address: string) => `The reply goes to ${address}. Before sending, add how the conversation will take place.`,
    confirmSubject: (day: string, time: string) => `Your consultation with CASA: ${day}, ${time}`,
    confirmBody: (greeting: string, day: string, time: string, minutes: string) =>
      `${greeting}\n\nThank you for your request. I am happy to confirm your consultation on ${day} at ${time} (Bremen time). `
      + `We will take about ${minutes} minutes for your questions and ideas.\n\n`
      + 'How we will meet: [phone, video link or at CASA, Am Dobben 14–16, 28203 Bremen]\n\n'
      + 'I look forward to speaking with you.\n\nKind regards\n',

    careersKind: 'Job application',
    careersTitle: 'New job application',
    careersSource: 'from the application form',
    careersLead: (position: string | null) =>
      position ? `A new application has arrived for the position “${position}”.` : 'A new application has arrived.',
    careersNote: 'The application and CV are in the workspace under Applications. This email deliberately contains no personal details.',
    position: 'Position',

    placementKind: 'Placement test',
    placementTitle: 'Placement test completed',
    placementSource: 'from the placement test',
    placementLead: (band: string | null) =>
      band ? `A placement test on the website has been completed. The system recommends ${band}; a teacher confirms the placement.`
      : 'A placement test on the website has been completed.',
    placementNote: 'Review and confirm the recommendation in the workspace under Placement tests.',
    recommendation: 'Recommendation',
    confidence: 'Confidence',
    confidences: { high: 'High', medium: 'Medium', low: 'Low' } as Record<string, string>,
    result: 'Result',
    confirmation: 'Confirmation',
    byTeacher: 'By a teacher',
    automatic: 'Can be automatic',
    speaking: 'Conversation needed',
    answered: 'Answered',
    accessKey: 'Access key',
    skills: 'Skills',
    skillNames: { language_use: 'Language use', reading: 'Reading', listening: 'Listening' } as Record<string, string>,
    notMeasured: 'Not tested',
    tasks: (n: number) => `${n} ${n === 1 ? 'task' : 'tasks'}`,
    toCheck: 'What to look at',
    intake: 'Opening questions',
    intakeLabels: { priorLearning: 'Learned so far', goal: 'Goal', lastContact: 'Last used German regularly' } as Record<string, string>,
    chipSpeaking: 'Conversation needed',
    chipLowConfidence: 'Low confidence',
    reasons: {
      technical_problem: 'Something went wrong during the test; treat the score as unreliable.',
      incomplete_objective_evidence: 'Too little was answered to place on it alone.',
      router_level_disagreement: 'The opening screener and the level module point at different levels.',
      low_confidence: 'The answers support the level only weakly.',
      unresolved_boundary: 'The boundary check did not settle which side of the edge they are on.',
      b1plus_b2_boundary: 'On the B1+/B2 edge, where CASA course structure changes.',
      above_auto_confirm_ceiling: 'Above B1.2, which CASA never auto-confirms.',
      uneven_skill_profile: 'Strong in one skill and weak in another.',
      speaking_required: 'From B1+ a conversation is part of the placement.',
      incomplete_production: 'The writing task was started and not finished.',
      learner_requested_review: 'The learner asked for a person to look at this.',
      shadow_mode: 'Pilot mode: every result is a recommendation for staff, never a placement.',
    } as Record<string, string>,
  },
} as const;

type Copy = (typeof COPY)[Locale];

const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const validEmail = (value: unknown) => {
  const address = text(value);
  return address && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(address) ? address : null;
};

function fullName(p: Payload) {
  return [text(p.firstName), text(p.lastName)].filter(Boolean).join(' ') || null;
}

/** `YYYY-MM-DD` as written in that language, read without a time zone so it never shifts a day. */
function formatDay(value: unknown, locale: Locale, weekday = false) {
  const raw = text(value);
  const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!raw || !match) return raw;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', ...(weekday ? { weekday: 'long' } : {}),
  }).format(date);
}

function formatInstant(value: unknown, locale: Locale) {
  const raw = text(value);
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'Europe/Berlin', dateStyle: 'long', timeStyle: 'short',
  }).format(date);
}

function mailto(address: string, subject: string, body: string) {
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A reply button to the sender, with the greeting already written in their language. */
function replyAction(p: Payload, c: Copy, subject: string): Action | null {
  const address = validEmail(p.email);
  const first = text(p.firstName) ?? fullName(p);
  if (!address || !first) return null;
  const greeting = c.greeting(String(p.salutation ?? ''), text(p.firstName), text(p.lastName));
  return { label: c.replyTo(first), href: mailto(address, subject, `${greeting}\n\n`), hint: c.replyHint };
}

function emailRow(p: Payload, c: Copy): Row {
  const address = validEmail(p.email);
  return { label: c.email, value: address ?? text(p.email), href: address ? `mailto:${address}` : undefined };
}

function personSection(p: Payload, locale: Locale, c: Copy, extra: Row[] = []): Section {
  const phone = text(p.phone);
  return {
    title: c.person,
    rows: [
      { label: c.salutation, value: c.salutations[String(p.salutation)] ?? text(p.salutation) },
      { label: c.name, value: fullName(p) },
      { label: c.birthDate, value: formatDay(p.birthDate, locale) },
      { label: c.nationality, value: text(p.nationality) },
      emailRow(p, c),
      { label: c.phone, value: phone, href: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined },
      ...extra,
    ],
  };
}

/** `dates | schedule | location` from the catalogue, as one row per part. */
function optionRows(label: unknown, names: string[], fallback: string): Row[] {
  const parts = text(label)?.split(' | ').map((part) => part.trim()).filter(Boolean) ?? [];
  if (parts.length !== names.length) return [{ label: fallback, value: parts.join(' · ') || null }];
  return parts.map((value, index) => ({ label: names[index], value }));
}

function briefSection(p: Payload, locale: Locale, title: string): Section | null {
  const brief = p.organiserBrief;
  if (!brief || typeof brief !== 'object') return null;
  const copy = organiserCopy[locale];
  const rows = Object.entries(brief as Record<string, unknown>).map(([key, value]): Row => {
    const label = (copy.labels as Record<string, string>)[key] ?? key;
    if (value === null || value === undefined || value === '') return { label, value: null };
    const options = key in ORGANISER_CHOICES ? (copy.options as Record<string, Record<string, string>>)[key] : null;
    return { label, value: options?.[String(value)] ?? String(value) };
  });
  return { title, rows };
}

function contactMail(kind: 'contact' | 'groups', p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p) ?? c.name;
  const topic = text(p.topic);
  const company = kind === 'groups' && isCompanyTopic(text(p.topicKey));
  const briefValues = (p.organiserBrief ?? {}) as Record<string, unknown>;
  const organisation = text(briefValues.organisationName);
  const size = briefValues.groupSize ? String(briefValues.groupSize) : null;
  const brief = kind === 'groups' ? briefSection(p, locale, company ? c.company : c.group) : null;
  const kindLabel = kind === 'contact' ? c.contactKind : company ? c.companyKind : c.groupKind;
  return {
    subject:
      kind === 'contact'
        ? `${kindLabel}: ${[topic, fullName(p)].filter(Boolean).join(' – ')}`
        : `${kindLabel}: ${[organisation ?? fullName(p), size ? c.people(size) : null].filter(Boolean).join(' · ')}`,
    kindLabel,
    title: kind === 'contact' ? c.contactTitle : company ? c.companyTitle : c.groupTitle,
    lead:
      kind === 'contact' ? c.contactLead(name, topic)
      : company ? c.companyLead(name, organisation, size)
      : c.groupLead(name, organisation, size),
    chips: [],
    action: replyAction(p, c, kind === 'contact' ? c.contactReply : company ? c.companyReply : c.groupReply),
    note: null,
    sections: [
      { title: c.enquiry, rows: [{ label: c.topic, value: topic }, { label: c.message, value: text(p.message), block: true }] },
      ...(brief ? [brief] : []),
      { title: c.contact, rows: [{ label: c.name, value: fullName(p) }, emailRow(p, c)] },
    ],
  };
}

function courseMail(p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p) ?? c.name;
  const course = text(p.courseTypeLabel);
  const accommodation = p.accommodationRequired === true;
  const stayType = String(p.accommodationType ?? '');
  const allergies = accommodation ? text(p.allergies) : null;
  return {
    subject: `${c.courseKind}: ${[fullName(p), course].filter(Boolean).join(' – ')}`,
    kindLabel: c.courseKind,
    title: c.courseTitle,
    lead: c.courseLead(name, course),
    chips: [
      ...(p.visaRequired === true ? [c.chipVisa] : []),
      ...(accommodation ? [c.chipStay[stayType] ?? c.chipStayAny] : []),
      ...(allergies ? [c.chipAllergies] : []),
    ],
    action: replyAction(p, c, c.courseReply),
    note: null,
    sections: [
      {
        title: c.course,
        rows: [
          { label: c.course, value: course },
          ...optionRows(p.courseInstanceLabel, [c.dates, c.schedule, c.location], c.courseOption),
          { label: c.declaredLevel, value: text(p.currentLevel) },
        ],
      },
      personSection(p, locale, c),
      {
        title: c.visaAndStay,
        rows: [
          { label: c.visa, value: p.visaRequired === true ? c.visaNeeded : c.visaNotNeeded },
          { label: c.accommodation, value: accommodation ? (c.accommodationTypes[stayType] ?? c.yes) : c.accommodationNone },
          { label: c.allergies, value: allergies, detail: c.allergyConsent },
          { label: c.notes, value: text(p.notes), block: true },
        ],
      },
    ],
  };
}

function examMail(p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p) ?? c.name;
  const exam = text(p.examTypeLabel);
  const part = String(p.registrationType ?? '');
  return {
    subject: `${c.examKind}: ${[fullName(p), exam].filter(Boolean).join(' – ')}`,
    kindLabel: c.examKind,
    title: c.examTitle,
    lead: c.examLead(name, exam),
    chips: part === 'written' || part === 'oral' ? [c.examParts[part]] : [],
    action: replyAction(p, c, c.examReply),
    note: null,
    sections: [
      {
        title: c.exam,
        rows: [
          { label: c.exam, value: exam },
          ...optionRows(p.examSessionLabel, [c.examSession, c.location], c.examSession),
          { label: c.examPart, value: c.examParts[part] ?? text(p.registrationType) },
        ],
      },
      personSection(p, locale, c, [{ label: c.officialName, value: p.officialNameConfirmed === true ? c.confirmed : null }]),
    ],
  };
}

function appointmentMail(p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p) ?? c.name;
  const day = formatDay(p.localDate, locale, true);
  const time = text(p.localTime);
  const minutes = p.durationMinutes ? String(p.durationMinutes) : '30';
  const address = validEmail(p.email);
  const greeting = c.greeting(String(p.salutation ?? ''), text(p.firstName), text(p.lastName));
  return {
    subject: `${c.appointmentKind}: ${[fullName(p), [day, time ? c.subjectTime(time) : null].filter(Boolean).join(', ')].filter(Boolean).join(' – ')}`,
    kindLabel: c.appointmentKind,
    title: c.appointmentTitle,
    lead: c.appointmentLead(name, day, time),
    chips: [],
    action:
      address && day && time
        ? {
            label: c.confirmAppointment,
            href: mailto(address, c.confirmSubject(day, time), c.confirmBody(greeting, day, time, minutes)),
            hint: c.confirmHint(address),
          }
        : null,
    note: c.appointmentNote,
    sections: [
      {
        title: c.appointment,
        rows: [
          { label: c.date, value: day },
          { label: c.time, value: time ? c.timeValue(time) : null },
          { label: c.duration, value: c.minutes(minutes) },
        ],
      },
      { title: c.contact, rows: [{ label: c.name, value: fullName(p) }, emailRow(p, c)] },
      { title: null, rows: [{ label: c.message, value: text(p.message), block: true }] },
    ],
  };
}

function careersMail(p: Payload, c: Copy): Mail {
  const position = text(p.positionTitle);
  return {
    subject: `${c.careersKind}: ${position ?? ''}`.trim(),
    kindLabel: c.careersKind,
    title: c.careersTitle,
    lead: c.careersLead(position),
    chips: [],
    action: null,
    note: c.careersNote,
    sections: [{ title: null, rows: [{ label: c.position, value: position }] }],
  };
}

function placementMail(p: Payload, locale: Locale, c: Copy): Mail {
  const band = text(p.band);
  const confidence = c.confidences[String(p.confidence)] ?? text(p.confidence);
  const share = typeof p.answeredShare === 'number' ? `${Math.round(p.answeredShare * 100)} %` : null;
  const skills = Array.isArray(p.skillProfile) ? (p.skillProfile as { skill: string; credit: number | null; itemCount: number }[]) : [];
  const reasons = Array.isArray(p.reviewReasons) ? (p.reviewReasons as string[]) : [];
  const intake = (p.intake ?? null) as Record<string, string> | null;
  return {
    subject: `${c.placementKind}: ${c.recommendation} ${band ?? ''}`.trim(),
    kindLabel: c.placementKind,
    title: c.placementTitle,
    lead: c.placementLead(band),
    chips: [
      ...(p.speakingRequired === true ? [c.chipSpeaking] : []),
      ...(p.confidence === 'low' ? [c.chipLowConfidence] : []),
    ],
    action: null,
    note: c.placementNote,
    sections: [
      {
        title: c.result,
        rows: [
          { label: c.recommendation, value: band },
          { label: c.confidence, value: confidence },
          { label: c.confirmation, value: p.autoConfirmable === true ? c.automatic : c.byTeacher },
          { label: c.speaking, value: typeof p.speakingRequired === 'boolean' ? (p.speakingRequired ? c.yes : c.no) : null },
          { label: c.answered, value: share },
          { label: c.accessKey, value: text(p.token) },
        ],
      },
      {
        title: c.skills,
        rows: skills.map((entry) => ({
          label: c.skillNames[entry.skill] ?? entry.skill,
          value: entry.credit === null ? c.notMeasured : `${Math.round(entry.credit * 100)} % · ${c.tasks(entry.itemCount)}`,
        })),
      },
      { title: c.toCheck, rows: reasons.map((reason) => ({ label: '', value: c.reasons[reason] ?? reason, item: true })) },
      {
        title: c.intake,
        rows: intake
          ? INTAKE_QUESTIONS.map((question) => {
              const answer = intake[question.id];
              const option = question.options.find((candidate) => candidate.value === answer);
              return { label: c.intakeLabels[question.id] ?? question.label[locale], value: option ? option.label[locale] : text(answer) };
            })
          : [],
      },
    ],
  };
}

function mailFor(kind: FormKind, p: Payload, locale: Locale): Mail {
  const c = COPY[locale];
  switch (kind) {
    case 'contact':
    case 'groups':
      return contactMail(kind, p, locale, c);
    case 'course':
      return courseMail(p, locale, c);
    case 'exam':
      return examMail(p, locale, c);
    case 'appointment':
      return appointmentMail(p, locale, c);
    case 'careers':
      return careersMail(p, c);
    case 'placement':
      return placementMail(p, locale, c);
  }
}

const SOURCES: Record<FormKind, (c: Copy, p: Payload) => string> = {
  contact: (c) => c.contactSource,
  groups: (c, p) => (isCompanyTopic(text(p.topicKey)) ? c.companySource : c.groupSource),
  course: (c) => c.courseSource,
  exam: (c) => c.examSource,
  appointment: (c) => c.appointmentSource,
  careers: (c) => c.careersSource,
  placement: (c) => c.placementSource,
};

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const multiline = (value: string) => escape(value).replace(/\r?\n/g, '<br>');

const SANS = "font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;";
const SERIF = "font-family:Georgia,'Times New Roman',Times,serif;";
const INK = '#0f172a';
const BODY = '#334155';
const MUTED = '#64748b';
const RULE = '#e2e8f0';
const CANVAS = '#f4f6f9';
const ACCENT = '#009fe3';
const LINK = '#006f9f';
const TINT = '#eef7fb';

const STYLE = `
:root { color-scheme: light only; supported-color-schemes: light only; }
body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
a { color: ${LINK}; }
@media only screen and (max-width: 620px) {
  .shell { padding: 0 !important; }
  .card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
  .px { padding-left: 22px !important; padding-right: 22px !important; }
  .title { font-size: 25px !important; line-height: 32px !important; }
  .row, .row td { display: block !important; width: 100% !important; box-sizing: border-box; }
  .label { padding: 12px 0 2px !important; }
  .value { padding: 0 0 2px !important; }
  .btn, .btn td, .btn a { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box; }
}`;

function rowHtml(row: Row) {
  const value = row.value as string;
  if (row.item) {
    return `<tr><td colspan="2" style="${SANS}padding:5px 0 5px 16px;font-size:15px;line-height:23px;color:${INK};text-indent:-16px;">`
      + `<span style="color:${ACCENT};">&ndash;</span>&nbsp;&nbsp;${multiline(value)}</td></tr>`;
  }
  if (row.block) {
    return `<tr><td colspan="2" style="${SANS}padding:12px 0 6px;font-size:13px;line-height:18px;color:${MUTED};">${escape(row.label)}</td></tr>`
      + `<tr><td colspan="2" style="${SANS}padding:12px 16px;font-size:15px;line-height:24px;color:${INK};background:#f8fafc;border-left:3px solid ${ACCENT};">${multiline(value)}</td></tr>`;
  }
  const shown = row.href
    ? `<a href="${escape(row.href)}" style="color:${LINK};text-decoration:underline;">${escape(value)}</a>`
    : multiline(value);
  const detail = row.detail ? `<div style="${SANS}padding-top:3px;font-size:13px;line-height:19px;color:${MUTED};">${escape(row.detail)}</div>` : '';
  return `<tr class="row"><td class="label" valign="top" width="200" style="${SANS}width:200px;padding:7px 16px 7px 0;font-size:14px;line-height:21px;color:${MUTED};">${escape(row.label)}</td>`
    + `<td class="value" valign="top" style="${SANS}padding:7px 0;font-size:15px;line-height:22px;color:${INK};">${shown}${detail}</td></tr>`;
}

function sectionHtml(section: Section) {
  const rows = section.rows.filter((row) => row.value !== null && row.value !== '');
  if (rows.length === 0) return '';
  const heading = section.title
    ? `<div style="${SANS}padding:0 0 6px;font-size:15px;line-height:22px;font-weight:bold;color:${INK};">${escape(section.title)}</div>`
    : '';
  return `<tr><td class="px" style="padding:0 40px;"><div style="border-top:1px solid ${RULE};padding:22px 0 18px;">${heading}`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows.map(rowHtml).join('')}</table>`
    + `</div></td></tr>`;
}

function chipsHtml(chips: string[]) {
  if (chips.length === 0) return '';
  return `<div style="padding-top:14px;">${chips
    .map((chip) => `<span style="${SANS}display:inline-block;margin:0 6px 6px 0;padding:5px 11px;font-size:13px;line-height:18px;font-weight:bold;color:${LINK};background:${TINT};border-radius:999px;">${escape(chip)}</span>`)
    .join('')}</div>`;
}

function actionHtml(action: Action | null) {
  if (!action) return '';
  return `<tr><td class="px" style="padding:4px 40px 26px;">`
    + `<table role="presentation" class="btn" cellpadding="0" cellspacing="0"><tr><td bgcolor="#111827" style="border-radius:8px;">`
    + `<a href="${escape(action.href)}" style="${SANS}display:inline-block;padding:14px 26px;font-size:15px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${escape(action.label)}</a>`
    + `</td></tr></table>`
    + (action.hint ? `<div style="${SANS}padding-top:12px;font-size:13px;line-height:20px;color:${MUTED};">${escape(action.hint)}</div>` : '')
    + `</td></tr>`;
}

export function buildFormMail(kind: FormKind, payload: Payload, options: FormMailOptions) {
  const locale: Locale = payload.locale === 'en' ? 'en' : 'de';
  const c = COPY[locale];
  const mail = mailFor(kind, payload, locale);
  const reference = kind === 'placement' ? null : text(payload.requestId);
  const received = formatInstant(payload.submittedAt, locale);
  const kicker = [mail.kindLabel, received].filter(Boolean).join(' · ');

  const meta = [reference ? `${c.reference} ${reference}` : null, `${c.formLanguage}: ${c.language}`].filter(Boolean).join(' · ');
  const storage =
    options.stored === true ? escape(c.stored)
    : options.stored === false ? `<strong style="color:#d20612;">${escape(c.notStored)}</strong>`
    : '';
  // Keeps the inbox preview to the lead sentence instead of the next lines of the body.
  const preheaderPad = '&#847;&zwnj;&nbsp;'.repeat(40);

  const html = `<!doctype html><html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml"><head>`
    + `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no">`
    + `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">`
    + `<title>${escape(mail.subject)}</title><style>${STYLE}</style></head>`
    + `<body style="margin:0;padding:0;background:${CANVAS};">`
    + `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escape(mail.lead)}${preheaderPad}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CANVAS}" style="background:${CANVAS};"><tr><td class="shell" align="center" style="padding:32px 16px;">`
    + `<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0"><tr><td><![endif]-->`
    + `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border:1px solid ${RULE};border-top:4px solid ${ACCENT};border-radius:10px;">`
    + (options.test
      ? `<tr><td class="px" style="${SANS}padding:10px 40px;font-size:13px;line-height:19px;color:#7a5a00;background:#fff3da;">${escape(c.test(options.testRecipient))}</td></tr>`
      : '')
    + `<tr><td class="px" style="padding:30px 40px 0;"><img src="cid:${LOGO_CONTENT_ID}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="${escape(c.logoAlt)}" style="display:block;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;"></td></tr>`
    + `<tr><td class="px" style="padding:30px 40px 24px;">`
    + `<div style="${SANS}font-size:13px;line-height:19px;font-weight:bold;color:${LINK};">${escape(kicker)}</div>`
    + `<h1 class="title" style="${SERIF}margin:8px 0 0;font-size:28px;line-height:36px;font-weight:normal;color:${INK};">${escape(mail.title)}</h1>`
    + `<p style="${SANS}margin:12px 0 0;font-size:16px;line-height:25px;color:${BODY};">${escape(mail.lead)}</p>`
    + chipsHtml(mail.chips)
    + `</td></tr>`
    + actionHtml(mail.action)
    + (mail.note
      ? `<tr><td class="px" style="padding:0 40px 26px;"><div style="${SANS}padding:14px 16px;font-size:15px;line-height:23px;color:${INK};background:${TINT};border-radius:8px;">${escape(mail.note)}</div></td></tr>`
      : '')
    + mail.sections.map(sectionHtml).join('')
    + `<tr><td class="px" style="padding:0 40px 30px;"><div style="${SANS}border-top:1px solid ${RULE};padding-top:18px;font-size:13px;line-height:21px;color:${MUTED};">`
    + `${escape(meta)}${storage ? `<br>${storage}` : ''}</div></td></tr>`
    + `</table>`
    + `<!--[if mso]></td></tr></table><![endif]-->`
    + `<div style="${SANS}max-width:640px;margin:0 auto;padding:18px 8px 0;font-size:12px;line-height:19px;color:${MUTED};text-align:center;">`
    + `${escape(c.generated(SOURCES[kind](c, payload)))}<br>${escape(c.address)}</div>`
    + `</td></tr></table></body></html>`;

  return { subject: `${options.test ? '[TEST] ' : ''}${mail.subject}`, html };
}
