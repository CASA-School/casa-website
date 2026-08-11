type HeroMediaKey =
  | 'home'
  | 'about'
  | 'courses'
  | 'course-detail'
  | 'exams'
  | 'exam-detail'
  | 'accommodation'
  | 'accommodation-detail'
  | 'contact'
  | 'faq'
  | 'news'
  | 'news-detail'
  | 'placement-test'
  | 'registration-course'
  | 'registration-exam'
  | 'imprint'
  | 'privacy'
  | 'terms';

type HeroMediaAsset = {
  casaPath: string;
  placeholderPath: string;
};

const heroMediaCatalog: Record<HeroMediaKey, HeroMediaAsset> = {
  home: {
    casaPath: '/media/casa/classroom-community-table.jpg',
    placeholderPath: '/media/casa/classroom-community-table.jpg',
  },
  about: {
    casaPath: '/media/casa/group-course-bremen-musicians.jpg',
    placeholderPath: '/media/casa/group-course-bremen-musicians.jpg',
  },
  courses: {
    casaPath: '/media/casa/group-classroom-teacher-activity.jpg',
    placeholderPath: '/media/casa/group-classroom-teacher-activity.jpg',
  },
  'course-detail': {
    casaPath: '/media/casa/group-course-lunch-table.jpg',
    placeholderPath: '/media/casa/group-course-lunch-table.jpg',
  },
  exams: {
    casaPath: '/media/casa/exam-preparation-writing.jpg',
    placeholderPath: '/media/casa/exam-preparation-writing.jpg',
  },
  'exam-detail': {
    casaPath: '/media/casa/exam-preparation-writing.jpg',
    placeholderPath: '/media/casa/exam-preparation-writing.jpg',
  },
  accommodation: {
    casaPath: '/media/casa/student-room-balcony.jpg',
    placeholderPath: '/media/casa/student-room-balcony.jpg',
  },
  'accommodation-detail': {
    casaPath: '/media/casa/host-family-room.jpg',
    placeholderPath: '/media/casa/host-family-room.jpg',
  },
  contact: {
    casaPath: '/media/casa/advising-session-classroom.jpg',
    placeholderPath: '/media/casa/advising-session-classroom.jpg',
  },
  faq: {
    casaPath: '/media/casa/school-entrance-sign.jpg',
    placeholderPath: '/media/casa/school-entrance-sign.jpg',
  },
  news: {
    casaPath: '/media/casa/learner-conversation-smile.jpg',
    placeholderPath: '/media/casa/learner-conversation-smile.jpg',
  },
  'news-detail': {
    casaPath: '/media/casa/classroom-community-table.jpg',
    placeholderPath: '/media/casa/classroom-community-table.jpg',
  },
  'placement-test': {
    casaPath: '/media/casa/study-materials-map.jpg',
    placeholderPath: '/media/casa/study-materials-map.jpg',
  },
  'registration-course': {
    casaPath: '/media/casa/advising-session-classroom.jpg',
    placeholderPath: '/media/casa/advising-session-classroom.jpg',
  },
  'registration-exam': {
    casaPath: '/media/casa/exam-preparation-writing.jpg',
    placeholderPath: '/media/casa/exam-preparation-writing.jpg',
  },
  imprint: {
    casaPath: '/media/casa/school-entrance-sign.jpg',
    placeholderPath: '/media/casa/school-entrance-sign.jpg',
  },
  privacy: {
    casaPath: '/media/casa/school-entrance-sign.jpg',
    placeholderPath: '/media/casa/school-entrance-sign.jpg',
  },
  terms: {
    casaPath: '/media/casa/school-entrance-sign.jpg',
    placeholderPath: '/media/casa/school-entrance-sign.jpg',
  },
};

function preferCasaMedia() {
  const value = process.env.NEXT_PUBLIC_USE_CASA_MEDIA;
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function resolveHeroMedia(key: HeroMediaKey) {
  const asset = heroMediaCatalog[key];
  return preferCasaMedia() ? asset.casaPath : asset.placeholderPath;
}
