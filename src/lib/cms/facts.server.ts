import 'server-only';

import { SPECIAL_COURSE_CONSTANTS } from '@/config/courses/special-course-modules';
import { getCourseFinderData, getCourseRegistrationCatalog, getExamCatalog } from '@/lib/content/repository';
import type { ContentLocale } from '@/lib/content/types';

import {
  COURSE_GROUPS,
  PRICE_LIST_DEFS,
  PRICE_WORDS,
  examGroup,
  formatDay,
  formatEuro,
  priceListFacts,
  type FactDef,
  type FactValues,
} from './facts';

/**
 * The live values (facts.ts), read from where each fact is kept: course types
 * and terms from the database (the in-repo fixtures without one), exam days and
 * fees, the price list. Formatted for the page's language.
 *
 * A prepared language (translation-locales.ts), previewed in the editor, reads
 * the English data and writes each value its own way: „desde 378 €", „от 378 €".
 *
 * Read once per language and kept for fifteen seconds per process, like the
 * live texts: a page render costs no extra query, and a new term, start date or
 * price shows within a quarter of a minute. Every fact a course or exam can have
 * is listed even when it has no value right now (a course with no term
 * scheduled has no next start), so a text can name it and fills in when the
 * date is entered.
 */

const TTL_MS = 15_000;

export type Facts = { defs: FactDef[]; values: FactValues };

const store = globalThis as typeof globalThis & { casaFacts?: Map<string, { until: number; facts: Facts }> };

type PriceSource = { default_price: number | string; pricing_mode?: string | null };

function priceIn(course: PriceSource, locale: string): string {
  const words = PRICE_WORDS[locale] ?? PRICE_WORDS.en;
  const mode = course.pricing_mode ?? 'from';
  if (mode === 'on_request') return words.onRequest;
  const amount = formatEuro(Number(course.default_price), locale);
  return mode === 'fixed' ? amount : words.from(amount);
}

async function build(locale: string): Promise<Facts> {
  const data: ContentLocale = locale === 'de' ? 'de' : 'en';
  const defs: FactDef[] = [];
  const values: FactValues = {};
  const add = (def: FactDef, value: string | null | undefined) => {
    defs.push(def);
    if (value) values[def.id] = value;
  };

  const [finder, catalog, exams] = await Promise.all([
    getCourseFinderData(data),
    getCourseRegistrationCatalog(data),
    getExamCatalog(data),
  ]);

  for (const course of finder.courses) {
    const group = COURSE_GROUPS[course.slug] ?? course.slug;
    const id = `course.${course.slug}`;
    add({ id: `${id}.price`, group, label: 'Price', source: 'Course types' }, priceIn(course, locale));
    add(
      { id: `${id}.lessons`, group, label: 'Lessons a week', source: 'Course types' },
      course.lessons_per_week > 0 ? String(course.lessons_per_week) : null
    );
    add(
      { id: `${id}.levels`, group, label: 'Levels', source: 'Course types' },
      course.level_min && course.level_max ? `${course.level_min}–${course.level_max}` : null
    );

    // The next start, and the end of the term it starts in.
    const next = finder.nextStartByCourseId[course.id] ?? null;
    const term = next
      ? (catalog.optionsByCourseTypeId[course.id] ?? [])
          .filter((option) => option.startDate <= next && (!option.endDate || option.endDate >= next))
          .sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
      : undefined;
    add({ id: `${id}.next-start`, group, label: 'Next start', source: 'Course dates' }, next ? formatDay(next, locale) : null);
    add(
      { id: `${id}.next-end`, group, label: 'End of that term', source: 'Course dates' },
      term?.endDate ? formatDay(term.endDate, locale) : null
    );
  }

  const now = Date.now();
  for (const item of exams.items) {
    const group = examGroup(item.examType.code, item.examType.name);
    const id = `exam.${item.examType.code}`;
    const upcoming = item.sessions
      .filter((session) => new Date(session.starts_at).getTime() > now)
      .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)))[0];
    const fee = Number(upcoming?.fee_override ?? item.examType.default_fee);
    add({ id: `${id}.fee`, group, label: 'Exam fee', source: 'Prices' }, Number.isFinite(fee) && fee > 0 ? formatEuro(fee, locale) : null);
    add({ id: `${id}.next-date`, group, label: 'Next exam day', source: 'Exam dates' }, upcoming ? formatDay(String(upcoming.starts_at), locale) : null);
    add(
      { id: `${id}.deadline`, group, label: 'Registration closes', source: 'Exam dates' },
      upcoming?.registration_deadline ? formatDay(String(upcoming.registration_deadline), locale) : null
    );
  }

  const prices = priceListFacts(locale);
  for (const def of PRICE_LIST_DEFS) add(def, prices[def.id]);
  add(
    { id: 'course.special-courses.price-per-evening', group: COURSE_GROUPS['special-courses'], label: 'Price per evening', source: 'Prices' },
    formatEuro(SPECIAL_COURSE_CONSTANTS.pricePerSessionEur, locale)
  );

  return { defs, values };
}

export async function loadFacts(locale: string): Promise<Facts> {
  const cache = (store.casaFacts ??= new Map());
  const cached = cache.get(locale);
  if (cached && Date.now() < cached.until) return cached.facts;
  try {
    const facts = await build(locale);
    cache.set(locale, { until: Date.now() + TTL_MS, facts });
    return facts;
  } catch (error) {
    console.error('[website facts] could not be read', error);
    return cached?.facts ?? { defs: PRICE_LIST_DEFS, values: priceListFacts(locale) };
  }
}
