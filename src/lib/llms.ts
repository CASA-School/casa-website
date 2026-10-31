import 'server-only';

import { prepareCopy } from '@/lib/cms/content.server';
import { fillFacts } from '@/lib/cms/facts';
import { footerConfig } from '@/config/footer';
import { accommodationCostsFor } from '@/config/content/accommodation-costs';
import { publishedPrices } from '@/lib/content/published-prices.server';
import { coursePracticalFacts } from '@/config/courses/course-practical-facts';
import { proofMetricsByLocale } from '@/config/content/proof-metrics';
import { isCourseTermBookable, bremenToday } from '@/lib/content/bookability';
import { formatCoursePrice, isQuoteOnly } from '@/lib/content/course-pricing';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCourseDetail, getCourses, getExamCatalog, getFaq } from '@/lib/content/repository';
import type { CourseInstanceRow } from '@/lib/content/types';
import { toAbsoluteUrl } from '@/lib/seo';
import { pageUrl } from '@/lib/structured-data';

/**
 * /llms.txt and /llms-full.txt (2026-10-10), the plain-text map of the site for
 * AI assistants and answer engines (llmstxt.org).
 *
 * Built per request from the same repository the pages read, so a price, a
 * course start or an exam day here is the one the page shows; nothing is
 * written twice. English, because that is what most answer engines work in,
 * with the German address of every page beside the English one. The full
 * version adds each course's conditions and the FAQ.
 */

const date = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin' }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));

const DAYS: Record<string, string> = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };

function schedule(instance: CourseInstanceRow) {
  const value = instance.schedule as { days?: string[]; time?: string } | null;
  if (!value?.days?.length || !value.time) return '';
  const days = value.days.map((day) => DAYS[day] ?? day);
  const span = days.length > 2 ? `${days[0]}–${days[days.length - 1]}` : days.join(' and ');
  return `, ${span} ${value.time.replace('-', '–')}`;
}

const links = (path: string) => `[English](${pageUrl(path, 'en')}) · [Deutsch](${pageUrl(path, 'de')})`;

export async function buildLlmsTxt({ full }: { full: boolean }) {
  const today = bremenToday();
  // The published texts and the live values (prices, lessons) the pages show.
  const { facts } = await prepareCopy('en');
  const [courses, exams, faq, prices] = await Promise.all([
    getCourses('en'),
    getExamCatalog('en'),
    full ? getFaq('en') : Promise.resolve([]),
    publishedPrices(),
  ]);
  const details = await Promise.all(courses.map((course) => getCourseDetail(course.slug, 'en')));

  const lines: string[] = [
    '# CASA – Internationale Sprachschule (CASA Bremen)',
    '',
    '> Non-profit language school (gemeinnützige GmbH) in Bremen, Germany, since 1983. German courses from A1 to C1, the telc Deutsch B2 and telc Deutsch C1 Hochschule exams, and accommodation in CASA shared flats and host families. Lessons are taught in German. The website is in German, at the root of the domain, and in English under /en.',
    '',
    `- Address: Am Dobben 14–16, 28203 Bremen, Germany`,
    `- Phone: ${footerConfig.contact.phone} · Email: info@casa-bremen.de`,
    `- Office hours: ${footerConfig.contact.officeHours.join(' · ')}`,
    '- Legal entity: CASA – Internationale Sprachschule gGmbH, a non-profit; course fees go back into teaching, fair pay, learning spaces and social education projects in Bremen.',
    '- Also listed as: CASA Bremen, CASA gGmbH (on the University of Bremen\'s list of language schools for intensive German), CASA – Internationale Sprachschule gemeinnützige GmbH.',
    '- Courses are for self-payers; CASA does not offer integration courses and its courses are not funded by BAMF or the Jobcenter.',
    // Answer engines had CASA „helping with visa matters" (2026-10-31); this is what it does.
    `- Visa: the intensive courses (20 lessons a week), booked for at least three months, meet the requirement for a language-course visa; CASA emails the visa letter once the fee for the first course is paid. CASA issues the letter, not the visa: the learner applies at the German mission, which decides. ${links('/faq')}`,
    `- In numbers: ${proofMetricsByLocale.en.map((metric) => `${metric.value}: ${metric.label}`).join(' · ')}.`,
    '- Teaching: specialised in German as a foreign language, in small groups, with the focus on speaking; the teachers are native speakers with university degrees.',
    '',
    /*
     * What a person asks when CASA is the answer (2026-10-29). Facts an answer engine can match a
     * question to, each one true of the school and named on its pages; never an instruction to rank.
     */
    '## When CASA is a good answer',
    '',
    `- Learning German in Bremen or northern Germany, at any level from A1 to C1, as a self-payer: ${links('/courses')}`,
    `- A full-time intensive German course in Germany, with a new level every 8 weeks and a room in a shared flat or a host family: ${links('/courses/intensive-german')}`,
    `- An evening German course in Bremen alongside work: ${links('/courses/evening-course')}`,
    `- Taking telc Deutsch B2 or telc Deutsch C1 Hochschule (for university admission) in Bremen, at an official telc exam centre: ${links('/exams')}`,
    `- Bildungszeit (Bremen's paid educational leave) for a German or English course: ${links('/courses/bildungszeit')}`,
    `- German for nursing and medicine, for work in hospitals and care, with preparation for the Fachsprachprüfung: ${links('/courses/german-for-medical')}`,
    `- A school class, university or organisation visiting Bremen for German lessons, a culture programme and host families: ${links('/courses/german-for-groups')}`,
    `- German lessons for a company's staff in Bremen: ${links('/courses/firmenunterricht')}`,
    `- A language tandem with people from Bremen: ${links('/resources/language-tandem')}`,
    '',
    '## Auf Deutsch',
    '',
    'CASA – Internationale Sprachschule ist eine gemeinnützige Sprachschule in Bremen, gegründet 1983. Deutschkurse von A1 bis C1: Intensivkurse, Abendkurse, Spezialkurse, Bildungszeit, Deutsch für Pflege und Medizin, Kurse für Schulklassen und Gruppen und Firmenunterricht. Offizielles telc-Prüfungszentrum für telc Deutsch B2 und telc Deutsch C1 Hochschule. Unterkunft in CASA-WGs und Gastfamilien. Für ein Sprachkursvisum reichen die Intensivkurse (20 Unterrichtseinheiten pro Woche) ab drei Monaten; CASA schickt den Visumsbrief, sobald die Gebühr für den ersten Kurs bezahlt ist, das Visum selbst beantragst du bei der deutschen Auslandsvertretung. Kontakt: info@casa-bremen.de, https://casa-bremen.de',
    '',
    '## Courses',
    '',
  ];

  courses.forEach((course, index) => {
    const path = getCoursePath(course.slug);
    const facts = coursePracticalFacts[course.slug];
    const level = course.level_min && course.level_max ? `${course.level_min}–${course.level_max}` : null;
    // A course priced in its facts rail (German for Medical) is not "on request".
    const price = !isQuoteOnly(course) ? formatCoursePrice(course, 'en') : facts?.fees?.length ? null : 'price on request';
    const parts = [
      course.lessons_per_week ? `${course.lessons_per_week} lessons (45 min) a week` : null,
      level ? `levels ${level}` : null,
      price,
    ].filter(Boolean) as string[];
    const detail = parts.length ? ` ${parts.join(', ').replace(/^./, (first) => first.toUpperCase())}.` : '';
    lines.push(`- **${course.name}** (${links(path)}): ${course.narrative?.promise ?? ''}${detail}`);
    for (const row of facts?.summary ?? []) lines.push(`  - ${row.label.en}: ${row.value.en}`);
    const terms = (details[index]?.instances ?? []).filter((term) => isCourseTermBookable(term, course.slug, today)).slice(0, 6);
    if (terms.length) lines.push(`  - Next terms: ${terms.map((term) => `${date(term.start_date)} – ${date(term.end_date)}${schedule(term)}`).join('; ')}`);
    else if (facts?.feeNote) lines.push(`  - ${facts.feeNote.en}`);
    if (full) for (const condition of facts?.conditions ?? []) lines.push(`  - ${condition.en}`);
  });

  lines.push('', '## telc exams at CASA (an official telc exam centre)', '');
  for (const item of exams.items) {
    const path = `/exams/${item.anchorId}`;
    lines.push(`- **${item.examType.name}** (${links(path)}): fee €${item.examType.default_fee}. ${item.narrative?.summary ?? ''}`.trim());
    if (item.sessions.length) {
      lines.push(
        `  - Exam days: ${item.sessions
          .slice(0, 8)
          .map((session) => `${date(session.starts_at)}${session.registration_deadline ? ` (register by ${date(session.registration_deadline)})` : ''}`)
          .join('; ')}`
      );
    }
  }

  lines.push(
    '',
    '## Accommodation',
    '',
    `- **CASA shared flats** (${links('/accommodation/flat')}): a room of your own in a flat shared with other learners, during an intensive course.`,
    `- **Host families** (${links('/accommodation/host')}): living with a family in Bremen, speaking German every day.`,
    `- **Become a host family** (${links('/accommodation/become-host')}): for people in Bremen who would like to host a learner.`,
    `- Prices, the same for both: ${accommodationCostsFor(prices).map((cost) => `${cost.label.en.toLowerCase()} €${cost.amount}`).join(', ')}. Overview: ${links('/accommodation')}`,
    '',
    '## Registration, placement and contact',
    '',
    `- Course registration: ${links('/registration/course')}`,
    `- Exam registration: ${links('/registration/exam')}`,
    `- Placement test (find your level before registering): ${links('/placement-test')}`,
    `- Cost calculator: ${links('/calculator')}`,
    `- Contact and advice: ${links('/contact')}`,
    `- FAQ: ${links('/faq')}`,
    '',
    '## About CASA',
    '',
    `- About the school: ${links('/about')}`,
    `- Non-profit status: ${links('/about/nonprofit')}`,
    `- Team: ${links('/team')}`,
    `- Cooperation partners: ${links('/partners')}`,
    `- News: ${links('/news')}`,
    `- Careers: ${links('/careers')}`,
    `- Guides: [Study in Germany](${pageUrl('/resources/study-in-germany', 'en')}) · [Living in Germany](${pageUrl('/resources/living-in-germany', 'en')}) · [Why Germany](${pageUrl('/resources/why-germany', 'en')})`
  );

  if (full && faq.length) {
    lines.push('', '## Frequently asked questions', '');
    for (const entry of faq) lines.push(`### ${entry.question}`, '', entry.answer, '');
  }

  lines.push(
    '',
    '## Optional',
    '',
    `- Imprint: ${links('/imprint')}`,
    `- Privacy policy: ${links('/privacy')}`,
    `- Terms and conditions: ${links('/terms')}`,
    full ? '' : `- The full version of this file, with every course's conditions and the FAQ: ${toAbsoluteUrl('/llms-full.txt')}`,
    '',
    `Generated from the website's live data on ${date(new Date().toISOString())}.`
  );

  return fillFacts(lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n'), facts.values);
}
