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
  aspectRatio?: string;
  objectPosition?: string;
  /** Tailwind object-position classes, for a focal point that changes by breakpoint. */
  objectPositionClassName?: string;
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
  aspectRatio?: string;
  objectPosition?: string;
  objectPositionClassName?: string;
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
    src: '/media/casa/course-special-smartboard.webp',
    alt: {
      en: 'The teacher speaks at the smart board while her class works on an exercise',
      de: 'Die Lehrerin spricht am digitalen Whiteboard, ihre Klasse arbeitet an einer Übung',
    },
    caption: {
      en: 'Focused practice: grammar, writing and speaking.',
      de: 'Gezielt üben: Grammatik, Schreiben, Sprechen.',
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
      en: 'A visiting school group at lunch together in the courtyard',
      de: 'Eine Schülergruppe beim gemeinsamen Mittagessen im Innenhof',
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
    src: '/media/casa/course-intensive-class.webp',
    alt: {
      en: 'Learners at a long table by the window, following a German lesson',
      de: 'Teilnehmerinnen an einem langen Tisch am Fenster folgen dem Deutschunterricht',
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
    src: '/media/casa/course-evening-table.webp',
    alt: {
      en: 'Three learners laughing over a shared exercise at the course table',
      de: 'Drei Teilnehmende lachen bei einer gemeinsamen Übung am Kurstisch',
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
      en: 'The dining table in a host family\'s home, with the open kitchen beyond',
      de: 'Der Esstisch in der Wohnung einer Gastfamilie, dahinter die offene Küche',
    },
    caption: {
      en: 'Accommodation support is about feeling settled enough to learn.',
      de: 'Unterkunftsbegleitung bedeutet, gut anzukommen und lernen zu können.',
    },
  },
  sharedFlat: {
    src: '/media/casa/student-room-balcony.jpg',
    alt: {
      en: 'A bright room in a CASA shared flat with a bed, a desk and balcony doors',
      de: 'Ein helles Zimmer in einer CASA-WG mit Bett, Schreibtisch und Balkontür',
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
  /*
    AWAITING A REAL PHOTOGRAPH. There is no clinical/medical image in the media
    library, so German for Medical previously borrowed `mentorSupport` — a
    generic advising shot that is also the /contact and registration hero. That
    made the one course with a genuinely distinct audience look like every
    other page.

    The file does not exist yet on purpose. While placeholders are on, the slot
    renders as numbered colour (37), which is the request for the photograph.
    See docs/MEDIA_PHOTO_NUMBERS.md.
  */
  medicalConsultation: {
    src: '/media/casa/medical-german-consultation.jpg',
    alt: {
      en: 'healthcare professionals practising German for a patient consultation',
      de: 'medizinische Fachkräfte üben Deutsch für ein Patientengespräch',
    },
    caption: {
      en: 'Medical German is practised through real consultation situations.',
      de: 'Medizinisches Deutsch wird an echten Gesprächssituationen geübt.',
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
      en: 'A hand writing the letter task on a telc Deutsch B2 answer sheet',
      de: 'Eine Hand schreibt die Briefaufgabe auf einem Antwortbogen der telc-Prüfung Deutsch B2',
    },
    caption: {
      en: 'Structured preparation brings clarity before exam day.',
      de: 'Strukturierte Vorbereitung schafft Klarheit vor dem Prüfungstag.',
    },
  },
  consultationDesk: {
    src: '/media/casa/individual-tutoring.jpg',
    alt: {
      en: 'One person explains a worksheet to another across the desk',
      de: 'Eine Person erklärt einer anderen am Tisch ein Arbeitsblatt',
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
      en: 'Two learners writing in class, one of them laughing',
      de: 'Zwei Teilnehmerinnen schreiben im Unterricht, eine lacht dabei',
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
    src: '/media/casa/course-intensive-class.webp',
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
  buildingGolden: {
    src: '/media/casa/casa-building-golden.webp',
    alt: {
      en: 'The CASA school building in Bremen in warm evening light',
      de: 'Das CASA-Schulgebäude in Bremen im warmen Abendlicht',
    },
    caption: { en: 'Welcome to CASA in Bremen.', de: 'Willkommen bei CASA in Bremen.' },
    aspectRatio: '4 / 3',
    objectPosition: '50% 27%',
  },
  buildingDaylight: {
    src: '/media/casa/casa-building-daylight.webp',
    alt: {
      en: 'The CASA school building with its entrance and language school signs',
      de: 'Das CASA-Schulgebäude mit Eingang und Sprachschul-Schriftzügen',
    },
    caption: { en: 'Our school in Bremen.', de: 'Unsere Schule in Bremen.' },
    aspectRatio: '4 / 3',
    objectPosition: '50% 27%',
  },
  /*
   * THE HOMEPAGE HERO. A real photograph: a 5:4 crop of camera original 093
   * with global light and colour correction only, built and checked by
   * scripts/media/build_reel.py (slot 54). It replaced the full-width reel on
   * 2026-10-01; the reel's four crops (slots 50–53) stay in the registry.
   */
  heroLesson: {
    src: '/media/casa/hero-classroom-lesson.webp',
    alt: {
      de: 'Eine Lehrerin hält lachend ein Arbeitsblatt hoch, an der Tafel stehen die Wechselpräpositionen',
      en: 'A teacher laughs as she holds up a worksheet, with German two-way prepositions on the board',
    },
    caption: { de: 'Gemeinsam lernen', en: 'Learning together' },
    /*
     * Both faces, the worksheet and the board heading stay in at every width
     * from 320 to 1920px. The 24rem tablet box (768-1023px) is a band up to
     * 2.5:1, so it looks lower in the frame than the others.
     */
    objectPositionClassName: 'object-[34%_0%] md:max-lg:object-[34%_39%]',
  },
  /*
   * THE ABOUT HERO. The CASA team in the school courtyard: camera original 098
   * as its whole 3:2 frame, light and colour correction only (slot 55,
   * scripts/media/build_reel.py). The group spans the full width, so the hero
   * shows the frame at its own proportions rather than cropping someone off.
   */
  heroTeam: {
    src: '/media/casa/about-team-courtyard.webp',
    alt: {
      de: 'Das CASA-Team steht gemeinsam im begrünten Innenhof der Schule und lächelt in die Kamera',
      en: 'The CASA team standing together in the school\'s leafy courtyard, smiling at the camera',
    },
    caption: { de: 'Das CASA-Team', en: 'The CASA team' },
    aspectRatio: '3 / 2',
  },
  /*
   * THE HOMEPAGE'S "WIR HÖREN ZU" (slot 56): the teacher with smiling learners.
   * Its own slot, not slot 17: that one is the advising photograph of the
   * contact and registration heroes.
   */
  classWelcome: {
    src: '/media/casa/home-class-welcome.webp',
    alt: {
      de: 'Eine Lehrerin und lächelnde Teilnehmende im Unterricht',
      en: 'A teacher with smiling learners in class',
    },
    caption: { de: 'Persönlich begleitet', en: 'Personal support' },
  },
  /*
   * COURSE-PAGE PHOTOGRAPHS (2026-10-02). Each course's hero is a 2.4:1 crop
   * composed for the hero band (`<course>Hero`); its second photo (`<course>Story`)
   * is a different picture, so no course page shows the same photo twice.
   */
  intensiveHero: {
    src: '/media/casa/course-intensive-hero.webp',
    alt: { de: 'Teilnehmerinnen am langen Tisch am Fenster im Deutschunterricht', en: 'Learners at the long table by the window in a German lesson' },
    caption: { de: 'Intensivkurse', en: 'Intensive courses' },
  },
  intensiveStory: {
    src: '/media/casa/course-intensive-story.webp',
    alt: { de: 'Die Lehrerin erklärt am Bildschirm, die Teilnehmerinnen hören zu', en: 'The teacher explains at the screen while the learners listen' },
    caption: { de: 'Im Kurs', en: 'In class' },
  },
  eveningHero: {
    src: '/media/casa/course-evening-hero.webp',
    alt: { de: 'Drei Teilnehmende lachen bei einer gemeinsamen Übung', en: 'Three learners laughing over a shared exercise' },
    caption: { de: 'Abendkurse', en: 'Evening courses' },
  },
  specialHero: {
    src: '/media/casa/course-special-hero.webp',
    alt: { de: 'Die Lehrerin am digitalen Whiteboard, vor ihr die Klasse', en: 'The teacher at the smart board, her class in front of her' },
    caption: { de: 'Spezialkurse', en: 'Special courses' },
  },
  bildungszeitClass: {
    src: '/media/casa/course-bildungszeit-class.webp',
    alt: { de: 'Ein Teilnehmer lächelt von seiner Übung auf, die Lehrerin schreibt Grammatik an die Tafel', en: 'A learner smiles up from his exercise while the teacher writes grammar on the board' },
    caption: { de: 'Bildungszeit', en: 'Bildungszeit' },
  },
  bildungszeitHero: {
    src: '/media/casa/course-bildungszeit-hero.webp',
    alt: { de: 'Teilnehmende schreiben, die Lehrerin schreibt Grammatik an die Tafel', en: 'Learners writing while the teacher writes grammar on the board' },
    caption: { de: 'Bildungszeit', en: 'Bildungszeit' },
  },
  companyClassroom: {
    src: '/media/casa/course-company-classroom.webp',
    alt: { de: 'Ein heller CASA-Kursraum, das Logo auf dem Bildschirm', en: 'A bright CASA classroom, the logo on the screen' },
    caption: { de: 'Firmenunterricht', en: 'In-company teaching' },
  },
  companyHero: {
    src: '/media/casa/course-company-hero.webp',
    alt: { de: 'Ein heller CASA-Kursraum mit Tischen und Stühlen', en: 'A bright CASA classroom with tables and chairs' },
    caption: { de: 'Firmenunterricht', en: 'In-company teaching' },
  },
  /*
   * A ROOM IN A CASA SHARED FLAT (slot 57), for the homepage's "Ein eigenes
   * Zimmer". Its own slot, not slot 26: /accommodation/become-host shows slot
   * 26's file to people offering a room in their own home, and a WG room must
   * not stand in for a host family's (hard rule 5).
   */
  wgRoom: {
    src: '/media/casa/casa-wg-room.webp',
    alt: {
      de: 'Ein Einzelzimmer in einer CASA-WG mit Bett, Sessel und Schreibtisch',
      en: 'A single room in a CASA shared flat with a bed, an armchair and a desk',
    },
    caption: { de: 'Ein eigenes Zimmer', en: 'A room of your own' },
  },
  /*
   * EXAM PAGES (2026-10-02). The index leads with learners writing (slot 11),
   * the B2 card is the telc answer sheet (18), the C1 card two learners over
   * their texts (68). Each exam page has a 2.4:1 hero crop for lg up and a
   * different second photo, as the course pages do.
   */
  examB2Hero: {
    src: '/media/casa/exam-b2-hero.webp',
    alt: { de: 'Eine Hand schreibt die Briefaufgabe der telc-Prüfung Deutsch B2', en: 'A hand writing the letter task of the telc Deutsch B2 exam' },
    caption: { de: 'telc Deutsch B2', en: 'telc Deutsch B2' },
  },
  examB2Class: {
    src: '/media/casa/exam-b2-class.webp',
    alt: { de: 'Drei Teilnehmerinnen schreiben konzentriert am Kurstisch', en: 'Three learners writing at the course table' },
    caption: { de: 'Vorbereitung im Kurs', en: 'Preparing in class' },
  },
  examC1: {
    src: '/media/casa/exam-c1-writing.webp',
    alt: { de: 'Zwei Teilnehmerinnen arbeiten konzentriert an ihren Texten', en: 'Two learners concentrating on their texts' },
    caption: { de: 'telc Deutsch C1 Hochschule', en: 'telc Deutsch C1 Hochschule' },
  },
  examC1Hero: {
    src: '/media/casa/exam-c1-hero.webp',
    alt: { de: 'Zwei Teilnehmerinnen arbeiten konzentriert an ihren Texten', en: 'Two learners concentrating on their texts' },
    caption: { de: 'telc Deutsch C1 Hochschule', en: 'telc Deutsch C1 Hochschule' },
  },
  examC1Class: {
    src: '/media/casa/exam-c1-speaking.webp',
    alt: { de: 'Ein Teilnehmer spricht lächelnd über den Tisch hinweg', en: 'A learner speaking across the table, smiling' },
    caption: { de: 'Sprechen üben', en: 'Speaking practice' },
  },
  examStory: {
    src: '/media/casa/exam-story-writing.webp',
    alt: { de: 'Ein Stift in der Hand, dahinter schreibt die Klasse', en: 'A pen in hand, the class writing behind it' },
    caption: { de: 'Mit Ruhe vorbereiten', en: 'Calm preparation' },
  },
  /*
   * ACCOMMODATION (2026-10-02). Host-family photographs come from one real
   * Bremen household (consent CASA 2026-09-15, website use cleared by Rahman
   * 2026-10-02); CASA-WG photographs from the pool. A WG photo never stands
   * in for a host family's, or the other way round (CLAUDE.md hard rule 5).
   */
  hostFamilyLivingHero: {
    src: '/media/casa/host-family-living-hero.webp',
    alt: { de: 'Der Esstisch in der Wohnung einer Gastfamilie, dahinter die offene Küche', en: 'The dining table in a host family\'s home, with the open kitchen beyond' },
    caption: { de: 'Wohnen in einer Gastfamilie', en: 'Living with a host family' },
  },
  hostFamilyKitchen: {
    src: '/media/casa/host-family-kitchen.webp',
    alt: { de: 'Die Küche einer Gastfamilie', en: 'A host family\'s kitchen' },
    caption: { de: 'Küche zum Mitbenutzen', en: 'A kitchen to share' },
  },
  hostFamilyKitchenDetail: {
    src: '/media/casa/host-family-kitchen-detail.webp',
    alt: { de: 'Die helle Küche einer Gastfamilie mit zwei Fenstern', en: 'A host family\'s bright kitchen with two windows' },
    caption: { de: 'Gastgeber werden', en: 'Become a host' },
  },
  hostFamilyKitchenHero: {
    src: '/media/casa/host-family-kitchen-hero.webp',
    alt: { de: 'Die helle Küche einer Gastfamilie mit zwei Fenstern', en: 'A host family\'s bright kitchen with two windows' },
    caption: { de: 'Gastgeber werden', en: 'Become a host' },
  },
  hostFamilyBathroom: {
    src: '/media/casa/host-family-guest-bathroom.webp',
    alt: { de: 'Das Gästebad einer Gastfamilie', en: 'A host family\'s guest bathroom' },
    caption: { de: 'Bad zum Mitbenutzen', en: 'A bathroom to share' },
  },
  hostFamilyTable: {
    src: '/media/casa/host-family-dining-table.webp',
    alt: { de: 'Der Esstisch einer Gastfamilie', en: 'A host family\'s dining table' },
    caption: { de: 'Am Tisch der Gastfamilie', en: 'At the host family\'s table' },
  },
  /* Awaited (slot 81): no host family's guest room has been photographed yet. */
  hostFamilyGuestRoom: {
    src: '/media/casa/host-family-guest-room.jpg',
    alt: { de: 'Ein Gästezimmer in einer Gastfamilie', en: 'A guest room in a host family' },
    caption: { de: 'Das Zimmer', en: 'The room' },
  },
  wgRoomSingle: {
    src: '/media/casa/student-room-alternative-1.jpg',
    alt: { de: 'Ein Einzelzimmer in einer CASA-WG mit Bett, Schreibtisch und Tulpen', en: 'A single room in a CASA shared flat with a bed, a desk and tulips' },
    caption: { de: 'Die CASA-WG', en: 'The CASA shared flat' },
  },
  wgRoomHero: {
    src: '/media/casa/casa-wg-room-hero.webp',
    alt: { de: 'Ein Einzelzimmer in einer CASA-WG mit Bett und großen Fenstern', en: 'A single room in a CASA shared flat with a bed and large windows' },
    caption: { de: 'Die CASA-WG', en: 'The CASA shared flat' },
  },
  wgKitchen: {
    src: '/media/casa/shared-flat-kitchen-table.jpg',
    alt: { de: 'Die Gemeinschaftsküche einer CASA-WG mit Esstisch', en: 'The shared kitchen of a CASA flat with its table' },
    caption: { de: 'Gemeinsame Küche', en: 'Shared kitchen' },
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
      // The editorial hero again (2026-10-01): text left, one photograph right,
      // as before the full-width reel. A lesson, because that is the school.
      // The building stays out: every image of it we have is AI-altered.
      hero: photoLibrary.heroLesson,
      story: photoLibrary.classWelcome,
      // "Leben bei CASA" (slots 20 and 23, both real photographs).
      lifeRegion: photoLibrary.groupCourseBremenMusicians,
      lifePeople: photoLibrary.groupCourseWalking,
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
      accommodation: photoLibrary.wgRoom,
      testimonial: photoLibrary.studentPortrait,
      testimonialA: photoLibrary.studentTestimonialPortrait1,
      testimonialB: photoLibrary.studentTestimonialPortrait2,
      testimonialC: photoLibrary.studentTestimonialPortrait3,
    },
  },
  about: {
    heroType: 'home-photo',
    sections: ['figures', 'mission-story', 'quality-standards', 'partners', 'learning-through-connection', 'tandem', 'testimonial'],
    ctas: [
      { label: { en: 'Talk to admissions', de: 'Beratung anfragen' }, href: '/contact', kind: 'primary' },
      { label: { en: 'Find my course path', de: 'Passenden Kurs finden' }, href: '/courses', kind: 'secondary' },
    ],
    photos: {
      // The people who run the school, not the building: slot 55.
      hero: photoLibrary.heroTeam,
      mission: photoLibrary.groupCourseBremenMusicians,
      /* The community-story block's photo, which used to borrow `hero`. */
      story: photoLibrary.groupClassroomTeacherActivity,
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
      // The team page's hero: the CASA team in the courtyard (slot 55, 3:2).
      team: photoLibrary.heroTeam,
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
      /*
        The hero photograph, and it may not be any one format's face.

        `courseClassroomWide` (thumbB) is Intensive German's identity
        photograph, `teacherGuiding` (thumbC) is Special Courses', and
        `groupClassroomTeacherActivity` — what this slot used to hold — is the
        homepage's hero. An index of six formats led by one format's photograph
        ranks them, which is the editorial choice the homepage makes and an
        index should not.

        `groupConversation` is a whole class with the teacher at the board and
        belongs to no format in `course-detail.photos`.
      */
      // The hero (thumbA): the homepage's lesson (slot 54), no format's photograph.
      thumbA: photoLibrary.heroLesson,
      thumbB: photoLibrary.courseClassroomWide,
      thumbC: photoLibrary.teacherGuiding,
      thumbD: photoLibrary.groupCourseLunch,
      thumbE: photoLibrary.classroomMapVocabulary,
      thumbF: photoLibrary.teamCollaboration,
      /*
        Neither of these may be a course's identity photograph. `story` sits
        beside a learner quote and `guidance` beside advising copy, so they are
        about the school rather than about a format — and they previously
        borrowed german-for-groups' photograph and the site's lead photograph
        respectively, which put a course's face on a section that is not about
        that course.
      */
      story: photoLibrary.studentPortrait,
      guidance: photoLibrary.mentorSupport,
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
      intensive: photoLibrary.courseClassroomWide,
      intensiveHero: photoLibrary.intensiveHero,
      intensiveStory: photoLibrary.intensiveStory,
      evening: photoLibrary.courseClassroomCircle,
      eveningHero: photoLibrary.eveningHero,
      eveningStory: photoLibrary.classWelcome,
      special: photoLibrary.teacherGuiding,
      specialHero: photoLibrary.specialHero,
      specialStory: photoLibrary.classroomMapVocabulary,
      // A group course at the Bremen Town Musicians (slot 20), a real photograph.
      groups: photoLibrary.groupCourseBremenMusicians,
      // A group lunch in the courtyard (slot 21, pool W009).
      groupsStory: photoLibrary.groupCourseLunch,
      medical: photoLibrary.medicalConsultation,
      company: photoLibrary.companyClassroom,
      companyHero: photoLibrary.companyHero,
      companyStory: photoLibrary.teacherGuiding,
      bildungszeit: photoLibrary.bildungszeitClass,
      bildungszeitHero: photoLibrary.bildungszeitHero,
      bildungszeitStory: photoLibrary.companyClassroom,
      academic: photoLibrary.classroomMapVocabulary,
      business: photoLibrary.whiteboardPractice,
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
      // telc B2 card (slot 18), telc C1 Hochschule card (68), the hero (11).
      thumbA: photoLibrary.examPrepTable,
      thumbB: photoLibrary.examC1,
      thumbC: photoLibrary.studentSuccess,
      // The candidate story: its own photo, so the B2 card's is not shown twice.
      story: photoLibrary.examStory,
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
      // Per exam, as on the course pages: the 4:3 crop (phones), a 2.4:1 hero
      // crop (lg up) and a different second photo.
      b2: photoLibrary.examPrepTable,
      b2Hero: photoLibrary.examB2Hero,
      b2Story: photoLibrary.examB2Class,
      c1: photoLibrary.examC1,
      c1Hero: photoLibrary.examC1Hero,
      c1Story: photoLibrary.examC1Class,
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
      // The hero (thumbC): a room in a CASA shared flat (slot 57), never a host family's.
      thumbC: photoLibrary.wgRoom,
      // "Ankommen und sich wohlfühlen": the host family's table, not the card's photo again.
      story: photoLibrary.hostFamilyTable,
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
      // Per type: the 4:3 crop (phones), a 2.4:1 hero crop (lg up), a second photo.
      flat: photoLibrary.wgRoomSingle,
      flatHero: photoLibrary.wgRoomHero,
      flatStory: photoLibrary.wgKitchen,
      host: photoLibrary.hostFamilyDinner,
      hostHero: photoLibrary.hostFamilyLivingHero,
      hostStory: photoLibrary.hostFamilyKitchen,
      // /accommodation/become-host
      becomeHost: photoLibrary.hostFamilyKitchenDetail,
      becomeHostHero: photoLibrary.hostFamilyKitchenHero,
      becomeHostStory: photoLibrary.hostFamilyDinner,
      becomeHostRoom: photoLibrary.hostFamilyGuestRoom,
      becomeHostAgreement: photoLibrary.hostFamilyBathroom,
      becomeHostPartnership: photoLibrary.hostFamilyKitchen,
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
        aspectRatio: photo.aspectRatio,
        objectPosition: photo.objectPosition,
        objectPositionClassName: photo.objectPositionClassName,
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
