export const NEWS_CATEGORIES = [
  'Study in Germany',
  'Living in Germany',
  'Why Germany',
  'Courses',
  'Exams',
  'Accommodation',
  'School Life',
  'Updates',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_ALLOWED_TAGS = [
  'study planning',
  'application deadlines',
  'uni-assist',
  'visa',
  'blocked account',
  'health insurance',
  'arrival checklist',
  'student housing',
  'anmeldung',
  'student budget',
  'part-time work',
  'german language',
  'integration',
  'course selection',
  'intensive courses',
  'placement test',
  'learning routine',
  'exam preparation',
  'telc',
  'accommodation support',
  'host family',
  'shared flats',
  'school community',
  'student support',
  'casa updates',
] as const;

export type NewsAllowedTag = (typeof NEWS_ALLOWED_TAGS)[number];

export const NEWS_CATEGORY_KEYWORD_RULES: Array<{
  category: NewsCategory;
  keywords: string[];
  seedTags: NewsAllowedTag[];
}> = [
  {
    category: 'Study in Germany',
    keywords: ['university', 'uni-assist', 'admission', 'application', 'degree', 'semester'],
    seedTags: ['study planning', 'application deadlines', 'uni-assist', 'visa', 'blocked account'],
  },
  {
    category: 'Living in Germany',
    keywords: ['arrival', 'anmeldung', 'insurance', 'budget', 'city registration', 'daily life'],
    seedTags: ['arrival checklist', 'anmeldung', 'health insurance', 'student budget', 'integration'],
  },
  {
    category: 'Why Germany',
    keywords: ['why germany', 'career', 'quality of life', 'opportunity', 'value'],
    seedTags: ['study planning', 'german language', 'integration', 'part-time work', 'student support'],
  },
  {
    category: 'Courses',
    keywords: ['course', 'class', 'curriculum', 'placement', 'lesson', 'intensive'],
    seedTags: ['course selection', 'placement test', 'intensive courses', 'learning routine', 'german language'],
  },
  {
    category: 'Exams',
    keywords: ['exam', 'certificate', 'telc', 'assessment', 'deadline', 'c1 hochschule', 'b2'],
    seedTags: ['exam preparation', 'telc', 'study planning', 'application deadlines'],
  },
  {
    category: 'Accommodation',
    keywords: ['accommodation', 'housing', 'flat', 'host family', 'rent', 'room'],
    seedTags: ['accommodation support', 'student housing', 'host family', 'shared flats', 'arrival checklist'],
  },
  {
    category: 'School Life',
    keywords: ['school life', 'community', 'classroom', 'teacher', 'student support', 'culture'],
    seedTags: ['school community', 'student support', 'learning routine', 'german language', 'integration'],
  },
];

export const NEWS_TAG_KEYWORDS: Array<{ tag: NewsAllowedTag; keywords: string[] }> = [
  { tag: 'study planning', keywords: ['plan', 'timeline', 'roadmap'] },
  { tag: 'application deadlines', keywords: ['deadline', 'intake', 'submission'] },
  { tag: 'uni-assist', keywords: ['uni-assist'] },
  { tag: 'visa', keywords: ['visa', 'embassy', 'residence permit'] },
  { tag: 'blocked account', keywords: ['blocked account', 'proof of funds', 'sperrkonto'] },
  { tag: 'health insurance', keywords: ['insurance', 'krankenkasse'] },
  { tag: 'arrival checklist', keywords: ['arrival', 'first days', 'checklist'] },
  { tag: 'student housing', keywords: ['housing', 'apartment', 'rent'] },
  { tag: 'anmeldung', keywords: ['anmeldung', 'city registration'] },
  { tag: 'student budget', keywords: ['budget', 'monthly costs', 'living costs'] },
  { tag: 'part-time work', keywords: ['part-time', 'working student', 'job'] },
  { tag: 'german language', keywords: ['german level', 'german skills', 'language'] },
  { tag: 'integration', keywords: ['integration', 'settle', 'community'] },
  { tag: 'course selection', keywords: ['course format', 'choose a course', 'pathway'] },
  { tag: 'intensive courses', keywords: ['intensive', 'full-time course'] },
  { tag: 'placement test', keywords: ['placement test', 'level test'] },
  { tag: 'learning routine', keywords: ['routine', 'practice', 'study habit'] },
  { tag: 'exam preparation', keywords: ['exam prep', 'prepare for exam', 'revision'] },
  { tag: 'telc', keywords: ['telc'] },
  { tag: 'accommodation support', keywords: ['accommodation support', 'housing support'] },
  { tag: 'host family', keywords: ['host family'] },
  { tag: 'shared flats', keywords: ['shared flat', 'wg'] },
  { tag: 'school community', keywords: ['school', 'community events', 'classmates'] },
  { tag: 'student support', keywords: ['student services', 'support team'] },
  { tag: 'casa updates', keywords: ['update', 'announcement', 'news'] },
];

export const NEWS_DEFAULT_TAGS_BY_CATEGORY: Record<NewsCategory, NewsAllowedTag[]> = {
  'Study in Germany': ['study planning', 'application deadlines', 'uni-assist', 'visa', 'blocked account'],
  'Living in Germany': ['arrival checklist', 'student budget', 'anmeldung', 'health insurance', 'integration'],
  'Why Germany': ['study planning', 'german language', 'integration', 'student support', 'part-time work'],
  Courses: ['course selection', 'placement test', 'intensive courses', 'learning routine', 'german language'],
  Exams: ['exam preparation', 'telc', 'study planning', 'application deadlines'],
  Accommodation: ['accommodation support', 'student housing', 'shared flats', 'host family', 'arrival checklist'],
  'School Life': ['school community', 'student support', 'learning routine', 'german language', 'integration'],
  Updates: ['casa updates', 'student support', 'school community', 'study planning', 'german language'],
};
