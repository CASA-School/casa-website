import 'server-only';

import COPY_CATALOG from '@/config/cms/copy-catalog.json';
import { curatedPassages } from '@/lib/assistant/tools/search-public-kb';
import { fillFacts, type FactValues } from '@/lib/cms/facts';
import { CEFR_BANDS, CEFR_LEVELS, LEVELS_PATH } from '@/config/content/cefr-levels';
import { coursePracticalFacts } from '@/config/courses/course-practical-facts';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCourseFinderData, getExamCatalog, getFaq, getNewsList } from '@/lib/content/repository';

import type { DocType, KnowledgeDoc, KnowledgeLocale } from './engine';

/**
 * The documents the index has without reading a page: the FAQ, the course and
 * exam catalogue, the news, and CLARA's hand-written passages. They work in
 * every runtime mode (fixtures without a database) and are what the index holds
 * until the crawl (crawl.server.ts) has read the rendered pages.
 */

const say = (locale: KnowledgeLocale, de: string, en: string) => (locale === 'de' ? de : en);

/** The pages' own names, both languages, for the catalogue's page documents. */
const PAGE_TITLES: Record<string, { de: string; en: string }> = {
  '/': { de: 'Startseite', en: 'Home' },
  '/courses': { de: 'Sprachkurse', en: 'Courses' },
  '/courses/levels': { de: 'Niveaustufen', en: 'Language levels' },
  '/exams': { de: 'Prüfungen', en: 'Exams' },
  '/accommodation': { de: 'Unterkunft', en: 'Accommodation' },
  '/accommodation/become-host': { de: 'Gastfamilie werden', en: 'Become a host family' },
  '/about': { de: 'CASA Leitbild', en: 'Our school' },
  '/team': { de: 'Team', en: 'Team' },
  '/ueber-uns/gemeinnuetzigkeit': { de: 'Gemeinnützigkeit', en: 'Non-profit status' },
  '/partners': { de: 'Kooperationspartner', en: 'Cooperation partners' },
  '/careers': { de: 'Karriere', en: 'Careers' },
  '/contact': { de: 'Kontakt', en: 'Contact' },
  '/faq': { de: 'Häufige Fragen', en: 'FAQ' },
  '/news': { de: 'Aktuelles', en: 'News' },
  '/calculator': { de: 'Kostenrechner', en: 'Cost calculator' },
  '/placement-test': { de: 'Einstufungstest', en: 'Placement test' },
  '/registration/course': { de: 'Kursanmeldung', en: 'Course registration' },
  '/registration/exam': { de: 'Prüfungsanmeldung', en: 'Exam registration' },
  '/resources/why-germany': { de: 'Warum Deutschland', en: 'Why Germany' },
  '/resources/study-in-germany': { de: 'Studieren in Deutschland', en: 'Studying in Germany' },
  '/resources/living-in-germany': { de: 'Leben in Deutschland', en: 'Living in Germany' },
};

type CatalogEntry = { de: string; en: string; pages?: string[] };

/**
 * One document per page from the website editor's catalogue: every text the
 * page renders, in its language. Without a page read (development, tests) this
 * is what lets search find /careers or /partners at all; with one, the crawled
 * sections rank above it, since they keep each text with its heading.
 */
function catalogPageDocs(locale: KnowledgeLocale, fill: (text: string) => string): KnowledgeDoc[] {
  const texts = new Map<string, string[]>();
  for (const entry of Object.values(COPY_CATALOG as Record<string, CatalogEntry>)) {
    for (const page of entry.pages ?? []) {
      if (!PAGE_TITLES[page]) continue;
      const list = texts.get(page) ?? [];
      list.push(entry[locale]);
      texts.set(page, list);
    }
  }
  const docs: KnowledgeDoc[] = [];
  for (const [page, list] of texts) {
    // Long pages in parts, so one document stays about one thing.
    const sentences = list.map((text) => fill(text).replace(/\s+/g, ' ').trim()).filter((text) => text.length > 2);
    for (let start = 0, part = 0; start < sentences.length; start += 25, part += 1) {
      docs.push({
        id: `catalog:${locale}:${page}:${part}`,
        locale,
        type: page.startsWith('/accommodation') ? 'accommodation' : page.startsWith('/resources/') ? 'guide' : page === '/careers' ? 'career' : 'page',
        url: page,
        page: PAGE_TITLES[page][locale],
        text: sentences.slice(start, start + 25).join(' · '),
        boost: page === '/' ? 0.45 : page === '/calculator' || page.startsWith('/registration/') ? 0.5 : 0.65,
      });
    }
  }
  return docs;
}

const TOPIC_TYPE: Record<string, DocType> = {
  courses: 'course',
  exams: 'exam',
  accommodation: 'accommodation',
  careers: 'career',
  resources: 'guide',
  faq: 'faq',
};

export async function structuredDocs(locale: KnowledgeLocale, facts: FactValues): Promise<KnowledgeDoc[]> {
  const fill = (text: string | undefined | null) => fillFacts(text ?? '', facts);
  const [finder, exams, faq, news] = await Promise.all([
    getCourseFinderData(locale),
    getExamCatalog(locale),
    getFaq(locale),
    getNewsList(locale),
  ]);
  const docs: KnowledgeDoc[] = [];

  for (const course of finder.courses) {
    const slug = course.slug;
    const facts_ = [
      facts[`course.${slug}.levels`] && `${say(locale, 'Niveau', 'Level')} ${facts[`course.${slug}.levels`]}`,
      facts[`course.${slug}.lessons`] && say(locale, `${facts[`course.${slug}.lessons`]} Unterrichtseinheiten pro Woche`, `${facts[`course.${slug}.lessons`]} lessons a week`),
      facts[`course.${slug}.price`] && `${say(locale, 'Preis', 'Price')}: ${facts[`course.${slug}.price`]}`,
      facts[`course.${slug}.next-start`] && `${say(locale, 'Nächster Start', 'Next start')}: ${facts[`course.${slug}.next-start`]}`,
    ].filter(Boolean) as string[];
    const narrative = course.narrative;
    docs.push({
      id: `course:${locale}:${slug}`,
      locale,
      type: 'course',
      url: getCoursePath(slug),
      page: course.name,
      text: fill([narrative?.promise, narrative?.audience, ...(narrative?.outcomes ?? []), ...(narrative?.teachingStyle ?? []), facts_.join('. ')].filter(Boolean).join(' ')),
      keywords: [slug.replace(/-/g, ' '), course.format ?? ''],
      boost: 1.25,
      badges: course.format ? [course.format] : [],
      meta: facts_,
    });
  }

  // The course pages' practical facts: fees, the summary box and how the course runs.
  for (const course of finder.courses) {
    const practical = coursePracticalFacts[course.slug];
    if (!practical) continue;
    const base = { locale, type: 'course' as const, url: getCoursePath(course.slug), page: course.name, boost: 1.2 };
    const fees = (practical.fees ?? []).map((fee) => `${fee.label[locale]}: ${fee.amount[locale]}${fee.note ? ` (${fee.note[locale]})` : ''}`);
    if (fees.length) {
      docs.push({ ...base, id: `practical:${locale}:${course.slug}:fees`, heading: say(locale, 'Kosten', 'Fees'), text: fill(`${fees.join('. ')}.${practical.feeNote ? ` ${practical.feeNote[locale]}` : ''}`) });
    }
    const summary = (practical.summary ?? []).map((row) => `${row.label[locale]}: ${row.value[locale]}`);
    if (summary.length) {
      docs.push({ ...base, id: `practical:${locale}:${course.slug}:summary`, heading: say(locale, 'Auf einen Blick', 'At a glance'), text: fill(`${summary.join('. ')}.`) });
    }
    if (practical.conditions.length) {
      docs.push({ ...base, id: `practical:${locale}:${course.slug}:conditions`, heading: say(locale, 'So läuft der Kurs', 'How the course runs'), text: fill(practical.conditions.map((condition) => condition[locale]).join(' ')) });
    }
  }

  // Each level, linked to its section on the levels page.
  for (const level of CEFR_LEVELS) {
    docs.push({
      id: `level:${locale}:${level.id}`,
      locale,
      type: 'page',
      url: `${LEVELS_PATH}#${level.anchor}`,
      page: say(locale, 'Niveaustufen', 'Language levels'),
      heading: `${level.label} · ${CEFR_BANDS[level.band][locale]}`,
      text: level.description[locale],
      keywords: [level.label, say(locale, 'Niveau', 'level'), 'GER', 'CEFR'],
      boost: 1.1,
    });
  }

  for (const item of exams.items) {
    const code = item.examType.code;
    const lines = [
      facts[`exam.${code}.fee`] && `${say(locale, 'Prüfungsgebühr', 'Exam fee')}: ${facts[`exam.${code}.fee`]}`,
      facts[`exam.${code}.next-date`] && `${say(locale, 'Nächster Termin', 'Next exam day')}: ${facts[`exam.${code}.next-date`]}`,
      facts[`exam.${code}.deadline`] && `${say(locale, 'Anmeldeschluss', 'Registration closes')}: ${facts[`exam.${code}.deadline`]}`,
      facts[`exam.${code}.preparation-price`] && `${say(locale, 'Vorbereitungskurs', 'Preparation course')}: ${facts[`exam.${code}.preparation-price`]}`,
    ].filter(Boolean) as string[];
    const narrative = item.narrative;
    docs.push({
      id: `exam:${locale}:${code}`,
      locale,
      type: 'exam',
      url: `/exams/${item.anchorId}`,
      page: item.examType.name,
      text: fill([narrative?.headline, narrative?.summary, narrative?.intro, ...(narrative?.outcomes ?? []), ...(narrative?.prepHighlights ?? []), lines.join('. ')].filter(Boolean).join(' ')),
      keywords: [code.replace(/_/g, ' '), item.examType.level ?? ''],
      boost: 1.25,
      badges: [item.examType.level ?? ''].filter(Boolean),
      meta: lines,
    });
  }

  for (const entry of faq) {
    const answer = fill(entry.answer);
    docs.push({
      id: `faq:${locale}:${entry.id}`,
      locale,
      type: 'faq',
      url: '/faq',
      page: say(locale, 'Häufige Fragen', 'Frequently asked questions'),
      heading: fill(entry.question),
      text: answer,
      answer,
      keywords: [entry.category],
      boost: 1,
      meta: [entry.category],
    });
  }

  for (const post of news) {
    docs.push({
      id: `news:${locale}:${post.slug}`,
      locale,
      type: 'news',
      url: `/news/${post.slug}`,
      page: post.title,
      text: fill([post.summary, post.body].filter(Boolean).join(' ')).slice(0, 2000),
      keywords: [post.category],
      boost: 0.8,
      meta: [post.category, post.publishedAt.slice(0, 10)],
    });
  }

  for (const passage of curatedPassages()) {
    if (passage.locale !== locale) continue;
    docs.push({
      id: `curated:${passage.id}`,
      locale,
      type: TOPIC_TYPE[passage.topic] ?? 'page',
      url: passage.url,
      page: passage.title,
      text: fill(passage.content),
      keywords: passage.keywords,
      boost: 1,
    });
  }

  docs.push(...catalogPageDocs(locale, fill));

  return docs;
}
