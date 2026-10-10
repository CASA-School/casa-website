import { COURSE_PAGE_COPY } from '@/config/cms/course-page-copy';
import { courseNarrativesByLocale } from '@/config/content/course-narratives';
import { getCourseAudienceContent, getCourseNextSteps } from '@/config/courses/course-page-content';
import { localizePracticalFacts } from '@/config/courses/course-practical-facts';
import { courseProfiles, getCourseLevelGoals } from '@/config/courses/course-profiles';
import { getCoursePath } from '@/lib/content/course-routes';
import type { ContentLocale } from '@/lib/content/types';

import { flattenTree, KIND_MAX, type FieldSpec, type SlotKind } from './overlay';

/**
 * Every slot the website editor can change, with its default in each language.
 *
 * Two sources. The course page's shared words (config/cms/course-page-copy.ts),
 * one key each. And per-course trees: the objects the course page already gets
 * from config/courses/* for one course and one language, whose editable leaves
 * `overlay.ts` names by path. Reading a tree for German and for English gives
 * each leaf its two defaults, which is what the editor compares a translation
 * against and falls back to.
 *
 * Built once per process. It is the repository's text, so it only changes with
 * a deploy.
 */

export type CatalogSlot = {
  key: string;
  label: string;
  section: string;
  kind: SlotKind;
  max: number;
  /** Where it shows: one page's name, or every page of a kind. */
  scope: string;
  /** The internal path of the page it belongs to, when it belongs to one. */
  path: string | null;
  defaults: Partial<Record<string, string>>;
};

type CourseTree = {
  id: string;
  section: string;
  fields: FieldSpec[];
  get: (slug: string, locale: ContentLocale) => unknown;
};

const narrativeFor = (slug: string, locale: ContentLocale) =>
  courseNarrativesByLocale[locale]?.find((entry) => entry.slug === slug) ?? null;

export const COURSE_TREES: readonly CourseTree[] = [
  {
    id: 'narrative',
    section: 'Hero',
    get: narrativeFor,
    fields: [
      { path: 'promise', label: 'Lead', kind: 'lead' },
      { path: 'audience', label: 'Lead', kind: 'lead', section: 'Who it is for' },
      { path: 'outcomes.*', label: ({ index }) => `Practice ${index}`, kind: 'point', section: 'Learning goals' },
    ],
  },
  {
    id: 'audience',
    section: 'Who it is for',
    get: getCourseAudienceContent,
    fields: [
      { path: 'title', label: 'Heading', kind: 'heading' },
      { path: 'bullets.*', label: ({ index }) => `Point ${index}`, kind: 'point' },
    ],
  },
  {
    id: 'steps',
    section: 'Next steps',
    get: getCourseNextSteps,
    fields: [
      { path: 'description', label: 'Lead', kind: 'lead' },
      { path: 'steps.*.title', label: ({ index }) => `Step ${index} · Title`, kind: 'card-title' },
      { path: 'steps.*.description', label: ({ index }) => `Step ${index} · Text`, kind: 'card-text' },
    ],
  },
  {
    id: 'levels',
    section: 'Learning goals',
    get: getCourseLevelGoals,
    fields: [
      { path: 'title', label: 'Heading', kind: 'heading' },
      { path: 'description', label: 'Lead', kind: 'lead' },
      { path: 'levels.*.focus', label: ({ parent }) => `Level ${String(parent.level ?? '')}`.trim(), kind: 'card-text' },
    ],
  },
  {
    id: 'practical',
    section: 'Good to know',
    get: localizePracticalFacts,
    fields: [
      { path: 'summary.*.label', label: ({ index }) => `Fact ${index} · Label`, kind: 'label', section: 'Course info' },
      { path: 'summary.*.value', label: ({ index }) => `Fact ${index} · Value`, kind: 'label', section: 'Course info' },
      { path: 'fees.*.label', label: ({ index }) => `Fee ${index}`, kind: 'label', section: 'Fees' },
      { path: 'fees.*.amount', label: ({ index }) => `Fee ${index} · Amount`, kind: 'label', section: 'Fees', data: 'Prices' },
      { path: 'fees.*.note', label: ({ index }) => `Fee ${index} · Note`, kind: 'note', section: 'Fees' },
      { path: 'feeNote', label: 'Fee note', kind: 'paragraph', section: 'Fees' },
      { path: 'conditions.*', label: ({ index }) => `Paragraph ${index}`, kind: 'paragraph' },
    ],
  },
];

export const treeFields = (id: string): readonly FieldSpec[] =>
  COURSE_TREES.find((tree) => tree.id === id)?.fields ?? [];

/** The German page names, which is what staff call the pages. */
export const COURSE_PAGE_NAMES: Record<string, string> = {
  'intensive-german': 'Intensivkurse',
  'evening-german': 'Abendkurse',
  'special-courses': 'Spezialkurse',
  'medical-german': 'Deutsch für Pflege und Medizin',
  bildungszeit: 'Bildungszeit',
  'in-company': 'Firmenunterricht',
  'german-for-groups': 'Deutsch für Gruppen',
  'exam-preparation': 'Prüfungsvorbereitung',
};

export const ALL_COURSE_PAGES = 'Every course page';

const COPY_LOCALES: readonly ContentLocale[] = ['de', 'en'];

export function slotMax(kind: SlotKind, defaults: readonly (string | undefined)[], explicit?: number): number {
  const longest = Math.max(0, ...defaults.map((value) => value?.length ?? 0));
  return Math.max(explicit ?? KIND_MAX[kind], Math.ceil(longest * 1.15));
}

function courseSlugs(): string[] {
  return [...new Set([...Object.keys(courseProfiles), ...courseNarrativesByLocale.en.map((entry) => entry.slug)])];
}

let memo: Map<string, CatalogSlot> | null = null;

export function catalog(): Map<string, CatalogSlot> {
  if (memo) return memo;
  const slots = new Map<string, CatalogSlot>();

  for (const [key, entry] of Object.entries(COURSE_PAGE_COPY)) {
    slots.set(key, {
      key,
      label: entry.label,
      section: entry.section,
      kind: entry.kind,
      max: slotMax(entry.kind, [entry.de, entry.en], 'max' in entry ? (entry.max as number) : undefined),
      scope: ALL_COURSE_PAGES,
      path: null,
      defaults: { de: entry.de, en: entry.en },
    });
  }

  for (const slug of courseSlugs()) {
    for (const tree of COURSE_TREES) {
      const prefix = `course.${slug}.${tree.id}`;
      for (const locale of COPY_LOCALES) {
        for (const leaf of flattenTree(tree.get(slug, locale), prefix, tree.fields)) {
          if (leaf.field.data) continue;
          const existing = slots.get(leaf.key);
          if (existing) {
            existing.defaults[locale] = leaf.value;
            continue;
          }
          slots.set(leaf.key, {
            key: leaf.key,
            label: leaf.label,
            section: leaf.field.section ?? tree.section,
            kind: leaf.field.kind,
            max: 0,
            scope: COURSE_PAGE_NAMES[slug] ?? slug,
            path: getCoursePath(slug),
            defaults: { [locale]: leaf.value },
          });
        }
      }
    }
  }

  for (const slot of slots.values()) {
    if (slot.max === 0) slot.max = slotMax(slot.kind, Object.values(slot.defaults));
  }

  memo = slots;
  return slots;
}

export const slotFor = (key: string): CatalogSlot | undefined => catalog().get(key);
