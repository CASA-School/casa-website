import { faqByLocale } from './faq';
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
    level_min: 'A1',
    level_max: 'C1',
    lessons_per_week: 4,
    // 476 EUR is the Herbsttrimester price CASA currently publishes, and it is a
    // per-trimester fee rather than an entry point -- so 'fixed', not 'from'.
    default_price: 476,
    pricing_mode: 'fixed',
    // 4 UE a week cannot meet the published 20-a-week visa requirement.
    visa_eligible: false,
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
    visa_eligible: false,
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
    // CASA publishes the B2/C1 entry requirement and nothing else for this
    // course: no weekly load, no dates, no price. 0 is the "not published"
    // sentinel and the facts rail renders it as "On request", never as a zero.
    lessons_per_week: 0,
    default_price: 0,
    pricing_mode: 'on_request',
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
    // "Ab einem Niveau von B1 kannst du teilnehmen."
    level_min: 'B1',
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
    // By arrangement, like the price. Never publish a weekly figure here.
    lessons_per_week: 0,
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

/**
 * CASA's published term table, matching db/seeds/0001_public_baseline.sql.
 *
 * Fallback mode has to show the same terms as Neon mode, so these are the dates
 * from casa-bremen.de and not a set generated relative to today. The afternoon
 * intensive runs FOUR days (Mon-Thu), not five -- getting that wrong overstates
 * the weekly commitment by a fifth.
 *
 * Deliberately absent: any instance for German for Medical. CASA publishes no
 * dates for it, and the fabricated "26 Jun - 28 Aug 2026, Fridays 13:00-16:30"
 * row that used to sit here rendered on the public site as a real course start.
 */
function buildCourseInstances(): CourseInstanceRow[] {
  const intensiveMorning = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-12:30' };
  const intensiveAfternoon = { days: ['Mon', 'Tue', 'Wed', 'Thu'], time: '13:00-17:30' };
  const eveningMondayWednesday = { days: ['Mon', 'Wed'], time: '18:30-20:00' };
  const eveningTuesdayThursday = { days: ['Tue', 'Thu'], time: '18:30-20:00' };
  // Two intensive courses in parallel. The schedule field takes one range, so it
  // carries the span of the teaching day; the page explains the two blocks.
  const bildungszeitFullDay = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-17:30' };

  return [
    courseInstance('000000010001', 'intensive-german', '2026-08-31', '2026-10-23', intensiveMorning, 15),
    courseInstance('000000010002', 'intensive-german', '2026-10-26', '2026-12-18', intensiveMorning, 15),
    courseInstance('000000010003', 'intensive-german', '2027-01-04', '2027-02-26', intensiveMorning, 15),
    courseInstance('000000010004', 'intensive-german', '2027-03-01', '2027-04-30', intensiveMorning, 15),
    courseInstance('000000010005', 'intensive-german', '2026-08-03', '2026-09-24', intensiveAfternoon, 15),
    courseInstance('000000010006', 'intensive-german', '2026-09-28', '2026-11-19', intensiveAfternoon, 15),
    courseInstance('000000010007', 'intensive-german', '2026-11-23', '2027-01-28', intensiveAfternoon, 15),
    courseInstance('000000010008', 'intensive-german', '2027-02-01', '2027-04-01', intensiveAfternoon, 15),
    courseInstance('000000020001', 'evening-german', '2026-08-24', '2026-12-16', eveningMondayWednesday, 12),
    courseInstance('000000020002', 'evening-german', '2026-08-25', '2026-12-17', eveningTuesdayThursday, 12),
    courseInstance('000000050001', 'bildungszeit', '2026-08-31', '2026-10-23', bildungszeitFullDay, 15),
    courseInstance('000000050002', 'bildungszeit', '2026-10-26', '2026-12-18', bildungszeitFullDay, 15),
    courseInstance('000000050003', 'bildungszeit', '2027-01-04', '2027-02-26', bildungszeitFullDay, 15),
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

/**
 * The FAQ moved to config/content/faq.ts.
 *
 * What used to sit here was 24 invented questions per locale with zero overlap
 * with the FAQ CASA publishes -- generic reassurance where the real answers carry
 * deadlines and euro amounts. See the header of that file.
 */
export const fallbackFaqByLocale: Record<ContentLocale, FaqViewItem[]> = {
  en: faqByLocale.en,
  de: faqByLocale.de,
};

export const fallbackNewsByLocale: Record<ContentLocale, NewsViewItem[]> = {
  en: NEWS_EN,
  de: NEWS_DE,
};
