import type { ContentLocale } from '@/lib/content/types';

export type PublicHeroType = 'home-photo' | 'index-chooser' | 'detail-utility' | 'minimal-utility';

export type PublicRouteKey =
  | 'home'
  | 'about'
  | 'team'
  | 'courses'
  | 'course-detail'
  | 'exams'
  | 'exam-detail'
  | 'accommodation'
  | 'accommodation-detail'
  | 'imprint'
  | 'privacy'
  | 'terms'
  | 'faq'
  | 'contact';

type LocalizedText = {
  en: string;
  de: string;
};

export type PageCtaConfig = {
  label: LocalizedText;
  href: string;
  kind: 'primary' | 'secondary';
};

export type PhotoPlaceholderConfig = {
  src: string;
  alt: LocalizedText;
  caption: LocalizedText;
};

export type PublicPageConfig = {
  heroType: PublicHeroType;
  sections: string[];
  ctas: PageCtaConfig[];
  photos: Record<string, PhotoPlaceholderConfig>;
};

export type LocalizedPageCta = {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
};

export type LocalizedPhotoPlaceholder = {
  src: string;
  alt: string;
  caption: string;
};

export type LocalizedPublicPageConfig = {
  heroType: PublicHeroType;
  sections: string[];
  ctas: LocalizedPageCta[];
  photos: Record<string, LocalizedPhotoPlaceholder>;
};

const photoLibrary: Record<string, PhotoPlaceholderConfig> = {
  studentClass: {
    src: '/media/casa/classroom-community-table.jpg',
    alt: {
      en: 'CASA learners and a teacher working together around a classroom table',
      de: 'CASA Lernende und eine Lehrkraft arbeiten gemeinsam an einem Kurstisch',
    },
    caption: {
      en: 'Real classroom moments show how German becomes active communication.',
      de: 'Echte Kursmomente zeigen, wie Deutsch zu aktiver Kommunikation wird.',
    },
  },
  teacherGuiding: {
    src: '/media/casa/course-whiteboard-practice.jpg',
    alt: {
      en: 'CASA learner writing German vocabulary on a classroom whiteboard',
      de: 'CASA Lernender schreibt deutschen Wortschatz an ein Whiteboard',
    },
    caption: {
      en: 'Whiteboard practice keeps language concrete, visible, and usable.',
      de: 'Whiteboard-Praxis macht Sprache konkret, sichtbar und anwendbar.',
    },
  },
  groupConversation: {
    src: '/media/casa/course-seminar-wide.jpg',
    alt: {
      en: 'a CASA German course group during a classroom lesson',
      de: 'Eine CASA Deutschkursgruppe während des Unterrichts',
    },
    caption: {
      en: 'Group lessons combine structure, participation, and everyday practice.',
      de: 'Gruppenunterricht verbindet Struktur, Beteiligung und Alltagspraxis.',
    },
  },
  groupClassroomTeacherActivity: {
    src: '/media/casa/group-classroom-teacher-activity.jpg',
    alt: {
      en: 'a CASA teacher guiding a group-course classroom activity',
      de: 'Eine CASA Lehrkraft begleitet eine Aktivität im Gruppenkurs',
    },
    caption: {
      en: 'Active group teaching keeps language visible, practical, and shared.',
      de: 'Aktiver Gruppenunterricht macht Sprache sichtbar, praktisch und gemeinsam erlebbar.',
    },
  },
  groupCourseLunch: {
    src: '/media/casa/group-course-lunch-table.jpg',
    alt: {
      en: 'CASA group-course students sharing lunch during a Bremen stay',
      de: 'CASA Teilnehmende eines Gruppenkurses essen gemeinsam während ihres Aufenthalts in Bremen',
    },
    caption: {
      en: 'Group courses work best when classroom progress and shared daily moments belong together.',
      de: 'Gruppenkurse wirken stärker, wenn Unterricht und gemeinsame Alltagserlebnisse zusammengehören.',
    },
  },
  groupCourseWalking: {
    src: '/media/casa/group-course-walking-bremen.jpg',
    alt: {
      en: 'CASA group-course students walking together through Bremen',
      de: 'CASA Teilnehmende eines Gruppenkurses gehen gemeinsam durch Bremen',
    },
    caption: {
      en: 'Bremen becomes part of the learning route for visiting groups.',
      de: 'Für Gruppen wird Bremen Teil des Lernwegs.',
    },
  },
  groupCoursePhoneTask: {
    src: '/media/casa/group-course-phone-task.jpg',
    alt: {
      en: 'CASA group-course students using phones during an outdoor Bremen task',
      de: 'CASA Teilnehmende eines Gruppenkurses nutzen Handys bei einer Aufgabe in Bremen',
    },
    caption: {
      en: 'Outdoor tasks turn city moments into language practice.',
      de: 'Aufgaben in der Stadt machen Alltagssituationen zu Sprachpraxis.',
    },
  },
  groupCourseBremenMusicians: {
    src: '/media/casa/group-course-bremen-musicians.jpg',
    alt: {
      en: 'CASA group-course students gathered by the Bremen Town Musicians',
      de: 'CASA Teilnehmende eines Gruppenkurses bei den Bremer Stadtmusikanten',
    },
    caption: {
      en: 'Cultural stops give group courses a concrete Bremen memory.',
      de: 'Kulturelle Stationen geben Gruppenkursen eine konkrete Bremen-Erinnerung.',
    },
  },
  courseClassroomWide: {
    src: '/media/casa/course-classroom-wide.jpg',
    alt: {
      en: 'wide CASA classroom with learners following a German lesson',
      de: 'Weiter CASA Kursraum mit Lernenden im Deutschunterricht',
    },
    caption: {
      en: 'Course formats stay easier to understand when the learning room is visible.',
      de: 'Kursformate werden greifbarer, wenn der Lernraum sichtbar bleibt.',
    },
  },
  courseDiscussion: {
    src: '/media/casa/course-discussion-row.jpg',
    alt: {
      en: 'CASA learners listening and speaking during a classroom discussion',
      de: 'CASA Lernende hören zu und sprechen in einer Kursdiskussion',
    },
    caption: {
      en: 'Discussion practice helps learners move from understanding to speaking.',
      de: 'Diskussionspraxis hilft Lernenden vom Verstehen ins Sprechen.',
    },
  },
  courseClassroomCircle: {
    src: '/media/casa/course-classroom-circle.jpg',
    alt: {
      en: 'CASA learners practicing German in a wide classroom circle',
      de: 'CASA Lernende üben Deutsch in einer weiten Kursrunde',
    },
    caption: {
      en: 'Room to listen, speak, and repeat keeps course rhythm active.',
      de: 'Raum zum Hören, Sprechen und Wiederholen hält den Kursrhythmus aktiv.',
    },
  },
  whiteboardPractice: {
    src: '/media/casa/whiteboard-german-coaching.jpg',
    alt: {
      en: 'adult learners using a whiteboard for guided German practice',
      de: 'Erwachsene Lernende nutzen ein Whiteboard für angeleitete Deutschpraxis',
    },
    caption: {
      en: 'Guided practice makes grammar and phrases easier to use.',
      de: 'Angeleitete Praxis macht Grammatik und Redemittel leichter nutzbar.',
    },
  },
  studyMaterials: {
    src: '/media/casa/study-materials-map.jpg',
    alt: {
      en: 'CASA study materials placed on a map for course planning',
      de: 'CASA Lernmaterialien auf einer Karte für die Kursplanung',
    },
    caption: {
      en: 'Good planning turns a language goal into a route.',
      de: 'Gute Planung macht aus einem Sprachziel einen Weg.',
    },
  },
  classroomMapVocabulary: {
    src: '/media/casa/classroom-map-vocabulary.jpg',
    alt: {
      en: 'CASA learner notes beside a Bremen map during German practice',
      de: 'Notizen eines CASA Lernenden neben einem Bremen-Stadtplan im Deutschunterricht',
    },
    caption: {
      en: 'Language planning connects vocabulary, movement, and real city context.',
      de: 'Sprachplanung verbindet Wortschatz, Orientierung und echte Stadtsituationen.',
    },
  },
  juniorClassroomListening: {
    src: '/media/casa/junior-classroom-listening.jpg',
    alt: {
      en: 'young CASA group-course learners listening during class',
      de: 'Jüngere CASA Teilnehmende eines Gruppenkurses hören im Unterricht zu',
    },
    caption: {
      en: 'Focused classroom time gives visiting groups a shared learning rhythm.',
      de: 'Konzentrierter Unterricht gibt Gruppen einen gemeinsamen Lernrhythmus.',
    },
  },
  classroomPairStudy: {
    src: '/media/casa/classroom-pair-study.jpg',
    alt: {
      en: 'CASA learners studying together with course materials',
      de: 'CASA Lernende arbeiten gemeinsam mit Kursmaterialien',
    },
    caption: {
      en: 'Pair work keeps feedback immediate and practical.',
      de: 'Partnerarbeit macht Feedback direkt und praktisch.',
    },
  },
  hostFamilyDinner: {
    src: '/media/casa/host-family-room.jpg',
    alt: {
      en: 'private room in a CASA host-family accommodation context',
      de: 'Privates Zimmer im CASA Gastfamilien-Kontext',
    },
    caption: {
      en: 'Accommodation support is about feeling settled enough to learn.',
      de: 'Unterkunftsbegleitung bedeutet, gut anzukommen und lernen zu können.',
    },
  },
  sharedFlat: {
    src: '/media/casa/student-room-balcony.jpg',
    alt: {
      en: 'bright student room with a bed, desk, and balcony doors',
      de: 'Helles Studierendenzimmer mit Bett, Schreibtisch und Balkontüren',
    },
    caption: {
      en: 'Student housing works best when study, rest, and daily life have space.',
      de: 'Studentisches Wohnen gelingt, wenn Lernen, Ruhe und Alltag Platz haben.',
    },
  },
  sharedFlatKitchen: {
    src: '/media/casa/student-shared-kitchen.jpg',
    alt: {
      en: 'student accommodation kitchen with a table and study materials',
      de: 'Küche einer Studierendenunterkunft mit Tisch und Lernmaterial',
    },
    caption: {
      en: 'A practical shared kitchen helps students settle into routines quickly.',
      de: 'Eine gemeinsame Küche erleichtert den Start in den Alltag.',
    },
  },
  studentPortrait: {
    src: '/media/casa/learner-conversation-smile.jpg',
    alt: {
      en: 'CASA learners smiling during an active classroom conversation',
      de: 'CASA Lernende lächeln während eines aktiven Unterrichtsgesprächs',
    },
    caption: {
      en: 'Confidence grows when learners can try, laugh, and keep speaking.',
      de: 'Sicherheit wächst, wenn Lernende ausprobieren, lachen und weitersprechen.',
    },
  },
  mentorSupport: {
    src: '/media/casa/advising-session-classroom.jpg',
    alt: {
      en: 'CASA teacher supporting adult learners during a classroom exercise',
      de: 'CASA Lehrkraft begleitet erwachsene Lernende bei einer Kursübung',
    },
    caption: {
      en: 'Targeted coaching helps learners close gaps quickly.',
      de: 'Gezieltes Coaching hilft, Lernlücken schnell zu schließen.',
    },
  },
  examPrepTable: {
    src: '/media/casa/exam-preparation-writing.jpg',
    alt: {
      en: 'hands writing German exam preparation notes beside telc B2 materials',
      de: 'Hände schreiben Notizen zur Prüfungsvorbereitung neben telc B2 Material',
    },
    caption: {
      en: 'Structured preparation brings clarity before exam day.',
      de: 'Strukturierte Vorbereitung schafft Klarheit vor dem Prüfungstag.',
    },
  },
  consultationDesk: {
    src: '/media/casa/individual-tutoring.jpg',
    alt: {
      en: 'one-to-one German learning support in a CASA classroom setting',
      de: 'Individuelle Deutschlern-Begleitung in einer CASA Kursumgebung',
    },
    caption: {
      en: 'Clear guidance makes next steps easy to understand.',
      de: 'Klare Beratung macht die nächsten Schritte einfach verständlich.',
    },
  },
  campusDiscussion: {
    src: '/media/casa/course-discussion-row.jpg',
    alt: {
      en: 'international learners speaking together during a CASA lesson',
      de: 'Internationale Lernende sprechen gemeinsam in einem CASA Kurs',
    },
    caption: {
      en: 'Language learning grows through community exchange.',
      de: 'Sprachlernen wächst durch Austausch in der Community.',
    },
  },
  studentSuccess: {
    src: '/media/casa/learners-writing-class.jpg',
    alt: {
      en: 'CASA learners concentrating on written German practice',
      de: 'CASA Lernende konzentrieren sich auf schriftliche Deutschübungen',
    },
    caption: {
      en: 'Consistent progress builds confidence for study and work.',
      de: 'Konstanter Fortschritt schafft Sicherheit für Studium und Beruf.',
    },
  },
  teamCollaboration: {
    src: '/media/casa/business-german-group.jpg',
    alt: {
      en: 'adult learners in a business German discussion at CASA',
      de: 'Erwachsene Lernende in einer Business-Deutsch-Diskussion bei CASA',
    },
    caption: {
      en: 'Professional language work stays practical when people use it together.',
      de: 'Berufliche Sprachpraxis bleibt konkret, wenn Menschen sie gemeinsam anwenden.',
    },
  },
  studentClassroomFocus: {
    src: '/media/casa/course-classroom-wide.jpg',
    alt: {
      en: 'CASA learners focused during a group German course',
      de: 'CASA Lernende konzentrieren sich in einem Gruppenkurs',
    },
    caption: {
      en: 'Focused group learning keeps progress grounded in real classroom practice.',
      de: 'Konzentriertes Lernen in der Gruppe verankert Fortschritt in echter Unterrichtspraxis.',
    },
  },
  studentGroupActivityOutdoor: {
    src: '/media/casa/group-course-phone-task.jpg',
    alt: {
      en: 'CASA group-course students solving an outdoor Bremen task together',
      de: 'CASA Teilnehmende eines Gruppenkurses lösen gemeinsam eine Aufgabe in Bremen',
    },
    caption: {
      en: 'Learning extends beyond classrooms through interactive outdoor tasks.',
      de: 'Lernen findet durch interaktive Aufgaben auch außerhalb des Klassenzimmers statt.',
    },
  },
  studentGroupExcursion: {
    src: '/media/casa/group-course-bremen-musicians.jpg',
    alt: {
      en: 'CASA group-course students visiting the Bremen Town Musicians',
      de: 'CASA Teilnehmende eines Gruppenkurses besuchen die Bremer Stadtmusikanten',
    },
    caption: {
      en: 'Connecting language training with local history and culture.',
      de: 'Verbindung von Sprachtraining mit lokaler Geschichte und Kultur.',
    },
  },
  studentYoungTestimonial: {
    src: '/media/casa/learner-conversation-smile.jpg',
    alt: {
      en: 'CASA learners smiling during an active classroom conversation',
      de: 'CASA Lernende lächeln während eines aktiven Unterrichtsgesprächs',
    },
    caption: {
      en: 'Learner stories should be supported by real CASA learning scenes.',
      de: 'Teilnehmergeschichten sollen durch echte CASA Lernmomente getragen werden.',
    },
  },
  studentTestimonialPortrait1: {
    src: '/media/casa/learner-conversation-smile.jpg',
    alt: {
      en: 'CASA learners smiling during an active classroom conversation',
      de: 'CASA Lernende lächeln während eines aktiven Unterrichtsgesprächs',
    },
    caption: {
      en: 'Story imagery now uses classroom moments instead of unrelated portraits.',
      de: 'Story-Bilder nutzen jetzt Unterrichtsmomente statt unpassender Porträts.',
    },
  },
  studentTestimonialPortrait2: {
    src: '/media/casa/learners-writing-class.jpg',
    alt: {
      en: 'CASA learners concentrating on written German practice',
      de: 'CASA Lernende konzentrieren sich auf schriftliche Deutschübungen',
    },
    caption: {
      en: 'Language confidence grows from small victories every week.',
      de: 'Sprachsicherheit wächst durch kleine Erfolgserlebnisse jede Woche.',
    },
  },
  studentTestimonialPortrait3: {
    src: '/media/casa/course-discussion-row.jpg',
    alt: {
      en: 'CASA learners listening and speaking during a classroom discussion',
      de: 'CASA Lernende hören zu und sprechen in einer Kursdiskussion',
    },
    caption: {
      en: 'Every learner brings a different story; classroom scenes keep the page honest.',
      de: 'Jede lernende Person bringt eine andere Geschichte mit; Unterrichtsszenen bleiben ehrlich.',
    },
  },
  schoolEntrance: {
    src: '/media/casa/school-entrance-sign.jpg',
    alt: {
      en: 'CASA Bremen exterior sign at the school entrance',
      de: 'CASA Bremen Außenschild am Schuleingang',
    },
    caption: {
      en: 'A neutral CASA location image for practical and legal pages.',
      de: 'Ein neutrales CASA Standortbild für praktische und rechtliche Seiten.',
    },
  },
};

export const publicPageConfigMap: Record<PublicRouteKey, PublicPageConfig> = {
  home: {
    heroType: 'home-photo',
    sections: [
      'proof-strip',
      'partner-strip',
      'more-than-school',
      'guided-programs',
      'community-band',
      'accommodation-story',
      'stats-row',
      'testimonials',
      'final-cta',
    ],
    ctas: [
      { label: { en: 'Find my course', de: 'Kurs finden' }, href: '/courses', kind: 'primary' },
      { label: { en: 'Talk to an advisor', de: 'Beratung anfragen' }, href: '/contact', kind: 'secondary' },
    ],
    photos: {
      /*
        The homepage headline is CASA's Leitbild — "Miteinander reden -
        aufeinander zugehen". This image shows learners listening and speaking,
        so it depicts the line rather than decorating it. `studentClass` (people
        working quietly at a table) illustrated study, not conversation.
      */
      hero: photoLibrary.groupClassroomTeacherActivity,
      story: photoLibrary.groupCourseLunch,
      /*
        The four flagship course rows, matched to what each format actually is
        rather than to whatever was next in the library:
          Intensive -> a full class mid-lesson, whole room engaged
          Evening   -> adults in work clothes at the whiteboard after hours
          Special   -> one-to-one, informal, a single focused session
      */
      courseA: photoLibrary.courseClassroomCircle,
      courseB: photoLibrary.whiteboardPractice,
      courseC: photoLibrary.consultationDesk,
      courseD: photoLibrary.groupCourseWalking,
      courseE: photoLibrary.mentorSupport,
      courseF: photoLibrary.teamCollaboration,
      accommodation: photoLibrary.hostFamilyDinner,
      testimonial: photoLibrary.studentPortrait,
      testimonialA: photoLibrary.studentTestimonialPortrait1,
      testimonialB: photoLibrary.studentTestimonialPortrait2,
      testimonialC: photoLibrary.studentTestimonialPortrait3,
    },
  },
  about: {
    heroType: 'home-photo',
    sections: ['proof-mini', 'mission-story', 'timeline', 'team-grid', 'testimonials'],
    ctas: [
      { label: { en: 'Talk to admissions', de: 'Beratung anfragen' }, href: '/contact', kind: 'primary' },
      { label: { en: 'Find my course path', de: 'Passenden Kurs finden' }, href: '/courses', kind: 'secondary' },
    ],
    photos: {
      hero: photoLibrary.groupClassroomTeacherActivity,
      mission: photoLibrary.groupCourseBremenMusicians,
      team: photoLibrary.teamCollaboration,
      testimonialA: photoLibrary.studentTestimonialPortrait1,
      testimonialB: photoLibrary.studentTestimonialPortrait2,
      testimonialC: photoLibrary.studentTestimonialPortrait3,
    },
  },
  team: {
    heroType: 'home-photo',
    sections: ['team-directory', 'people-story', 'community-snippet'],
    ctas: [
      { label: { en: 'Talk to admissions', de: 'Beratung anfragen' }, href: '/contact', kind: 'primary' },
      { label: { en: 'Find my course path', de: 'Passenden Kurs finden' }, href: '/courses', kind: 'secondary' },
    ],
    photos: {
      hero: photoLibrary.studentClass,
      mission: photoLibrary.campusDiscussion,
      team: photoLibrary.studentPortrait,
      testimonialA: photoLibrary.studentTestimonialPortrait1,
      testimonialB: photoLibrary.studentTestimonialPortrait2,
      testimonialC: photoLibrary.studentTestimonialPortrait3,
    },
  },
  courses: {
    heroType: 'index-chooser',
    sections: ['featured-courses', 'how-it-works', 'proof-mini', 'faq-topics'],
    ctas: [
      { label: { en: 'Reserve course spot', de: 'Zur Kursanmeldung' }, href: '/registration/course', kind: 'primary' },
      { label: { en: 'Get level recommendation', de: 'Einstufung starten' }, href: '/placement-test', kind: 'secondary' },
    ],
    photos: {
      thumbA: photoLibrary.groupClassroomTeacherActivity,
      thumbB: photoLibrary.courseClassroomWide,
      thumbC: photoLibrary.teacherGuiding,
      thumbD: photoLibrary.groupCourseLunch,
      thumbE: photoLibrary.classroomMapVocabulary,
      thumbF: photoLibrary.teamCollaboration,
      story: photoLibrary.groupCourseLunch,
      guidance: photoLibrary.groupClassroomTeacherActivity,
    },
  },
  'course-detail': {
    heroType: 'detail-utility',
    sections: ['outcomes', 'weekly-rhythm', 'for-whom', 'materials', 'next-steps', 'faq', 'related-courses'],
    ctas: [
      { label: { en: 'Reserve this course', de: 'Kurs anfragen' }, href: '/registration/course', kind: 'primary' },
      { label: { en: 'Talk to admissions', de: 'Beratung anfragen' }, href: '/contact', kind: 'secondary' },
    ],
    photos: {
      supportCard: photoLibrary.consultationDesk,
      intensive: photoLibrary.groupClassroomTeacherActivity,
      evening: photoLibrary.courseClassroomCircle,
      special: photoLibrary.teacherGuiding,
      groups: photoLibrary.groupCourseLunch,
      groupsStory: photoLibrary.groupClassroomTeacherActivity,
      medical: photoLibrary.mentorSupport,
      company: photoLibrary.teamCollaboration,
      bildungszeit: photoLibrary.campusDiscussion,
      academic: photoLibrary.classroomMapVocabulary,
      business: photoLibrary.teamCollaboration,
      testimonialA: photoLibrary.studentTestimonialPortrait1,
      testimonialB: photoLibrary.studentTestimonialPortrait2,
      testimonialC: photoLibrary.studentTestimonialPortrait3,
    },
  },
  exams: {
    heroType: 'index-chooser',
    sections: ['exam-cards', 'pathway', 'proof-mini'],
    ctas: [
      // One entry, not two. "Check exam dates" was a second, differently
      // labelled CTA pointing at the identical href — the same click, offered
      // twice, which reads as a choice and is not one.
      { label: { en: 'Reserve exam seat', de: 'Zur Prüfungsanmeldung' }, href: '/registration/exam', kind: 'primary' },
    ],
    photos: {
      thumbA: photoLibrary.examPrepTable,
      thumbB: photoLibrary.studyMaterials,
      thumbC: photoLibrary.studentSuccess,
    },
  },
  'exam-detail': {
    heroType: 'detail-utility',
    sections: ['exam-timeline', 'what-to-bring', 'faq'],
    ctas: [
      { label: { en: 'Reserve exam seat', de: 'Zur Prüfungsanmeldung' }, href: '/registration/exam', kind: 'primary' },
      { label: { en: 'Get exam guidance', de: 'Prüfungsberatung anfragen' }, href: '/contact', kind: 'secondary' },
    ],
    photos: {
      supportCard: photoLibrary.examPrepTable,
      testimonialA: photoLibrary.studentTestimonialPortrait1,
      testimonialB: photoLibrary.studentTestimonialPortrait2,
      testimonialC: photoLibrary.studentTestimonialPortrait3,
    },
  },
  accommodation: {
    heroType: 'index-chooser',
    sections: ['option-cards', 'trust-panel', 'photo-story', 'faq'],
    ctas: [
      { label: { en: 'Request housing match', de: 'Unterkunft anfragen' }, href: '/contact?topic=accommodation', kind: 'primary' },
      { label: { en: 'Reserve course + housing', de: 'Kurs und Unterkunft anfragen' }, href: '/registration/course', kind: 'secondary' },
    ],
    photos: {
      thumbA: photoLibrary.sharedFlat,
      thumbB: photoLibrary.hostFamilyDinner,
      thumbC: photoLibrary.sharedFlatKitchen,
      story: photoLibrary.hostFamilyDinner,
    },
  },
  'accommodation-detail': {
    heroType: 'detail-utility',
    sections: ['living-snapshot', 'comparison-bullets', 'request-cta', 'faq'],
    ctas: [
      { label: { en: 'Request housing match', de: 'Unterkunft anfragen' }, href: '/contact?topic=accommodation', kind: 'primary' },
      { label: { en: 'Talk to admissions', de: 'Beratung anfragen' }, href: '/contact', kind: 'secondary' },
    ],
    photos: {
      supportCard: photoLibrary.sharedFlatKitchen,
      story: photoLibrary.hostFamilyDinner,
    },
  },
  imprint: {
    heroType: 'minimal-utility',
    sections: ['legal-content'],
    ctas: [{ label: { en: 'Contact office', de: 'Büro kontaktieren' }, href: '/contact', kind: 'primary' }],
    photos: {},
  },
  privacy: {
    heroType: 'minimal-utility',
    sections: ['legal-content'],
    ctas: [{ label: { en: 'Contact office', de: 'Büro kontaktieren' }, href: '/contact', kind: 'primary' }],
    photos: {},
  },
  terms: {
    heroType: 'minimal-utility',
    sections: ['legal-content'],
    ctas: [{ label: { en: 'Contact office', de: 'Büro kontaktieren' }, href: '/contact', kind: 'primary' }],
    photos: {},
  },
  faq: {
    heroType: 'minimal-utility',
    sections: ['faq-topics', 'quick-help'],
    ctas: [{ label: { en: 'Contact office', de: 'Büro kontaktieren' }, href: '/contact', kind: 'primary' }],
    photos: {},
  },
  contact: {
    heroType: 'minimal-utility',
    sections: ['contact-cards', 'contact-form', 'map-placeholder'],
    ctas: [{ label: { en: 'Get my CASA plan', de: 'CASA-Plan anfragen' }, href: '/contact', kind: 'primary' }],
    photos: {
      support: photoLibrary.consultationDesk,
    },
  },
};

function localize(text: LocalizedText, locale: ContentLocale) {
  return locale === 'de' ? text.de : text.en;
}

export function getPublicPageConfig(route: PublicRouteKey, locale: ContentLocale): LocalizedPublicPageConfig {
  const config = publicPageConfigMap[route];

  const localizedCtas: LocalizedPageCta[] = config.ctas.map((cta) => ({
    label: localize(cta.label, locale),
    href: cta.href,
    kind: cta.kind,
  }));

  const localizedPhotos: Record<string, LocalizedPhotoPlaceholder> = Object.fromEntries(
    Object.entries(config.photos).map(([key, photo]) => [
      key,
      {
        src: photo.src,
        alt: localize(photo.alt, locale),
        caption: localize(photo.caption, locale),
      },
    ])
  );

  return {
    heroType: config.heroType,
    sections: config.sections,
    ctas: localizedCtas,
    photos: localizedPhotos,
  };
}
