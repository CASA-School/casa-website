import { organiserCopy } from '@/config/forms/organiser-brief-copy';
import { INTAKE_QUESTIONS } from '@/config/placement/intake';
import { getSiteUrl } from '@/lib/seo';
import { isCompanyTopic, ORGANISER_CHOICES } from '@/lib/validation/contact';

import { LOGO_CONTENT_ID, LOGO_HEIGHT, LOGO_WIDTH } from './casa-logo';
import { CONFIRMATION_COPY } from './confirmation-copy';

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

type Row = { label: string; value: string | null; href?: string; detail?: string; block?: boolean; item?: boolean; mono?: boolean };
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
    address: 'CASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen',
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
    declaredLevel: 'Gewünschtes Niveau',
    courseNumbered: (n: number) => `Kurs ${n}`,
    courseLeadMany: (name: string, courses: number, exam: boolean) =>
      `${name} hat sich für ${courses === 1 ? 'einen Kurs' : `${courses} Kurse`}${exam ? ' und eine Prüfung' : ''} angemeldet.`,
    chipExam: 'Mit Prüfung',
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
    // Group organisers read „du“ (Rahman, 2026-10-08), so the confirmation greets by first name.
    confirmGreeting: (first: string | null) => (first ? `Hallo ${first},` : 'Hallo,'),
    confirmSubject: (day: string, time: string) => `Dein Beratungstermin bei CASA: ${day}, ${time} Uhr`,
    confirmBody: (greeting: string, day: string, time: string, minutes: string) =>
      `${greeting}\n\nvielen Dank für deine Anfrage. Gerne bestätige ich deinen Beratungstermin am ${day}, um ${time} Uhr (Bremer Zeit). `
      + `Wir nehmen uns etwa ${minutes} Minuten Zeit für deine Fragen und Ideen.\n\n`
      + 'So sprechen wir: [Telefon, Videolink oder bei CASA, Am Dobben 14–16, 28203 Bremen]\n\n'
      + 'Ich freue mich auf unser Gespräch.\n\nHerzliche Grüße\n',

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
    address: 'CASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen, Germany',
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
    companyTitle: 'New enquiry about in-company teaching',
    companySource: 'from the enquiry about in-company teaching',
    companyLead: (name: string, org: string | null, size: string | null) =>
      `${name}${org ? ` (${org})` : ''} is asking about German classes${size ? ` for ${size} participants` : ''}.`,
    companyReply: 'Your enquiry to CASA about in-company teaching',
    company: 'In-company teaching',
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
    declaredLevel: 'Requested level',
    courseNumbered: (n: number) => `Course ${n}`,
    courseLeadMany: (name: string, courses: number, exam: boolean) =>
      `${name} has registered for ${courses === 1 ? 'a course' : `${courses} courses`}${exam ? ' and an exam' : ''}.`,
    chipExam: 'With exam',
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
    confirmGreeting: (first: string | null) => (first ? `Hello ${first},` : 'Hello,'),
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

/** The courses and the exam a registration lists; empty for a sender that predates them. */
function registrationParts(p: Payload) {
  const courses = Array.isArray(p.courses)
    ? (p.courses as unknown[]).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
  const exam = p.exam && typeof p.exam === 'object' ? (p.exam as Record<string, unknown>) : null;
  return { courses, exam };
}

function courseMail(p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p) ?? c.name;
  const course = text(p.courseTypeLabel);
  const accommodation = p.accommodationRequired === true;
  const stayType = String(p.accommodationType ?? '');
  const allergies = accommodation ? text(p.allergies) : null;
  const { courses, exam } = registrationParts(p);
  const examName = exam ? text(exam.examTypeLabel) : null;
  const examPart = exam ? String(exam.registrationType ?? '') : '';
  // One course reads as it always did; several, or one with an exam, number their sections.
  const courseSections = courses.length > 1
    ? courses.map((item, index) => ({
        title: c.courseNumbered(index + 1),
        rows: [
          { label: c.course, value: text(item.courseTypeLabel) },
          ...optionRows(item.courseInstanceLabel, [c.dates, c.schedule, c.location], c.courseOption),
          { label: c.declaredLevel, value: text(item.level) },
        ],
      }))
    : [{
        title: c.course,
        rows: [
          { label: c.course, value: course },
          ...optionRows(p.courseInstanceLabel, [c.dates, c.schedule, c.location], c.courseOption),
          { label: c.declaredLevel, value: text(p.currentLevel) },
        ],
      }];
  // "Kursanmeldung: Maria Rossi – Intensivkurse, Spezialkurse + telc Deutsch B2"; one course reads as before.
  const courseNames = courses.length > 1 ? courses.map((item) => text(item.courseTypeLabel)).filter(Boolean).join(', ') : course;
  return {
    subject: `${c.courseKind}: ${[fullName(p), courseNames].filter(Boolean).join(' – ')}${examName ? ` + ${examName}` : ''}`,
    kindLabel: c.courseKind,
    title: c.courseTitle,
    lead: courses.length > 1 || exam ? c.courseLeadMany(name, Math.max(courses.length, 1), Boolean(exam)) : c.courseLead(name, course),
    chips: [
      ...(exam ? [c.chipExam] : []),
      ...(p.visaRequired === true ? [c.chipVisa] : []),
      ...(accommodation ? [c.chipStay[stayType] ?? c.chipStayAny] : []),
      ...(allergies ? [c.chipAllergies] : []),
    ],
    action: replyAction(p, c, c.courseReply),
    note: null,
    sections: [
      ...courseSections,
      ...(exam
        ? [{
            title: c.exam,
            rows: [
              { label: c.exam, value: examName },
              ...optionRows(exam.examSessionLabel, [c.examSession, c.location], c.examSession),
              { label: c.examPart, value: c.examParts[examPart] ?? text(exam.registrationType) },
            ],
          }]
        : []),
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
  const greeting = c.confirmGreeting(text(p.firstName));
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
    : row.mono
      ? `<span style="font-family:Menlo,Consolas,'Courier New',monospace;font-size:13px;word-break:break-all;">${escape(value)}</span>`
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

/** The branded frame both emails share: canvas, card, test line, logo, content rows, footer. */
function renderShell(input: {
  locale: Locale;
  subject: string;
  preheader: string;
  testLine: string | null;
  logoAlt: string;
  rows: string;
  footer: string;
}) {
  // Keeps the inbox preview to the preheader instead of the next lines of the body.
  const preheaderPad = '&#847;&zwnj;&nbsp;'.repeat(40);
  return `<!doctype html><html lang="${input.locale}" xmlns="http://www.w3.org/1999/xhtml"><head>`
    + `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no">`
    + `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">`
    + `<title>${escape(input.subject)}</title><style>${STYLE}</style></head>`
    + `<body style="margin:0;padding:0;background:${CANVAS};">`
    + `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escape(input.preheader)}${preheaderPad}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CANVAS}" style="background:${CANVAS};"><tr><td class="shell" align="center" style="padding:32px 16px;">`
    + `<!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0"><tr><td><![endif]-->`
    + `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border:1px solid ${RULE};border-top:4px solid ${ACCENT};border-radius:10px;">`
    + (input.testLine
      ? `<tr><td class="px" style="${SANS}padding:10px 40px;font-size:13px;line-height:19px;color:#7a5a00;background:#fff3da;">${escape(input.testLine)}</td></tr>`
      : '')
    + `<tr><td class="px" style="padding:30px 40px 0;"><img src="cid:${LOGO_CONTENT_ID}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="${escape(input.logoAlt)}" style="display:block;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;"></td></tr>`
    + input.rows
    + `</table>`
    + `<!--[if mso]></td></tr></table><![endif]-->`
    + `<div style="${SANS}max-width:640px;margin:0 auto;padding:18px 8px 0;font-size:12px;line-height:19px;color:${MUTED};text-align:center;">${input.footer}</div>`
    + `</td></tr></table></body></html>`;
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

  const rows = `<tr><td class="px" style="padding:30px 40px 24px;">`
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
    + `${escape(meta)}${storage ? `<br>${storage}` : ''}</div></td></tr>`;

  const html = renderShell({
    locale,
    subject: mail.subject,
    preheader: mail.lead,
    testLine: options.test ? c.test(options.testRecipient) : null,
    logoAlt: c.logoAlt,
    rows,
    footer: `${escape(c.generated(SOURCES[kind](c, payload)))}<br>${escape(c.address)}`,
  });

  return { subject: `${options.test ? '[TEST] ' : ''}${mail.subject}`, html };
}

/* ------------------------------------------------------------------------ */
/* The confirmation the sender receives                                     */
/* ------------------------------------------------------------------------ */

type ConfirmationKind = Exclude<FormKind, 'placement'>;

export type ConfirmationOptions = { test: boolean; intendedRecipient: string; testRecipient: string; replyInvited: boolean };

/** The contact person the appointment dialog already names in public. */
const APPOINTMENT_HOST = 'Ina Eismann';

/** The exam part as the confirmation spells it out for a candidate. */
const CONFIRMATION_EXAM_PARTS: Record<Locale, Record<string, string>> = {
  de: { full: 'Gesamte Prüfung (schriftlich und mündlich)', written: 'Nur schriftlich', oral: 'Nur mündlich' },
  en: { full: 'Full exam (written and oral)', written: 'Written exam only', oral: 'Oral exam only' },
};

/** „Do., 8. Okt.“ / "Thu 8 Oct", for a subject line. */
function formatShortDay(value: unknown, locale: Locale) {
  const match = text(value)?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
  }).format(date).replace(',', locale === 'de' ? ',' : '');
}

/**
 * A name fit to greet someone with. The confirmation goes to whatever address
 * was typed, so a "name" carrying a link, an address or digits is not printed:
 * the mail falls back to the neutral greeting instead of relaying it.
 */
function greetableName(value: unknown) {
  const raw = text(value)?.replace(/\s+/g, ' ');
  if (!raw || raw.length > 40) return null;
  const tokens = raw.split(' ');
  // Words of letters, joined by an apostrophe or hyphen, or a one-letter
  // initial with its full stop: "Anne-Marie", "O’Neill", "J.". Nothing else.
  const word = /^(?:[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*|\p{L}\.)$/u;
  // Latin mixed with another script is how lookalike dots and colons get in:
  // "wwwꓸexampleꓸde". Names in one script (佐々木, Łukasz, Nguyễn) pass.
  const mixesScripts = (token: string) => /\p{sc=Latin}/u.test(token) && !/^[\p{sc=Latin}\p{M}'’.-]+$/u.test(token);
  if (/[〇零一二三四五六七八九十百千万]{4,}/u.test(raw)) return null;
  return tokens.length <= 3 && tokens.every((token) => word.test(token) && !mixesScripts(token)) ? raw : null;
}

/** The catalogue writes ranges with a hyphen-minus; a range takes an en dash. Times first. */
const rangeDash = (value: string) =>
  value.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g, '$1–$2').replace(/\s+-\s+/g, ' – ');

/** Fills `{placeholders}`; null when any of them has no value, so the caller drops the line. */
function fill(template: string, values: Record<string, string | null>) {
  let missing = false;
  const result = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (!value) missing = true;
    return value ?? '';
  });
  return missing ? null : result;
}

/**
 * Only values the server produced or checked: catalogue labels, the validated
 * appointment slot, the reference, enum readings. Never the sender's free text.
 */
function confirmationValues(kind: ConfirmationKind, p: Payload, locale: Locale): Record<string, string | null> {
  const c = COPY[locale];
  const first = greetableName(p.firstName);
  const last = greetableName(p.lastName);
  const course = text(p.courseInstanceLabel)?.split(' | ').map((part) => part.trim()) ?? [];
  const session = text(p.examSessionLabel)?.split(' | ').map((part) => part.trim()) ?? [];
  const brief = (p.organiserBrief ?? {}) as Record<string, unknown>;
  const size = typeof brief.groupSize === 'number' && Number.isInteger(brief.groupSize) ? String(brief.groupSize) : null;
  const stay = p.accommodationRequired === true ? (c.accommodationTypes[String(p.accommodationType)] ?? null) : null;
  const site = getSiteUrl();
  const formal = (kind === 'course' || kind === 'exam') && last
    ? ({ de: { ms: 'Frau', mr: 'Herr' }, en: { ms: 'Ms', mr: 'Mr' } } as const)[locale][String(p.salutation) as 'ms' | 'mr']
    : undefined;
  return {
    reference: text(p.requestId),
    firstName: first,
    lastName: last,
    // "Ms Rossi" where the form asked for a salutation. Learners read "Hallo
    // {firstName}," / "Hello {firstName},", group organisers too; `{name}` greets
    // the „Sie“ kind, companies ("Guten Tag Jonas Weber," / "Dear Jonas Weber,").
    // The joined name has to pass the same check as each part, or the first name alone is used.
    name: formal ? `${formal} ${last}` : (first && last ? greetableName(`${first} ${last}`) : null) ?? first,
    phone: '+49 421 460 414 30',
    siteUrl: site,
    siteHost: site.replace(/^https?:\/\//, ''),
    course: kind === 'course' ? text(p.courseTypeLabel) : null,
    courseLevel: kind === 'course' ? text(p.currentLevel) : null,
    // Every course after the first (further courses, the terms of a learning path), one line each.
    moreCourses: kind === 'course'
      ? registrationParts(p).courses.slice(1).map(courseLine).filter(Boolean).join('\n') || null
      : null,
    addedExam: kind === 'course' ? examLine(registrationParts(p).exam, locale) : null,
    dates: course.length === 3 ? rangeDash(course[0]) : null,
    // A term without stored days reads "Days to be confirmed": leave the row out rather than print it.
    schedule: course.length === 3 && !/to be confirmed|noch festgelegt|wird bestätigt/i.test(course[1]) ? rangeDash(course[1]) : null,
    location: course.length === 3 ? course[2] : session.length === 2 ? session[1] : null,
    accommodation: stay,
    exam: kind === 'exam' ? text(p.examTypeLabel) : null,
    examDate: session.length === 2 ? rangeDash(session[0]) : null,
    examPart: kind === 'exam' ? (CONFIRMATION_EXAM_PARTS[locale][String(p.registrationType)] ?? null) : null,
    day: kind === 'appointment' ? formatDay(p.localDate, locale, true) : null,
    dayShort: kind === 'appointment' ? formatShortDay(p.localDate, locale) : null,
    time: kind === 'appointment' ? text(p.localTime) : null,
    duration: kind === 'appointment' && typeof p.durationMinutes === 'number' ? String(p.durationMinutes) : null,
    contactPerson: kind === 'appointment' ? APPOINTMENT_HOST : null,
    position: kind === 'careers' ? text(p.positionTitle) : null,
    groupSize: size,
  };
}

/** "Abendkurse · B1.2 · 2.11.2026 – 17.12.2026": one more course, in the confirmation summary. */
function courseLine(item: Record<string, unknown> | undefined) {
  if (!item) return null;
  const dates = text(item.courseInstanceLabel)?.split(' | ')[0]?.trim();
  return [text(item.courseTypeLabel), text(item.level), dates ? rangeDash(dates) : null].filter(Boolean).join(' · ') || null;
}

/** "telc Deutsch B2 · 13.11.2026 · Gesamte Prüfung": an exam booked with the courses. */
function examLine(exam: Record<string, unknown> | null, locale: Locale) {
  if (!exam) return null;
  const date = text(exam.examSessionLabel)?.split(' | ')[0]?.trim();
  const part = CONFIRMATION_EXAM_PARTS[locale][String(exam.registrationType)] ?? null;
  return [text(exam.examTypeLabel), date ? rangeDash(date) : null, part].filter(Boolean).join(' · ') || null;
}

/** CASA's own addresses and phone number in the copy as links; a full stop after a URL stays text. */
function linkify(html: string) {
  return html
    .replace(/https?:\/\/[^\s<]+?(?=[.,;:!?)]?(?:\s|<|$))/g, (url) =>
      `<a href="${url}" style="color:${LINK};text-decoration:underline;">${url.replace(/^https?:\/\//, '')}</a>`)
    .replace(/\+49 421 460 414 3-?0/g, (shown) =>
      `<a href="tel:+4942146041430" style="color:${LINK};text-decoration:underline;white-space:nowrap;">${shown}</a>`);
}

function paragraph(value: string, style = '') {
  return `<p style="${SANS}margin:0 0 14px;font-size:16px;line-height:25px;color:${BODY};${style}">${linkify(multiline(value))}</p>`;
}

export function buildConfirmationMail(kind: ConfirmationKind, payload: Payload, options: ConfirmationOptions) {
  const locale: Locale = payload.locale === 'en' ? 'en' : 'de';
  const variant = kind === 'groups' && isCompanyTopic(text(payload.topicKey)) ? 'company' : '';
  const entry =
    CONFIRMATION_COPY.kinds.find((candidate) => candidate.kind === kind && candidate.variant === variant)
    ?? CONFIRMATION_COPY.kinds.find((candidate) => candidate.kind === kind)!;
  const copy = entry[locale];
  // Learners and group organisers read „du“ and their first name; companies keep
  // „Sie“ and a formal greeting, in English too (confirmation-copy.ts).
  const shared = 'address' in entry && entry.address === 'Sie'
    ? CONFIRMATION_COPY.sharedSie[locale]
    : CONFIRMATION_COPY.shared[locale];
  const values = confirmationValues(kind, payload, locale);
  const line = (template: string, fallback: string | null = null) => fill(template, values) ?? fallback;

  // Without its date, the appointment subject keeps its first half: „Ihre Terminanfrage bei CASA“.
  const subject = line(copy.subject) ?? copy.subject.split(':')[0].trim();
  const greeting = line(shared.greetingNamed, shared.greetingNeutral)!;
  const rows = copy.summaryRows
    // `{moreCourses}` is one row per further course, under the same label.
    .flatMap((row) => row.value === '{moreCourses}'
      ? (values.moreCourses ?? '').split('\n').filter(Boolean).map((value) => ({ label: row.label as string, value, mono: false }))
      : [{ label: row.label as string, value: line(row.value), mono: row.value === '{reference}' }])
    .filter((row): row is { label: string; value: string; mono: boolean } => Boolean(row.value));
  const steps = copy.nextSteps.map((step) => line(step.text)).filter((step): step is string => Boolean(step));
  const paragraphs = (value: string | null) =>
    value ? value.split(/\n\s*\n/).map((part) => paragraph(part.trim())).join('') : '';

  // The tint sits on a table cell: desktop Outlook drops a padded, tinted div.
  const summary = rows.length
    ? `<tr><td class="px" style="padding:0 40px 24px;">`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">`
      + `<tr><td bgcolor="${TINT}" style="background:${TINT};border-radius:10px;padding:18px 20px;">`
      + `<div style="${SANS}margin:0 0 6px;font-size:15px;line-height:22px;font-weight:bold;color:${INK};">${escape(copy.summaryTitle)}</div>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">`
      + rows.map((row) => rowHtml(row)).join('')
      + `</table></td></tr></table></td></tr>`
    : '';
  const next = steps.length
    ? `<tr><td class="px" style="padding:0 40px 10px;">`
      + `<div style="${SANS}padding:0 0 8px;font-size:15px;line-height:22px;font-weight:bold;color:${INK};">${escape(copy.nextStepsTitle)}</div>`
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">`
      + steps.map((step, index) =>
          `<tr><td valign="top" width="30" style="${SANS}width:30px;padding:4px 0;font-size:15px;line-height:23px;font-weight:bold;color:${ACCENT};">${index + 1}.</td>`
          + `<td valign="top" style="${SANS}padding:4px 0;font-size:15px;line-height:23px;color:${INK};">${linkify(multiline(step))}</td></tr>`).join('')
      + `</table></td></tr>`
    : '';

  const body = `<tr><td class="px" style="padding:30px 40px 8px;">`
    + `<h1 class="title" style="${SERIF}margin:0 0 18px;font-size:28px;line-height:36px;font-weight:normal;color:${INK};">${escape(line(copy.heading) ?? copy.heading)}</h1>`
    + paragraph(greeting)
    + paragraphs(line(copy.intro))
    + `</td></tr>`
    + summary
    + next
    + `<tr><td class="px" style="padding:10px 40px 30px;">`
    + paragraphs(line(copy.closing))
    // Exam and appointment receipts already ask for a reply where it matters (a typo, a time that does not suit).
    + (options.replyInvited && !('replyNote' in entry && entry.replyNote === false) ? paragraph(shared.replyNote) : '')
    + paragraph(shared.signoff, 'margin:22px 0 0;')
    + paragraph(shared.team, 'margin:0;font-weight:bold;color:' + INK + ';')
    + `</td></tr>`;

  const testLine = options.test
    ? (locale === 'de'
      ? `Testbetrieb: Diese Bestätigung ginge an ${options.intendedRecipient}. Sie wurde stattdessen an ${options.testRecipient} gesendet.`
      : `Test mode: this confirmation would go to ${options.intendedRecipient}. It was sent to ${options.testRecipient} instead.`)
    : null;

  const html = renderShell({
    locale,
    subject,
    preheader: line(copy.preheader) ?? copy.preheader,
    testLine,
    logoAlt: COPY[locale].logoAlt,
    rows: body,
    footer: linkify(escape(line(shared.footer) ?? shared.footer).replace(/\n/g, '<br>')),
  });

  return {
    subject: `${options.test ? '[TEST] ' : ''}${subject}`,
    html,
    replyName: locale === 'de' ? 'CASA Internationale Sprachschule' : 'CASA International Language School',
  };
}
