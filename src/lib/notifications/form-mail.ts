import { organiserCopy } from '@/config/forms/organiser-brief-copy';
import { INTAKE_QUESTIONS } from '@/config/placement/intake';
import { isCompanyTopic, ORGANISER_CHOICES } from '@/lib/validation/contact';

/**
 * The notification email CASA staff receive for each public form.
 *
 * Written in the language of the form that was sent, so a German enquiry reads
 * German and an English one English. Every value is escaped; nothing from the
 * payload reaches the HTML unescaped. The layout is tables and inline styles
 * because Outlook renders mail with Word's engine, which ignores most CSS.
 */

export type FormKind = 'contact' | 'groups' | 'course' | 'exam' | 'careers' | 'placement' | 'appointment';
type Locale = 'de' | 'en';
type Payload = Record<string, unknown>;

type Row = { label: string; value: string | null; href?: string; block?: boolean; item?: boolean };
type Section = { title: string | null; rows: Row[] };
type Mail = { subject: string; title: string; summary: string | null; note: string | null; sections: Section[] };

export type FormMailOptions = { test: boolean; stored?: boolean; testRecipient: string };

const COPY = {
  de: {
    language: 'Deutsch',
    yes: 'Ja',
    no: 'Nein',
    test: (to: string) => `Test: Alle Formular-E-Mails gehen derzeit an ${to}.`,
    replyHint: (address: string) => `Mit „Antworten“ schreiben Sie direkt an ${address}.`,
    reference: 'Referenz',
    received: 'Eingegangen',
    formLanguage: 'Sprache',
    stored: 'Auch im Arbeitsbereich gespeichert.',
    notStored: 'Nicht im Arbeitsbereich gespeichert. Diese E-Mail ist der einzige Eintrag.',
    sender: 'CASA · Website',
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
    // contact and groups
    contactTitle: 'Neue Kontaktanfrage',
    groupTitle: 'Neue Gruppenanfrage',
    companyTitle: 'Neue Anfrage für Firmenunterricht',
    topic: 'Thema',
    enquiry: 'Anfrage',
    group: 'Gruppe',
    company: 'Firmenunterricht',
    contactSubject: 'Kontaktanfrage',
    groupSubject: 'Gruppenanfrage',
    companySubject: 'Firmenanfrage',
    people: (n: string) => `${n} Personen`,
    // course
    courseTitle: 'Neue Kursanmeldung',
    courseSubject: 'Kursanmeldung',
    course: 'Kurs',
    courseOption: 'Termin',
    declaredLevel: 'Eigenes Niveau',
    visaAndStay: 'Visum und Unterkunft',
    visa: 'Visum',
    visaNeeded: 'Wird benötigt',
    visaNotNeeded: 'Nicht benötigt',
    accommodation: 'Unterkunft',
    accommodationNone: 'Nicht gewünscht',
    accommodationTypes: { host: 'Gastfamilie', flat: 'WG' } as Record<string, string>,
    allergies: 'Allergien',
    allergyConsent: 'mit Einwilligung zur Weitergabe an die Unterkunft',
    notes: 'Hinweise',
    // exam
    examTitle: 'Neue Prüfungsanmeldung',
    examSubject: 'Prüfungsanmeldung',
    exam: 'Prüfung',
    examSession: 'Termin',
    examPart: 'Prüfungsteil',
    examParts: { full: 'Vollprüfung', written: 'Nur schriftlich', oral: 'Nur mündlich' } as Record<string, string>,
    officialName: 'Name wie im Ausweis',
    confirmed: 'Bestätigt',
    // appointment
    appointmentTitle: 'Neue Terminanfrage',
    appointmentSubject: 'Terminanfrage',
    appointmentKind: 'Gruppenberatung',
    appointment: 'Termin',
    date: 'Datum',
    time: 'Uhrzeit',
    timeValue: (t: string) => `${t} Uhr (Bremer Zeit)`,
    subjectTime: (t: string) => `${t} Uhr`,
    duration: 'Dauer',
    minutes: (n: string) => `${n} Minuten`,
    appointmentNote: (first: string) =>
      `Bitte bestätigen Sie den Termin mit einer Antwort an ${first}. Bis dahin ist die Zeit für andere Anfragen gesperrt.`,
    // careers
    careersTitle: 'Neue Bewerbung',
    careersSubject: 'Bewerbung',
    position: 'Stelle',
    careersNote: 'Bewerbung und Lebenslauf finden Sie im Arbeitsbereich unter „Bewerbungen“.',
    // placement
    placementTitle: 'Einstufungstest abgeschlossen',
    placementSubject: 'Einstufungstest',
    recommendation: 'Empfehlung',
    confidence: 'Sicherheit',
    confidences: { high: 'hoch', medium: 'mittel', low: 'niedrig' } as Record<string, string>,
    result: 'Ergebnis',
    confirmation: 'Bestätigung',
    byTeacher: 'Durch eine Lehrkraft',
    automatic: 'Automatisch möglich',
    speaking: 'Gespräch nötig',
    answered: 'Beantwortet',
    accessKey: 'Zugangsschlüssel',
    skills: 'Fertigkeiten',
    skillNames: { language_use: 'Sprachgebrauch', reading: 'Lesen', listening: 'Hören' } as Record<string, string>,
    notMeasured: 'nicht geprüft',
    tasks: (n: number) => `${n} ${n === 1 ? 'Aufgabe' : 'Aufgaben'}`,
    toCheck: 'Zu prüfen',
    intake: 'Einstiegsfragen',
    intakeLabels: { priorLearning: 'Bisher gelernt', goal: 'Ziel', lastContact: 'Zuletzt regelmäßig Deutsch' } as Record<string, string>,
    placementNote: 'Die Empfehlung prüfen Sie im Arbeitsbereich unter „Einstufungstests“.',
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
      shadow_mode: 'Pilotbetrieb: jedes Ergebnis ist eine Empfehlung für das Team, keine Einstufung.',
    } as Record<string, string>,
  },
  en: {
    language: 'English',
    yes: 'Yes',
    no: 'No',
    test: (to: string) => `Test: all form emails currently go to ${to}.`,
    replyHint: (address: string) => `Reply to write straight to ${address}.`,
    reference: 'Reference',
    received: 'Received',
    formLanguage: 'Language',
    stored: 'Also stored in the staff workspace.',
    notStored: 'Not stored in the staff workspace. This email is the only record.',
    sender: 'CASA · Website',
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
    contactTitle: 'New contact enquiry',
    groupTitle: 'New group enquiry',
    companyTitle: 'New company training enquiry',
    topic: 'Topic',
    enquiry: 'Enquiry',
    group: 'Group',
    company: 'Company training',
    contactSubject: 'Contact enquiry',
    groupSubject: 'Group enquiry',
    companySubject: 'Company enquiry',
    people: (n: string) => `${n} people`,
    courseTitle: 'New course registration',
    courseSubject: 'Course registration',
    course: 'Course',
    courseOption: 'Dates',
    declaredLevel: 'Own level',
    visaAndStay: 'Visa and accommodation',
    visa: 'Visa',
    visaNeeded: 'Needed',
    visaNotNeeded: 'Not needed',
    accommodation: 'Accommodation',
    accommodationNone: 'Not requested',
    accommodationTypes: { host: 'Host family', flat: 'Shared flat' } as Record<string, string>,
    allergies: 'Allergies',
    allergyConsent: 'consent given to share with the accommodation',
    notes: 'Notes',
    examTitle: 'New exam registration',
    examSubject: 'Exam registration',
    exam: 'Exam',
    examSession: 'Date',
    examPart: 'Exam part',
    examParts: { full: 'Full exam', written: 'Written part only', oral: 'Oral part only' } as Record<string, string>,
    officialName: 'Name as on ID',
    confirmed: 'Confirmed',
    appointmentTitle: 'New appointment request',
    appointmentSubject: 'Appointment request',
    appointmentKind: 'Group consultation',
    appointment: 'Appointment',
    date: 'Date',
    time: 'Time',
    timeValue: (t: string) => `${t} (Bremen time)`,
    subjectTime: (t: string) => t,
    duration: 'Duration',
    minutes: (n: string) => `${n} minutes`,
    appointmentNote: (first: string) =>
      `Please confirm the appointment by replying to ${first}. Until then the time is blocked for other requests.`,
    careersTitle: 'New job application',
    careersSubject: 'Job application',
    position: 'Position',
    careersNote: 'The application and CV are in the workspace under Applications.',
    placementTitle: 'Placement test completed',
    placementSubject: 'Placement test',
    recommendation: 'Recommendation',
    confidence: 'Confidence',
    confidences: { high: 'high', medium: 'medium', low: 'low' } as Record<string, string>,
    result: 'Result',
    confirmation: 'Confirmation',
    byTeacher: 'By a teacher',
    automatic: 'Can be automatic',
    speaking: 'Conversation needed',
    answered: 'Answered',
    accessKey: 'Access key',
    skills: 'Skills',
    skillNames: { language_use: 'Language use', reading: 'Reading', listening: 'Listening' } as Record<string, string>,
    notMeasured: 'not tested',
    tasks: (n: number) => `${n} ${n === 1 ? 'task' : 'tasks'}`,
    toCheck: 'To check',
    intake: 'Opening questions',
    intakeLabels: { priorLearning: 'Learned so far', goal: 'Goal', lastContact: 'Last used German regularly' } as Record<string, string>,
    placementNote: 'Review the recommendation in the workspace under Placement tests.',
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

function personRows(p: Payload, locale: Locale, c: Copy, extra: Row[] = []): Section {
  const email = text(p.email);
  const phone = text(p.phone);
  return {
    title: c.person,
    rows: [
      { label: c.salutation, value: c.salutations[String(p.salutation)] ?? text(p.salutation) },
      { label: c.name, value: fullName(p) },
      { label: c.birthDate, value: formatDay(p.birthDate, locale) },
      { label: c.nationality, value: text(p.nationality) },
      { label: c.email, value: email, href: email ? `mailto:${email}` : undefined },
      { label: c.phone, value: phone, href: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined },
      ...extra,
    ],
  };
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
  const name = fullName(p);
  const topic = text(p.topic);
  const company = kind === 'groups' && isCompanyTopic(text(p.topicKey));
  const brief = kind === 'groups' ? briefSection(p, locale, company ? c.company : c.group) : null;
  const briefValues = (p.organiserBrief ?? {}) as Record<string, unknown>;
  const organisation = text(briefValues.organisationName);
  const size = briefValues.groupSize ? c.people(String(briefValues.groupSize)) : null;
  const email = text(p.email);
  const subject =
    kind === 'contact'
      ? `${c.contactSubject}: ${[topic, name].filter(Boolean).join(' – ')}`
      : `${company ? c.companySubject : c.groupSubject}: ${[organisation ?? name, size].filter(Boolean).join(' · ')}`;
  return {
    subject,
    title: kind === 'contact' ? c.contactTitle : company ? c.companyTitle : c.groupTitle,
    summary: [organisation, name, kind === 'contact' ? topic : size].filter(Boolean).join(' · ') || null,
    note: null,
    sections: [
      { title: c.enquiry, rows: [{ label: c.topic, value: topic }, { label: c.message, value: text(p.message), block: true }] },
      ...(brief ? [brief] : []),
      { title: c.contact, rows: [{ label: c.name, value: name }, { label: c.email, value: email, href: email ? `mailto:${email}` : undefined }] },
    ],
  };
}

function courseMail(p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p);
  const course = text(p.courseTypeLabel);
  const option = text(p.courseInstanceLabel)?.split(' | ').join(' · ') ?? null;
  const accommodation = p.accommodationRequired === true;
  const allergies = accommodation ? text(p.allergies) : null;
  return {
    subject: `${c.courseSubject}: ${[name, course].filter(Boolean).join(' – ')}`,
    title: c.courseTitle,
    summary: [name, course].filter(Boolean).join(' · ') || null,
    note: null,
    sections: [
      {
        title: c.course,
        rows: [
          { label: c.course, value: course },
          { label: c.courseOption, value: option },
          { label: c.declaredLevel, value: text(p.currentLevel) },
        ],
      },
      personRows(p, locale, c),
      {
        title: c.visaAndStay,
        rows: [
          { label: c.visa, value: p.visaRequired === true ? c.visaNeeded : c.visaNotNeeded },
          {
            label: c.accommodation,
            value: accommodation ? (c.accommodationTypes[String(p.accommodationType)] ?? c.yes) : c.accommodationNone,
          },
          { label: c.allergies, value: allergies ? `${allergies} (${c.allergyConsent})` : null },
          { label: c.notes, value: text(p.notes), block: true },
        ],
      },
    ],
  };
}

function examMail(p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p);
  const exam = text(p.examTypeLabel);
  return {
    subject: `${c.examSubject}: ${[name, exam].filter(Boolean).join(' – ')}`,
    title: c.examTitle,
    summary: [name, exam].filter(Boolean).join(' · ') || null,
    note: null,
    sections: [
      {
        title: c.exam,
        rows: [
          { label: c.exam, value: exam },
          { label: c.examSession, value: text(p.examSessionLabel)?.split(' | ').join(' · ') ?? null },
          { label: c.examPart, value: c.examParts[String(p.registrationType)] ?? text(p.registrationType) },
        ],
      },
      personRows(p, locale, c, [{ label: c.officialName, value: p.officialNameConfirmed === true ? c.confirmed : null }]),
    ],
  };
}

function appointmentMail(p: Payload, locale: Locale, c: Copy): Mail {
  const name = fullName(p);
  const day = formatDay(p.localDate, locale, true);
  const time = text(p.localTime);
  const email = text(p.email);
  const when = [day, time ? c.timeValue(time) : null].filter(Boolean).join(', ');
  return {
    subject: `${c.appointmentSubject}: ${[name, [day, time ? c.subjectTime(time) : null].filter(Boolean).join(', ')].filter(Boolean).join(' – ')}`,
    title: c.appointmentTitle,
    summary: [c.appointmentKind, when].filter(Boolean).join(' · '),
    note: c.appointmentNote(text(p.firstName) ?? name ?? ''),
    sections: [
      {
        title: c.appointment,
        rows: [
          { label: c.date, value: day },
          { label: c.time, value: time ? c.timeValue(time) : null },
          { label: c.duration, value: p.durationMinutes ? c.minutes(String(p.durationMinutes)) : null },
        ],
      },
      { title: c.contact, rows: [{ label: c.name, value: name }, { label: c.email, value: email, href: email ? `mailto:${email}` : undefined }] },
      { title: null, rows: [{ label: c.message, value: text(p.message), block: true }] },
    ],
  };
}

function careersMail(p: Payload, c: Copy): Mail {
  const position = text(p.positionTitle);
  return {
    subject: `${c.careersSubject}: ${position ?? ''}`.trim(),
    title: c.careersTitle,
    summary: position,
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
    subject: `${c.placementSubject}: ${c.recommendation} ${band ?? ''}`.trim(),
    title: c.placementTitle,
    summary: [band ? `${c.recommendation} ${band}` : null, confidence ? `${c.confidence} ${confidence}` : null].filter(Boolean).join(' · ') || null,
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
      {
        title: c.toCheck,
        rows: reasons.map((reason) => ({ label: '', value: c.reasons[reason] ?? reason, item: true })),
      },
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

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const multiline = (value: string) => escape(value).replace(/\r?\n/g, '<br>');

const FONT = "font-family:Arial,'Segoe UI',Helvetica,sans-serif;";
const INK = '#0f172a';
const MUTED = '#64748b';
const RULE = '#e2e8f0';
const LINK = '#006f9f';

function rowHtml(row: Row) {
  const value = row.value as string;
  if (row.item) {
    return `<tr><td colspan="2" style="${FONT}padding:4px 0 4px 14px;font-size:14px;line-height:1.5;color:${INK};text-indent:-14px;">&ndash;&nbsp;&nbsp;${multiline(value)}</td></tr>`;
  }
  if (row.block) {
    return `<tr><td colspan="2" style="${FONT}padding:8px 0 0;font-size:13px;color:${MUTED};">${escape(row.label)}</td></tr>`
      + `<tr><td colspan="2" style="${FONT}padding:6px 12px 10px;font-size:14px;line-height:1.55;color:${INK};background:#f8fafc;border-left:3px solid ${RULE};">${multiline(value)}</td></tr>`;
  }
  const shown = row.href
    ? `<a href="${escape(row.href)}" style="color:${LINK};text-decoration:underline;">${escape(value)}</a>`
    : multiline(value);
  return `<tr><td valign="top" width="38%" style="${FONT}padding:5px 12px 5px 0;font-size:13px;line-height:1.45;color:${MUTED};">${escape(row.label)}</td>`
    + `<td valign="top" style="${FONT}padding:5px 0;font-size:14px;line-height:1.45;color:${INK};">${shown}</td></tr>`;
}

function sectionHtml(section: Section) {
  const rows = section.rows.filter((row) => row.value !== null && row.value !== '');
  if (rows.length === 0) return '';
  const heading = section.title
    ? `<div style="${FONT}font-size:13px;font-weight:bold;color:${INK};padding:0 0 6px;">${escape(section.title)}</div>`
    : '';
  return `<tr><td style="padding:18px 28px 0;"><div style="border-top:1px solid ${RULE};padding-top:16px;">${heading}`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows.map(rowHtml).join('')}</table>`
    + `</div></td></tr>`;
}

export function buildFormMail(kind: FormKind, payload: Payload, options: FormMailOptions) {
  const locale: Locale = payload.locale === 'en' ? 'en' : 'de';
  const c = COPY[locale];
  const mail = mailFor(kind, payload, locale);
  const email = text(payload.email);
  const reference = kind === 'placement' ? null : text(payload.requestId);
  const received = formatInstant(payload.submittedAt, locale);

  const meta = [
    reference ? `${c.reference} ${reference}` : null,
    received ? `${c.received} ${received}` : null,
    `${c.formLanguage}: ${c.language}`,
  ].filter(Boolean).join(' · ');
  const storage =
    options.stored === true ? escape(c.stored)
    : options.stored === false ? `<strong style="color:#d20612;">${escape(c.notStored)}</strong>`
    : '';

  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(mail.subject)}</title></head>`
    + `<body style="margin:0;padding:0;background:#f1f5f9;">`
    + (mail.summary ? `<div style="display:none;max-height:0;overflow:hidden;">${escape(mail.summary)}</div>` : '')
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;">`
    + `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${RULE};border-radius:8px;">`
    + (options.test
      ? `<tr><td style="${FONT}padding:10px 28px;font-size:13px;color:#7a5a00;background:#fff3da;border-radius:8px 8px 0 0;">${escape(c.test(options.testRecipient))}</td></tr>`
      : '')
    + `<tr><td style="${FONT}padding:24px 28px 0;">`
    + `<div style="font-size:12px;color:${MUTED};">${escape(c.sender)}</div>`
    + `<h1 style="${FONT}margin:6px 0 0;font-size:20px;line-height:1.3;font-weight:bold;color:${INK};">${escape(mail.title)}</h1>`
    + (mail.summary ? `<p style="${FONT}margin:6px 0 0;font-size:15px;line-height:1.45;color:#334155;">${escape(mail.summary)}</p>` : '')
    + (email ? `<p style="${FONT}margin:10px 0 0;font-size:13px;color:${MUTED};">${escape(c.replyHint(email))}</p>` : '')
    + `</td></tr>`
    + (mail.note
      ? `<tr><td style="padding:16px 28px 0;"><div style="${FONT}padding:12px 14px;font-size:14px;line-height:1.5;color:${INK};background:#eef7fb;border-left:3px solid ${LINK};">${escape(mail.note)}</div></td></tr>`
      : '')
    + mail.sections.map(sectionHtml).join('')
    + `<tr><td style="${FONT}padding:20px 28px 24px;"><div style="border-top:1px solid ${RULE};padding-top:14px;font-size:12px;line-height:1.6;color:${MUTED};">${escape(meta)}${storage ? `<br>${storage}` : ''}</div></td></tr>`
    + `</table></td></tr></table></body></html>`;

  return { subject: `${options.test ? '[TEST] ' : ''}${mail.subject}`, html };
}
