import type { ContentLocale, CourseNarrative } from '@/lib/content/types';

const makeStory = (
  quote: string,
  personDisplay: string,
  country: string,
  sourceUrl: string
) => ({
  quote,
  personDisplay,
  country,
  roleLabel: 'Student story',
  sourcePlatform: 'internal' as const,
  sourceUrl,
  verificationStatus: 'verified' as const,
});

export const courseNarrativesByLocale: Record<ContentLocale, CourseNarrative[]> = {
  en: [
    {
      slug: 'intensive-german',
      locale: 'en',
      audience: 'Students who need rapid progress for studies, work, or visa planning.',
      promise: 'High-structure weekly rhythm with daily speaking momentum.',
      outcomes: ['Clear CEFR progression', 'Improved speaking confidence', 'Consistent study routine'],
      teachingStyle: ['Communicative tasks', 'Small-group correction', 'Weekly progress checkpoints'],
      studentStory: makeStory(
        'I arrived shy and left confident enough to handle university conversations in German.',
        'Sara K.',
        'Jordan',
        'https://www.casa-bremen.de/unsere-sprachschule/'
      ),
    },
    {
      slug: 'evening-german',
      locale: 'en',
      audience: 'Working professionals and trainees balancing work with language learning.',
      promise: 'Steady progress after work hours without losing structure.',
      outcomes: ['Improved workplace communication', 'Vocabulary for daily life', 'Flexible long-term progression'],
      teachingStyle: ['Real-life scenarios', 'Focused grammar blocks', 'Peer conversation practice'],
      studentStory: makeStory(
        'Evening classes let me keep my job and still move from A2 to B1 in a realistic way.',
        'Mateo R.',
        'Colombia',
        'https://www.instagram.com/casa_sprachschule/'
      ),
    },
    {
      slug: 'special-courses',
      locale: 'en',
      audience: 'Learners targeting one specific skill quickly.',
      promise: 'Short focused modules for grammar, writing, or conversation breakthroughs.',
      outcomes: ['Targeted skill lift', 'Better exam/task readiness', 'Personalized focus areas'],
      teachingStyle: ['Workshop format', 'Feedback-heavy sessions', 'Practice-first design'],
      studentStory: makeStory(
        'The writing module changed how I structure formal German texts for my applications.',
        'Yuki T.',
        'Japan',
        'https://www.casa-bremen.de/leitbild/'
      ),
    },
    {
      slug: 'medical-german',
      locale: 'en',
      audience: 'Doctors and healthcare professionals preparing for clinical work and licensing in Germany.',
      promise: 'Master the clinical communication skills needed for patient interaction, FSP approval, and hospital team collaboration.',
      outcomes: [
        'Confident patient history-taking (Anamnese)',
        'Clear physical examination language',
        'Structured case presentations (Fallvorstellungen)',
        'Precise medical report writing (Arztbriefe)',
        'FSP licensing exam readiness',
      ],
      teachingStyle: [
        'Role-play clinical consultations with instructor feedback',
        'Case-based language drills (real hospital scenarios)',
        'Interdisciplinary communication practice',
        'Pronunciation coaching for medical terminology',
      ],
      studentStory: makeStory(
        'After just a few weeks I could present patient cases confidently in German — the Fallvorstellungen practice made the FSP feel manageable.',
        'Nour A.',
        'Egypt',
        'https://www.casa-bremen.de/unsere-sprachschule/'
      ),
    },
    {
      slug: 'bildungszeit',
      locale: 'en',
      audience: 'Employees using educational leave for intensive German training.',
      promise: 'Time-efficient German training for approved educational-leave and AZAV-related planning.',
      outcomes: ['Fast short-term improvement', 'Practical speaking gains', 'Clear post-course roadmap'],
      teachingStyle: ['Compact intensive blocks', 'Applied communication tasks', 'Goal-based lesson plans'],
      studentStory: makeStory(
        'In two educational-leave weeks I made more progress than in months of self-study.',
        'Elena M.',
        'Italy',
        'https://www.casa-bremen.de/unsere-sprachschule/'
      ),
    },
    {
      slug: 'in-company',
      locale: 'en',
      audience: 'Teams that need German for internal and client communication.',
      promise: 'Company-specific language training linked directly to work tasks.',
      outcomes: ['Meeting fluency', 'Email quality improvement', 'Team communication consistency'],
      teachingStyle: ['Needs analysis', 'Industry vocabulary tracks', 'On-site or hybrid delivery'],
      studentStory: makeStory(
        'Our team meetings became faster and clearer after eight weeks of in-company training.',
        'HR Manager, Logistics SME',
        'Germany',
        'https://www.casa-bremen.de/leitbild/'
      ),
    },
    {
      slug: 'exam-preparation',
      locale: 'en',
      audience: 'Learners preparing for telc Deutsch B2 or telc Deutsch C1 Hochschule.',
      promise: 'Exam strategy with measurable improvement through simulation and feedback.',
      outcomes: ['Task strategy mastery', 'Time management under pressure', 'Higher score confidence'],
      teachingStyle: ['Mock exam cycles', 'Error-log method', 'Task-by-task coaching'],
      studentStory: makeStory(
        'The simulation routine made exam day feel familiar instead of stressful.',
        'Lina D.',
        'Peru',
        'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen'
      ),
    },
    {
      slug: 'german-for-groups',
      locale: 'en',
      audience: 'School classes, universities, and organisations bringing a group to Bremen.',
      promise: 'A German programme built around your group, combined with a Bremen culture programme and host-family accommodation.',
      outcomes: [
        'Lesson content shaped around your group and its goals',
        'German practised outside the classroom every day',
        'A participation certificate for every learner',
      ],
      teachingStyle: [
        '20 hours of lessons per week',
        'Speaking-led sessions using content you choose',
        'Culture programme and excursions built into the week',
      ],
      studentStory: makeStory(
        'CASA built the week around what my class actually needed, and the host families did as much for their German as the lessons did.',
        'Group organiser',
        'Bremen',
        'https://www.casa-bremen.de/en/language-courses/german-for-groups/'
      ),
    },
  ],
  de: [
    {
      slug: 'intensive-german',
      locale: 'de',
      audience: 'Lernende mit dem Ziel schneller Fortschritte für Studium, Arbeit oder Visum.',
      promise: 'Klare Wochenstruktur mit täglicher Sprechpraxis.',
      outcomes: ['Sichtbarer CEFR-Fortschritt', 'Mehr Sprechsicherheit', 'Verlässlicher Lernrhythmus'],
      teachingStyle: ['Kommunikative Aufgaben', 'Korrektur in Kleingruppen', 'Wöchentliche Lernchecks'],
      studentStory: makeStory(
        'Ich kam unsicher an und konnte nach kurzer Zeit selbstbewusst auf Deutsch studieren.',
        'Sara K.',
        'Jordanien',
        'https://www.casa-bremen.de/unsere-sprachschule/'
      ),
    },
    {
      slug: 'evening-german',
      locale: 'de',
      audience: 'Berufstätige und Auszubildende mit begrenzter Zeit am Tag.',
      promise: 'Kontinuierliches Lernen am Abend ohne Qualitätsverlust.',
      outcomes: ['Sicherere Kommunikation im Beruf', 'Mehr Alltagsvokabular', 'Langfristiger Fortschritt'],
      teachingStyle: ['Praxisnahe Szenarien', 'Gezielte Grammatikblöcke', 'Partnerarbeit'],
      studentStory: makeStory(
        'Mit dem Abendkurs konnte ich arbeiten und trotzdem spürbare Fortschritte machen.',
        'Mateo R.',
        'Kolumbien',
        'https://www.instagram.com/casa_sprachschule/'
      ),
    },
    {
      slug: 'special-courses',
      locale: 'de',
      audience: 'Lernende mit einem klaren Fokus auf einzelne Kompetenzen.',
      promise: 'Kompakte Module für Grammatik, Schreiben oder Sprechen.',
      outcomes: ['Gezielter Kompetenzsprung', 'Bessere Prüfungsvorbereitung', 'Individuelle Schwerpunkte'],
      teachingStyle: ['Workshop-Format', 'Intensives Feedback', 'Übung vor Theorie'],
      studentStory: makeStory(
        'Das Schreibmodul hat meine Bewerbungen auf Deutsch deutlich verbessert.',
        'Yuki T.',
        'Japan',
        'https://www.casa-bremen.de/leitbild/'
      ),
    },
    {
      slug: 'medical-german',
      locale: 'de',
      audience: 'Ärztinnen, Ärzte und medizinische Fachkräfte mit Ziel Berufsanerkennung und Klinikalltag in Deutschland.',
      promise: 'Gezielte Sprachkompetenz für Patientengespräche, FSP-Vorbereitung und interprofessionelle Kommunikation im Krankenhaus.',
      outcomes: [
        'Sichere Anamnesegespräche auf Deutsch',
        'Klare Sprache bei der körperlichen Untersuchung',
        'Strukturierte Fallvorstellungen im Team',
        'Präzises Verfassen von Arztbriefen',
        'Gezielte Vorbereitung auf die Fachsprachprüfung (FSP)',
      ],
      teachingStyle: [
        'Rollenspiele mit echten Kliniksituationen',
        'Fallbasierte Spracharbeit mit direktem Feedback',
        'Interdisziplinäre Kommunikationsübungen',
        'Aussprachetraining für medizinische Fachbegriffe',
      ],
      studentStory: makeStory(
        'Die Fallvorstellungsübungen haben mir geholfen, die FSP entspannt anzugehen — ich konnte Patientenfälle endlich strukturiert auf Deutsch präsentieren.',
        'Nour A.',
        'Ägypten',
        'https://www.casa-bremen.de/unsere-sprachschule/'
      ),
    },
    {
      slug: 'bildungszeit',
      locale: 'de',
      audience: 'Berufstätige in der Bildungszeit mit klaren Lernzielen.',
      promise: 'Intensives Deutschtraining für anerkannte Bildungszeit- und AZAV-Planung.',
      outcomes: ['Schneller Kompetenzgewinn', 'Mehr Sprechpraxis', 'Klare Anschlussplanung'],
      teachingStyle: ['Kompakte Intensivblöcke', 'Alltagsnahe Kommunikation', 'Zielorientierte Planung'],
      studentStory: makeStory(
        'In zwei Bildungszeitwochen habe ich mehr gelernt als in Monaten allein.',
        'Elena M.',
        'Italien',
        'https://www.casa-bremen.de/unsere-sprachschule/'
      ),
    },
    {
      slug: 'in-company',
      locale: 'de',
      audience: 'Teams, die Deutsch direkt im Arbeitsalltag brauchen.',
      promise: 'Firmenbezogenes Sprachtraining mit direktem Praxisbezug.',
      outcomes: ['Sicherere Meetings', 'Bessere E-Mail-Kommunikation', 'Einheitliche Team-Sprache'],
      teachingStyle: ['Bedarfsanalyse', 'Branchenvokabular', 'Vor Ort oder hybrid'],
      studentStory: makeStory(
        'Unsere Teamkommunikation wurde in wenigen Wochen deutlich klarer.',
        'HR Managerin, Logistikunternehmen',
        'Deutschland',
        'https://www.casa-bremen.de/leitbild/'
      ),
    },
    {
      slug: 'exam-preparation',
      locale: 'de',
      audience: 'Lernende mit Ziel telc Deutsch B2 oder telc Deutsch C1 Hochschule.',
      promise: 'Prüfungsstrategie mit messbarem Fortschritt durch Simulation.',
      outcomes: ['Sichere Aufgabenstrategie', 'Besseres Zeitmanagement', 'Mehr Prüfungsruhe'],
      teachingStyle: ['Mock-Prüfungen', 'Fehlerlog-Methode', 'Aufgabenspezifisches Coaching'],
      studentStory: makeStory(
        'Durch die Simulationen war der Prüfungstag nicht mehr stressig.',
        'Lina D.',
        'Peru',
        'https://maps.google.com/?q=CASA+Internationale+Sprachschule+Bremen'
      ),
    },
    {
      slug: 'german-for-groups',
      locale: 'de',
      audience: 'Schulklassen, Hochschulen und Organisationen, die mit einer Gruppe nach Bremen kommen.',
      promise: 'Ein Deutschprogramm nach Maß Ihrer Gruppe, kombiniert mit Kulturprogramm in Bremen und Unterbringung in Gastfamilien.',
      outcomes: [
        'Unterrichtsinhalte passend zu Ihrer Gruppe und ihren Zielen',
        'Täglich Deutsch auch außerhalb des Unterrichts',
        'Teilnahmebescheinigung für alle Teilnehmenden',
      ],
      teachingStyle: [
        '20 Unterrichtsstunden pro Woche',
        'Sprechorientierter Unterricht mit Inhalten Ihrer Wahl',
        'Kulturprogramm und Ausflüge fest im Wochenplan',
      ],
      studentStory: makeStory(
        'CASA hat die Woche genau auf meine Klasse zugeschnitten, und die Gastfamilien haben für das Deutsch so viel gebracht wie der Unterricht.',
        'Gruppenleitung',
        'Bremen',
        'https://www.casa-bremen.de/sprachkurse/deutsch-fuer-gruppen/'
      ),
    },
  ],
};
