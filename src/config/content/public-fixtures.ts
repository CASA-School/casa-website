import type {
  ContentLocale,
  CourseInstanceRow,
  CourseTypeRow,
  ExamSessionRow,
  ExamTypeRow,
  FaqViewItem,
  NewsViewItem,
} from '@/lib/content/types';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const UPDATED_AT = '2026-01-01T00:00:00.000Z';

const COURSE_TYPES: CourseTypeRow[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    slug: 'intensive-german',
    name: 'Intensive German',
    format: 'Intensive',
    level_min: 'A1',
    level_max: 'C1',
    lessons_per_week: 20,
    default_price: 520,
    pricing_mode: 'from',
    visa_eligible: true,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    slug: 'evening-german',
    name: 'Evening German',
    format: 'Evening',
    level_min: 'A2',
    level_max: 'C1',
    lessons_per_week: 4,
    default_price: 476,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    slug: 'special-courses',
    name: 'Special Courses',
    format: 'Modular',
    level_min: 'A2',
    level_max: 'C1',
    lessons_per_week: 2,
    default_price: 192,
    pricing_mode: 'fixed',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    slug: 'medical-german',
    name: 'German for Medical',
    format: 'Professional',
    level_min: 'B2',
    level_max: 'C1',
    lessons_per_week: 4,
    default_price: 400,
    pricing_mode: 'fixed',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    slug: 'bildungszeit',
    name: 'Bildungszeit German',
    format: 'Intensive Block',
    level_min: 'A2',
    level_max: 'C1',
    lessons_per_week: 40,
    default_price: 280,
    pricing_mode: 'from',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    slug: 'in-company',
    name: 'Firmenunterricht',
    format: 'Custom Corporate',
    level_min: 'A1',
    level_max: 'C1',
    lessons_per_week: 4,
    default_price: 0,
    pricing_mode: 'on_request',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    slug: 'exam-preparation',
    name: 'Exam Preparation',
    format: 'Exam Prep',
    level_min: 'B1',
    level_max: 'C1',
    lessons_per_week: 10,
    default_price: 520,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    slug: 'german-for-groups',
    name: 'German for Groups',
    format: 'Group Package',
    level_min: 'A1',
    level_max: 'C1',
    lessons_per_week: 20,
    default_price: 0,
    pricing_mode: 'on_request',
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    slug: 'university-prep',
    name: 'University Preparation',
    format: 'Academic German',
    level_min: 'B2',
    level_max: 'C1',
    lessons_per_week: 14,
    default_price: 860,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000010',
    slug: 'business-german',
    name: 'Business German',
    format: 'Professional',
    level_min: 'B1',
    level_max: 'C1',
    lessons_per_week: 8,
    default_price: 540,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000011',
    slug: 'summer-intensive',
    name: 'Summer Intensive',
    format: 'Seasonal Intensive',
    level_min: 'A1',
    level_max: 'B2',
    lessons_per_week: 18,
    default_price: 690,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
  {
    id: '10000000-0000-4000-8000-000000000012',
    slug: 'integration-german',
    name: 'Integration German',
    format: 'Integration',
    level_min: 'A1',
    level_max: 'B1',
    lessons_per_week: 12,
    default_price: 490,
    currency: 'EUR',
    is_active: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  },
];

const EXAM_TYPES: ExamTypeRow[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    code: 'telc_b2',
    name: 'telc Deutsch B2',
    level: 'B2',
    default_fee: 190,
    currency: 'EUR',
    is_active: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    code: 'telc_c1_hochschule',
    name: 'telc Deutsch C1 Hochschule',
    level: 'C1',
    default_fee: 210,
    currency: 'EUR',
    is_active: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    code: 'testdaf',
    name: 'TestDaF',
    level: 'B2-C1',
    default_fee: 215,
    currency: 'EUR',
    is_active: true,
  },
];

function courseTypeId(slug: string) {
  const courseType = COURSE_TYPES.find((item) => item.slug === slug);
  if (!courseType) {
    throw new Error(`Missing fallback course type for ${slug}`);
  }

  return courseType.id;
}

function examTypeId(code: string) {
  const examType = EXAM_TYPES.find((item) => item.code === code);
  if (!examType) {
    throw new Error(`Missing fallback exam type for ${code}`);
  }

  return examType.id;
}

function courseInstance(
  idSuffix: string,
  slug: string,
  startDate: string,
  endDate: string,
  schedule: CourseInstanceRow['schedule'],
  capacity = 16,
  location = 'CASA Bremen - Am Dobben'
): CourseInstanceRow {
  return {
    id: `30000000-0000-4000-8000-${idSuffix}`,
    course_type_id: courseTypeId(slug),
    start_date: startDate,
    end_date: endDate,
    capacity,
    schedule,
    location,
    status: 'scheduled',
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  };
}

function examSession(
  idSuffix: string,
  code: string,
  startsAt: string,
  endsAt: string,
  registrationDeadline: string,
  capacity = 28
): ExamSessionRow {
  return {
    id: `40000000-0000-4000-8000-${idSuffix}`,
    exam_type_id: examTypeId(code),
    starts_at: startsAt,
    ends_at: endsAt,
    registration_deadline: registrationDeadline,
    capacity,
    fee_override: null,
    status: 'scheduled',
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
  };
}

function buildCourseInstances(): CourseInstanceRow[] {
  const intensiveMorning = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-12:30' };
  const intensiveAfternoon = { days: ['Mon', 'Tue', 'Wed', 'Thu'], time: '13:00-17:30' };
  const eveningMondayWednesday = { days: ['Mon', 'Wed'], time: '18:30-20:00' };
  const eveningTuesdayThursday = { days: ['Tue', 'Thu'], time: '18:30-20:00' };

  return [
    courseInstance('000000010001', 'intensive-german', '2026-06-29', '2026-08-28', intensiveMorning),
    courseInstance('000000010002', 'intensive-german', '2026-08-31', '2026-10-23', intensiveMorning),
    courseInstance('000000010003', 'intensive-german', '2026-10-26', '2026-12-18', intensiveMorning),
    courseInstance('000000010004', 'intensive-german', '2026-08-03', '2026-09-24', intensiveAfternoon),
    courseInstance('000000010005', 'intensive-german', '2026-09-28', '2026-11-19', intensiveAfternoon),
    courseInstance('000000010006', 'intensive-german', '2026-11-23', '2027-01-28', intensiveAfternoon),
    courseInstance('000000020001', 'evening-german', '2026-08-24', '2026-12-16', eveningMondayWednesday),
    courseInstance('000000020002', 'evening-german', '2026-08-25', '2026-12-17', eveningTuesdayThursday),
    courseInstance('000000040001', 'medical-german', '2026-06-26', '2026-08-28', { days: ['Fri'], time: '13:00-16:30' }, 12),
  ];
}

function buildExamSessions(): ExamSessionRow[] {
  return [
    examSession('000000010001', 'telc_b2', '2026-08-21T12:00:00.000Z', '2026-08-21T16:00:00.000Z', '2026-07-20'),
    examSession('000000010002', 'telc_b2', '2026-10-16T12:00:00.000Z', '2026-10-16T16:00:00.000Z', '2026-09-15'),
    examSession('000000010003', 'telc_b2', '2026-11-13T13:00:00.000Z', '2026-11-13T17:00:00.000Z', '2026-10-12'),
    examSession('000000020001', 'telc_c1_hochschule', '2026-09-04T12:00:00.000Z', '2026-09-04T16:00:00.000Z', '2026-08-03'),
    examSession('000000020002', 'telc_c1_hochschule', '2026-10-02T12:00:00.000Z', '2026-10-02T16:00:00.000Z', '2026-09-01'),
    examSession('000000020003', 'telc_c1_hochschule', '2026-10-30T13:00:00.000Z', '2026-10-30T17:00:00.000Z', '2026-09-29'),
    examSession('000000020004', 'telc_c1_hochschule', '2026-11-27T13:00:00.000Z', '2026-11-27T17:00:00.000Z', '2026-10-26'),
  ];
}

const FAQ_EN: FaqViewItem[] = [
  {
    id: 'faq-en-01',
    locale: 'en',
    category: 'Courses & Levels',
    question: 'How do I know my correct starting level?',
    answer:
      'Take the placement test before registration. Our team reviews your answers and helps place you in the right CEFR level so you can progress at a realistic pace.',
  },
  {
    id: 'faq-en-02',
    locale: 'en',
    category: 'Courses & Levels',
    question: 'Can beginners start without previous German?',
    answer:
      'Yes. Absolute beginners can register for A1 groups directly. If you already studied German, placement is strongly recommended.',
  },
  {
    id: 'faq-en-03',
    locale: 'en',
    category: 'Courses & Levels',
    question: 'How many students are in one class?',
    answer:
      'Most groups are taught in small classes. Capacity may vary by course format, but we keep group size focused on interaction and feedback.',
  },
  {
    id: 'faq-en-04',
    locale: 'en',
    category: 'Courses & Levels',
    question: 'Can I switch from evening to intensive later?',
    answer:
      'Yes, if scheduling and level match. Our office can map a transition plan so you do not repeat content or miss key competencies.',
  },
  {
    id: 'faq-en-05',
    locale: 'en',
    category: 'Registration',
    question: 'When should I register before my start date?',
    answer:
      'Register as early as possible, especially for visa timelines, exam deadlines, Bildungszeit/AZAV cases, and high-demand accommodation periods.',
  },
  {
    id: 'faq-en-06',
    locale: 'en',
    category: 'Registration',
    question: 'Can I reserve a seat before full payment?',
    answer:
      'Seat policies depend on the course and start date. Contact admissions and we will clarify registration, payment, or funding-related requirements for your case.',
  },
  {
    id: 'faq-en-07',
    locale: 'en',
    category: 'Registration',
    question: 'Do you issue admission confirmations for visa purposes?',
    answer:
      'After required registration and payment steps are completed, CASA can issue confirmation documents for visa processes.',
  },
  {
    id: 'faq-en-08',
    locale: 'en',
    category: 'Registration',
    question: 'Can agencies register students on their behalf?',
    answer:
      'Yes. We support agency coordination and can provide structured communication for intake, documents, and scheduling.',
  },
  {
    id: 'faq-en-09',
    locale: 'en',
    category: 'Exams',
    question: 'Which exams can I take through CASA?',
    answer:
      'CASA currently focuses on telc Deutsch B2 and telc Deutsch C1 Hochschule, including preparation and registration support.',
  },
  {
    id: 'faq-en-10',
    locale: 'en',
    category: 'Exams',
    question: 'How far in advance should I book an exam session?',
    answer:
      'We recommend booking early because seats and deadlines vary by provider. Last-minute requests are often limited.',
  },
  {
    id: 'faq-en-11',
    locale: 'en',
    category: 'Exams',
    question: 'Do you offer preparation courses for exam candidates?',
    answer:
      'Yes. Preparation formats include strategy training, mock sessions, and structured error feedback from experienced teachers.',
  },
  {
    id: 'faq-en-12',
    locale: 'en',
    category: 'Exams',
    question: 'Can I repeat an exam if I do not pass?',
    answer:
      'Yes. Rebooking options depend on exam provider availability. We can also recommend a focused preparation plan before your next attempt.',
  },
  {
    id: 'faq-en-13',
    locale: 'en',
    category: 'Accommodation',
    question: 'What accommodation options do students have?',
    answer:
      'Students can request shared flats or host family placements. The current planning basis is 580 EUR for 4 weeks, 145 EUR for each additional week, a 50 EUR placement fee, and a 580 EUR refundable deposit. Availability is confirmed case by case.',
  },
  {
    id: 'faq-en-14',
    locale: 'en',
    category: 'Accommodation',
    question: 'Are utilities included in shared flats?',
    answer:
      'Standard accommodation packages usually include core utilities. Final details are confirmed with your placement offer.',
  },
  {
    id: 'faq-en-15',
    locale: 'en',
    category: 'Accommodation',
    question: 'Can I request special accommodation preferences?',
    answer:
      'Yes. You can provide notes such as allergies, smoking preferences, or schedule constraints during registration.',
  },
  {
    id: 'faq-en-16',
    locale: 'en',
    category: 'Accommodation',
    question: 'How early should accommodation be requested?',
    answer:
      'Accommodation should be requested as early as possible. Cancellations are normally planned around a 4-week period, so early decisions give the housing team more room to help.',
  },
  {
    id: 'faq-en-17',
    locale: 'en',
    category: 'Student Life',
    question: 'Does CASA support social integration in Bremen?',
    answer:
      'Yes. CASA runs tandem programs, community activities, and city orientation support to help students feel connected quickly.',
  },
  {
    id: 'faq-en-18',
    locale: 'en',
    category: 'Student Life',
    question: 'Are there cultural or weekend activities?',
    answer:
      'Students can join cultural events and organized excursions, depending on current program calendar and availability.',
  },
  {
    id: 'faq-en-19',
    locale: 'en',
    category: 'Student Life',
    question: 'Can I practice German outside class with locals?',
    answer:
      'Yes. Tandem and community formats are designed for real-life communication and confidence building outside the classroom.',
  },
  {
    id: 'faq-en-20',
    locale: 'en',
    category: 'Student Life',
    question: 'Do students get support in the first week?',
    answer:
      'Student services help with onboarding, practical orientation, and first-week planning so you can start with clarity.',
  },
  {
    id: 'faq-en-21',
    locale: 'en',
    category: 'Courses & Levels',
    question: 'What are the current intensive and evening course fees?',
    answer:
      'For 2026 planning, intensive German is listed at EUR 520 for 4 weeks and EUR 940 for 8 weeks, plus the one-time EUR 50 enrollment fee and books. Evening courses are currently listed at EUR 476 per term, plus textbook costs.',
  },
  {
    id: 'faq-en-22',
    locale: 'en',
    category: 'Courses & Levels',
    question: 'Does CASA support Bildungszeit or AZAV-related planning?',
    answer:
      'Yes. CASA can discuss Bildungszeit and AZAV-related German training during advising. Exact eligibility and documents are confirmed individually before registration, because they depend on the current approval and your case.',
  },
  {
    id: 'faq-en-23',
    locale: 'en',
    category: 'Exams',
    question: 'What are the current telc B2 and C1 Hochschule fees?',
    answer:
      'The 2026 planning basis is EUR 190 for the full telc Deutsch B2 exam and EUR 210 for the full telc Deutsch C1 Hochschule exam. Partial repeats are planned separately, and preparation courses are available for B2 and C1 Hochschule.',
  },
  {
    id: 'faq-en-24',
    locale: 'en',
    category: 'Accommodation',
    question: 'Is CASA accommodation guaranteed after I request it?',
    answer:
      'No. Shared flats and host-family placements depend on availability. CASA confirms options case by case after your request; a binding reservation/search only starts after the required confirmation and payment steps.',
  },
];

const FAQ_DE: FaqViewItem[] = [
  {
    id: 'faq-de-01',
    locale: 'de',
    category: 'Kurse und Niveau',
    question: 'Wie finde ich mein passendes Einstiegsniveau?',
    answer:
      'Bitte absolvieren Sie vor der Anmeldung den Einstufungstest. Das CASA-Team ordnet Sie danach in das passende CEFR-Niveau ein.',
  },
  {
    id: 'faq-de-02',
    locale: 'de',
    category: 'Kurse und Niveau',
    question: 'Kann ich ohne Vorkenntnisse starten?',
    answer:
      'Ja. Absolute Anfängerinnen und Anfänger können direkt im A1-Kurs starten. Mit Vorkenntnissen empfehlen wir eine Einstufung.',
  },
  {
    id: 'faq-de-03',
    locale: 'de',
    category: 'Kurse und Niveau',
    question: 'Wie groß sind die Lerngruppen?',
    answer:
      'Die Kurse werden in kleinen Gruppen geplant. Die genaue Größe variiert nach Format, bleibt aber auf Interaktion und Feedback ausgerichtet.',
  },
  {
    id: 'faq-de-04',
    locale: 'de',
    category: 'Kurse und Niveau',
    question: 'Ist ein Wechsel vom Abendkurs in den Intensivkurs möglich?',
    answer:
      'Ja, sofern Niveau und Terminplanung passen. Das Team erstellt bei Bedarf einen klaren Übergangsplan.',
  },
  {
    id: 'faq-de-05',
    locale: 'de',
    category: 'Anmeldung',
    question: 'Wie früh sollte ich mich anmelden?',
    answer:
      'Melden Sie sich möglichst früh an, besonders bei Visumsvorlauf, Prüfungsfristen, Bildungszeit/AZAV-Fällen und stark nachgefragten Unterkunftszeiten.',
  },
  {
    id: 'faq-de-06',
    locale: 'de',
    category: 'Anmeldung',
    question: 'Kann ein Platz vor Vollzahlung reserviert werden?',
    answer:
      'Das hängt vom Kurs und Starttermin ab. Die Beratung klärt transparent, welche Anmelde-, Zahlungs- oder Fördervoraussetzungen für Ihren Fall gelten.',
  },
  {
    id: 'faq-de-07',
    locale: 'de',
    category: 'Anmeldung',
    question: 'Stellt CASA Unterlagen für das Visum aus?',
    answer:
      'Nach Abschluss der notwendigen Anmelde- und Zahlungsschritte können Kursbestätigungen für Visumverfahren bereitgestellt werden.',
  },
  {
    id: 'faq-de-08',
    locale: 'de',
    category: 'Anmeldung',
    question: 'Können Agenturen für Lernende anmelden?',
    answer:
      'Ja. CASA unterstützt Agenturabläufe mit klarer Kommunikation zu Unterlagen, Fristen und Kurszuordnung.',
  },
  {
    id: 'faq-de-09',
    locale: 'de',
    category: 'Prüfungen',
    question: 'Welche Prüfungen bietet CASA an?',
    answer:
      'CASA konzentriert sich aktuell auf telc Deutsch B2 und telc Deutsch C1 Hochschule inklusive Vorbereitung und Anmeldung.',
  },
  {
    id: 'faq-de-10',
    locale: 'de',
    category: 'Prüfungen',
    question: 'Wie früh sollte ich einen Prüfungstermin buchen?',
    answer:
      'Bitte buchen Sie frühzeitig. Je nach Anbieter sind Fristen und Plätze begrenzt.',
  },
  {
    id: 'faq-de-11',
    locale: 'de',
    category: 'Prüfungen',
    question: 'Gibt es Vorbereitungskurse für Prüfungsteilnehmende?',
    answer:
      'Ja. Es gibt Formate mit Strategietraining, Simulationen und gezieltem Feedback.',
  },
  {
    id: 'faq-de-12',
    locale: 'de',
    category: 'Prüfungen',
    question: 'Kann ich eine Prüfung wiederholen?',
    answer:
      'Ja. Ein neuer Termin richtet sich nach Verfügbarkeit und Fristen. Auf Wunsch empfehlen wir einen passenden Vorbereitungsplan.',
  },
  {
    id: 'faq-de-13',
    locale: 'de',
    category: 'Unterkunft',
    question: 'Welche Unterkunftsformen gibt es?',
    answer:
      'Sie können WG-Unterkunft oder Gastfamilie anfragen. Aktuelle Planungsbasis: 580 EUR für 4 Wochen, 145 EUR je weitere Woche, 50 EUR Vermittlungsgebühr und 580 EUR rückerstattbare Kaution. Die Verfügbarkeit wird individuell bestätigt.',
  },
  {
    id: 'faq-de-14',
    locale: 'de',
    category: 'Unterkunft',
    question: 'Sind Nebenkosten in der WG enthalten?',
    answer:
      'In der Regel sind zentrale Nebenkosten enthalten. Die genaue Aufstellung erhalten Sie mit dem Platzierungsangebot.',
  },
  {
    id: 'faq-de-15',
    locale: 'de',
    category: 'Unterkunft',
    question: 'Kann ich besondere Wohnwünsche angeben?',
    answer:
      'Ja. Angaben wie Allergien, Rauchpräferenzen oder Zeitwünsche können in der Anmeldung hinterlegt werden.',
  },
  {
    id: 'faq-de-16',
    locale: 'de',
    category: 'Unterkunft',
    question: 'Wie früh sollte ich Unterkunft anfragen?',
    answer:
      'Bitte stellen Sie die Anfrage möglichst früh. Stornierungen werden normalerweise mit 4 Wochen Vorlauf geplant, deshalb helfen frühe Entscheidungen dem Unterkunftsteam.',
  },
  {
    id: 'faq-de-17',
    locale: 'de',
    category: 'Studentisches Leben',
    question: 'Unterstützt CASA die soziale Integration in Bremen?',
    answer:
      'Ja. CASA bietet Tandemprogramme, Community-Formate und Orientierung im Stadtalltag.',
  },
  {
    id: 'faq-de-18',
    locale: 'de',
    category: 'Studentisches Leben',
    question: 'Gibt es Kultur- oder Wochenendaktivitäten?',
    answer:
      'Je nach Kalender gibt es gemeinsame Kulturveranstaltungen und Exkursionen in Nachbarstädte.',
  },
  {
    id: 'faq-de-19',
    locale: 'de',
    category: 'Studentisches Leben',
    question: 'Kann ich außerhalb des Unterrichts mit Muttersprachlern üben?',
    answer:
      'Ja. Tandem- und Community-Angebote sind auf alltagsnahe Sprachpraxis ausgerichtet.',
  },
  {
    id: 'faq-de-20',
    locale: 'de',
    category: 'Studentisches Leben',
    question: 'Bekomme ich in der ersten Woche Unterstützung?',
    answer:
      'Student Services begleitet Sie beim Start mit Orientierung und klaren ersten Schritten.',
  },
  {
    id: 'faq-de-21',
    locale: 'de',
    category: 'Kurse und Niveau',
    question: 'Welche Gebühren gelten aktuell für Intensiv- und Abendkurse?',
    answer:
      'Als Planungsbasis 2026 gilt: Intensiv Deutsch 520 EUR für 4 Wochen und 940 EUR für 8 Wochen, plus einmalige Einschreibegebühr von 50 EUR und Lehrmaterial. Abendkurse sind aktuell mit 476 EUR pro Trimester geplant, plus Lehrwerk.',
  },
  {
    id: 'faq-de-22',
    locale: 'de',
    category: 'Kurse und Niveau',
    question: 'Unterstützt CASA Bildungszeit oder AZAV-bezogene Planung?',
    answer:
      'Ja. CASA kann Bildungszeit und AZAV-bezogenes Deutschtraining in der Beratung klären. Die genaue Eignung und die benötigten Unterlagen werden vor der Anmeldung individuell bestätigt, weil sie von der aktuellen Anerkennung und vom Einzelfall abhängen.',
  },
  {
    id: 'faq-de-23',
    locale: 'de',
    category: 'Prüfungen',
    question: 'Welche Gebühren gelten für telc B2 und C1 Hochschule?',
    answer:
      'Als Planungsbasis 2026 gelten 190 EUR für die komplette telc Deutsch B2 Prüfung und 210 EUR für die komplette telc Deutsch C1 Hochschule Prüfung. Teilwiederholungen werden separat geplant; Vorbereitungskurse gibt es für B2 und C1 Hochschule.',
  },
  {
    id: 'faq-de-24',
    locale: 'de',
    category: 'Unterkunft',
    question: 'Ist CASA-Unterkunft nach meiner Anfrage garantiert?',
    answer:
      'Nein. WG- und Gastfamilienplätze hängen von der Verfügbarkeit ab. CASA bestätigt passende Optionen individuell; eine verbindliche Reservierung oder Suche startet erst nach den erforderlichen Bestätigungs- und Zahlungsschritten.',
  },
];

const NEWS_EN: NewsViewItem[] = [
  {
    slug: 'intensive-course-starter-guide',
    locale: 'en',
    title: 'How to Prepare for Your First Intensive German Course',
    summary: 'A practical first-week checklist for international students starting in Bremen.',
    body:
      'Starting an intensive German course can feel exciting and overwhelming at the same time.\n\nSet a weekly rhythm before classes begin: class hours, self-study blocks, and recovery time. Learners who protect this rhythm usually progress more consistently.\n\nUse your first week to build speaking habits in simple daily contexts such as shops, cafes, and transport questions. This lowers anxiety and builds real momentum.\n\nIf anything feels unclear, ask your teacher early. Small corrections in week one prevent bigger learning gaps later.',
    publishedAt: '2026-01-22T10:00:00.000Z',
    category: 'Student Success',
    author: 'CASA Academic Team',
  },
  {
    slug: 'telc-c1-six-week-roadmap',
    locale: 'en',
    title: 'telc C1 Hochschule: A 6-Week Roadmap',
    summary: 'A focused preparation structure used by successful CASA exam candidates.',
    body:
      'Strong C1 results usually come from consistency, not last-minute intensity.\n\nWeeks one and two should identify weak patterns in writing and listening. Build a correction log and track recurring errors by task type.\n\nWeeks three and four should increase timed simulations and speaking practice with structured feedback.\n\nIn the final two weeks, reduce randomness: repeat proven formats, keep sleep stable, and enter exam day with a familiar routine.',
    publishedAt: '2026-01-12T09:15:00.000Z',
    category: 'Exams',
    author: 'Exam Office',
  },
  {
    slug: 'bremen-first-month-language-habits',
    locale: 'en',
    title: 'Your First Month in Bremen: Language Habits That Work',
    summary: 'Simple habits that turn daily life into language progress.',
    body:
      'Language growth accelerates when your environment becomes part of the learning plan.\n\nChoose one daily activity in German and repeat it intentionally. Repetition lowers stress and improves recall.\n\nUse tandem sessions to bridge classroom language and spontaneous conversation.\n\nTrack weekly wins in a notebook to make progress visible and keep motivation stable.',
    publishedAt: '2025-12-30T11:00:00.000Z',
    category: 'Life in Bremen',
    author: 'Student Services',
  },
  {
    slug: 'why-placement-tests-protect-progress',
    locale: 'en',
    title: 'Why Placement Tests Protect Your Learning Speed',
    summary: 'Accurate level matching keeps motivation and progress aligned.',
    body:
      'Starting too high creates pressure. Starting too low creates frustration.\n\nA good placement process balances grammar, comprehension, and practical communication.\n\nWhen level fit is right from day one, learners stay engaged and teachers can challenge the group at the right pace.',
    publishedAt: '2025-12-18T08:20:00.000Z',
    category: 'Courses & Levels',
    author: 'CASA Academic Team',
  },
  {
    slug: 'inside-the-tandem-program',
    locale: 'en',
    title: 'Inside CASA Tandem: Why Conversation Partners Accelerate Growth',
    summary: 'How tandem sessions build confidence outside the classroom.',
    body:
      'Tandem sessions create low-pressure speaking repetition with real people.\n\nStudents often report better listening agility and more courage in spontaneous dialogue after only a few sessions.\n\nThe goal is not perfection. The goal is continuity and trust in your own communication.',
    publishedAt: '2025-12-05T09:40:00.000Z',
    category: 'Community',
    author: 'Community Programs',
  },
  {
    slug: 'weekend-excursions-language-impact',
    locale: 'en',
    title: 'Weekend Excursions: Language Learning Beyond Classroom Walls',
    summary: 'Why city trips improve practical German faster than expected.',
    body:
      'Excursions expose learners to authentic language density in real contexts.\n\nPlanning tickets, asking questions, and navigating group activities all become speaking opportunities.\n\nThese moments build confidence that transfers back into classroom participation.',
    publishedAt: '2025-11-26T13:10:00.000Z',
    category: 'Community',
    author: 'Student Services',
  },
  {
    slug: 'medical-german-fsp-focus',
    locale: 'en',
    title: 'Medical German: Building FSP Readiness with Real Cases',
    summary: 'A practical framework for doctors preparing for clinical communication.',
    body:
      'Medical German requires accuracy and empathy at the same time.\n\nRole-play consultations and vocabulary mapping around real cases help candidates internalize useful language quickly.\n\nRegular speaking feedback is critical for patient clarity and confidence under pressure.',
    publishedAt: '2025-11-14T10:25:00.000Z',
    category: 'Professional German',
    author: 'Medical German Team',
  },
  {
    slug: 'study-routine-before-exam-season',
    locale: 'en',
    title: 'How to Build a Study Routine Before Exam Season',
    summary: 'A realistic schedule for learners balancing work, life, and German.',
    body:
      'Most learners fail because of inconsistency, not low ability.\n\nUse short, repeatable study blocks and protect fixed weekly slots.\n\nA routine with modest daily goals is more effective than occasional marathon sessions.',
    publishedAt: '2025-11-03T08:05:00.000Z',
    category: 'Study Skills',
    author: 'CASA Academic Team',
  },
  {
    slug: 'from-a2-to-b1-confidence',
    locale: 'en',
    title: 'From A2 to B1: The Confidence Shift Students Notice Most',
    summary: 'What changes in real communication when learners cross into B1.',
    body:
      'At B1, many learners report a shift from memorizing sentences to building spontaneous meaning.\n\nThis stage benefits from frequent speaking loops and targeted grammar revision in context.\n\nSmall weekly reflection helps stabilize this transition.',
    publishedAt: '2025-10-24T12:30:00.000Z',
    category: 'Student Success',
    author: 'CASA Teachers',
  },
  {
    slug: 'new-student-onboarding-checklist',
    locale: 'en',
    title: 'New Student Onboarding: What to Prepare Before Day One',
    summary: 'Documents, routines, and mindset checkpoints for a smoother start.',
    body:
      'Bring your documents, define your weekly schedule, and set one clear communication goal for the first two weeks.\n\nStudents who begin with clear expectations adapt faster and stay motivated longer.',
    publishedAt: '2025-10-12T09:55:00.000Z',
    category: 'Orientation',
    author: 'Admissions Team',
  },
  {
    slug: 'what-makes-a-great-language-class',
    locale: 'en',
    title: 'What Makes a Great Language Class Feel Human',
    summary: 'Why trust, structure, and feedback matter as much as materials.',
    body:
      'Language progress is not only content delivery. It is classroom culture.\n\nStudents improve faster when they feel safe to make mistakes and receive clear correction without judgment.\n\nThis is why people-centered teaching is central at CASA.',
    publishedAt: '2025-09-29T14:05:00.000Z',
    category: 'Teaching Quality',
    author: 'Academic Coordination',
  },
  {
    slug: 'bremen-study-and-life-balance',
    locale: 'en',
    title: 'Balancing Study and Life in Bremen',
    summary: 'How students maintain progress without burnout.',
    body:
      'Progress requires intensity, but sustainability matters.\n\nPlan recovery time just as intentionally as class time.\n\nStudents who maintain energy over months outperform students who sprint for short periods.',
    publishedAt: '2025-09-15T10:10:00.000Z',
    category: 'Wellbeing',
    author: 'Student Services',
  },
];

const NEWS_DE: NewsViewItem[] = [
  {
    slug: 'intensive-course-starter-guide',
    locale: 'de',
    title: 'So starten Sie erfolgreich in den Intensivkurs',
    summary: 'Ein praxisnaher Wochenstart für internationale Lernende in Bremen.',
    body:
      'Der Start in einen Intensivkurs ist motivierend und herausfordernd zugleich.\n\nLegen Sie schon vor Kursbeginn einen Wochenrhythmus fest: Unterricht, Selbstlernzeit und Erholung.\n\nNutzen Sie die erste Woche für einfache Sprechsituationen im Alltag.\n\nFragen Sie früh nach, wenn etwas unklar ist. Kleine Korrekturen am Anfang wirken langfristig stark.',
    publishedAt: '2026-01-22T10:00:00.000Z',
    category: 'Lernerfolg',
    author: 'CASA Academic Team',
  },
  {
    slug: 'telc-c1-six-week-roadmap',
    locale: 'de',
    title: 'telc C1 Hochschule: ein klarer 6-Wochen-Plan',
    summary: 'Ein strukturierter Vorbereitungsrahmen für sichere Prüfungsleistung.',
    body:
      'Starke C1-Ergebnisse entstehen durch Kontinuität, nicht durch Last-Minute-Lernen.\n\nIn Woche eins und zwei werden Schwachstellen in Schreiben und Hören sichtbar gemacht.\n\nDanach folgen Simulationen unter Zeitdruck und gezieltes Feedback.\n\nIn den letzten zwei Wochen werden Formate gefestigt und Routinen stabilisiert.',
    publishedAt: '2026-01-12T09:15:00.000Z',
    category: 'Prüfungen',
    author: 'Exam Office',
  },
  {
    slug: 'bremen-first-month-language-habits',
    locale: 'de',
    title: 'Erster Monat in Bremen: Sprachroutinen, die wirken',
    summary: 'Mit einfachen Gewohnheiten den Alltag zum Lernraum machen.',
    body:
      'Sprachfortschritt wird schneller, wenn der Alltag aktiv einbezogen wird.\n\nWählen Sie eine tägliche Aufgabe auf Deutsch und wiederholen Sie diese bewusst.\n\nTandemformate verbinden Unterrichtssprache mit spontaner Kommunikation.\n\nDokumentieren Sie Wochenfortschritte, um Motivation sichtbar zu halten.',
    publishedAt: '2025-12-30T11:00:00.000Z',
    category: 'Leben in Bremen',
    author: 'Student Services',
  },
  {
    slug: 'why-placement-tests-protect-progress',
    locale: 'de',
    title: 'Warum Einstufungstests den Lernerfolg schützen',
    summary: 'Passende Niveaueinstufung sorgt für Tempo und Motivation.',
    body:
      'Ein zu hohes Niveau erzeugt Druck, ein zu niedriges bremst den Fortschritt.\n\nGute Einstufung verbindet Grammatik, Verstehen und kommunikative Handlungsfähigkeit.\n\nMit passender Gruppenzuordnung bleibt Lernenergie langfristig stabil.',
    publishedAt: '2025-12-18T08:20:00.000Z',
    category: 'Kurse und Niveau',
    author: 'CASA Academic Team',
  },
  {
    slug: 'inside-the-tandem-program',
    locale: 'de',
    title: 'Tandem bei CASA: warum Sprachpartner so wirksam sind',
    summary: 'Wie Tandemgespräche Sprechsicherheit außerhalb des Unterrichts stärken.',
    body:
      'Tandemtermine schaffen regelmäßige Sprechpraxis mit echten Menschen.\n\nViele Lernende berichten schon nach kurzer Zeit über mehr Hörsicherheit und weniger Hemmungen.\n\nNicht Perfektion, sondern Kontinuität ist der zentrale Hebel.',
    publishedAt: '2025-12-05T09:40:00.000Z',
    category: 'Community',
    author: 'Community Programs',
  },
  {
    slug: 'weekend-excursions-language-impact',
    locale: 'de',
    title: 'Wochenend-Exkursionen als Sprachbooster',
    summary: 'Warum Stadtausflüge die alltagsnahe Sprachpraxis beschleunigen.',
    body:
      'Exkursionen schaffen dichte Sprachsituationen im echten Kontext.\n\nTickets organisieren, Fragen stellen und gemeinsam planen wird zur aktiven Sprechanwendung.\n\nDiese Erfahrungen wirken direkt zurück in mehr Beteiligung im Unterricht.',
    publishedAt: '2025-11-26T13:10:00.000Z',
    category: 'Community',
    author: 'Student Services',
  },
  {
    slug: 'medical-german-fsp-focus',
    locale: 'de',
    title: 'Medizinisches Deutsch: FSP-Vorbereitung mit Fallbezug',
    summary: 'Ein praxisnaher Trainingsrahmen für klinische Kommunikation.',
    body:
      'Medizinisches Deutsch verlangt sprachliche Präzision und empathische Kommunikation.\n\nRollenspiele und fallbasierte Vokabulararbeit beschleunigen den Transfer in den Berufsalltag.\n\nRegelmäßiges Sprechfeedback ist entscheidend für Sicherheit in Gesprächen.',
    publishedAt: '2025-11-14T10:25:00.000Z',
    category: 'Berufssprache',
    author: 'Medical German Team',
  },
  {
    slug: 'study-routine-before-exam-season',
    locale: 'de',
    title: 'Lernroutine vor der Prüfungsphase aufbauen',
    summary: 'Ein realistischer Wochenplan für nachhaltigen Lernerfolg.',
    body:
      'Viele Lernprobleme entstehen durch Unregelmäßigkeit, nicht durch fehlendes Potenzial.\n\nKurze, wiederholbare Lerneinheiten mit festen Wochenzeiten wirken am besten.\n\nEin stabiler Rhythmus ist stärker als seltene Lernmarathons.',
    publishedAt: '2025-11-03T08:05:00.000Z',
    category: 'Lernstrategie',
    author: 'CASA Academic Team',
  },
  {
    slug: 'from-a2-to-b1-confidence',
    locale: 'de',
    title: 'Von A2 nach B1: der spürbare Wendepunkt',
    summary: 'Welche Veränderung Lernende in echter Kommunikation erleben.',
    body:
      'Beim Übergang zu B1 verschiebt sich das Lernen von Auswendiglernen hin zu spontaner Sprachproduktion.\n\nDiese Phase profitiert von regelmäßigen Sprechloops und kontextbezogener Grammatikarbeit.\n\nKurze Wochenreflexion stabilisiert den Fortschritt.',
    publishedAt: '2025-10-24T12:30:00.000Z',
    category: 'Lernerfolg',
    author: 'CASA Teachers',
  },
  {
    slug: 'new-student-onboarding-checklist',
    locale: 'de',
    title: 'Onboarding-Checkliste für neue Lernende',
    summary: 'Was vor dem ersten Kurstag vorbereitet werden sollte.',
    body:
      'Bringen Sie relevante Unterlagen mit, planen Sie Ihre Woche und setzen Sie ein klares Sprachziel für die ersten zwei Wochen.\n\nEin strukturierter Start reduziert Stress und fördert konstante Motivation.',
    publishedAt: '2025-10-12T09:55:00.000Z',
    category: 'Orientierung',
    author: 'CASA-Team',
  },
  {
    slug: 'what-makes-a-great-language-class',
    locale: 'de',
    title: 'Was einen guten Sprachkurs menschlich stark macht',
    summary: 'Warum Vertrauen, Struktur und Feedback zentral sind.',
    body:
      'Sprachfortschritt ist mehr als Materialvermittlung. Entscheidend ist die Lernkultur.\n\nLernende entwickeln sich schneller, wenn sie Fehler machen dürfen und klares Feedback erhalten.\n\nDeshalb ist menschenzentrierter Unterricht ein Kernprinzip bei CASA.',
    publishedAt: '2025-09-29T14:05:00.000Z',
    category: 'Unterrichtsqualität',
    author: 'Akademische Koordination',
  },
  {
    slug: 'bremen-study-and-life-balance',
    locale: 'de',
    title: 'Lernen und Alltag in Bremen gesund balancieren',
    summary: 'Wie Lernende Fortschritt halten, ohne auszubrennen.',
    body:
      'Fortschritt braucht Intensität, aber auch Nachhaltigkeit.\n\nPlanen Sie Erholung genauso bewusst wie Lernzeit.\n\nWer über Monate stabil lernt, erreicht meist bessere Ergebnisse als kurzfristige Sprintphasen.',
    publishedAt: '2025-09-15T10:10:00.000Z',
    category: 'Wellbeing',
    author: 'Student Services',
  },
];

export const fallbackCourseTypes = COURSE_TYPES;
export const fallbackCourseInstances = buildCourseInstances();
export const fallbackExamTypes = EXAM_TYPES;
export const fallbackExamSessions = buildExamSessions();

export const fallbackFaqByLocale: Record<ContentLocale, FaqViewItem[]> = {
  en: FAQ_EN,
  de: FAQ_DE,
};

export const fallbackNewsByLocale: Record<ContentLocale, NewsViewItem[]> = {
  en: NEWS_EN,
  de: NEWS_DE,
};
