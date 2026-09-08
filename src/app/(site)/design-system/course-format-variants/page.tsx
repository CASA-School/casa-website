import type { Metadata } from 'next';

import { GuidedPicker, type GuidedPickerItem } from '@/components/sections';
import { courseNarrativesByLocale } from '@/config/content/course-narratives';
import { Container } from '@/components/ui/container';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCoursePath } from '@/lib/content/course-routes';
import { getCourseFinderData } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

const baseMetadata = createPublicMetadata({
  title: 'Course Format Design Variants',
  description: 'Internal CASA design review page for homepage course-format section variants.',
  path: '/design-system/course-format-variants',
});

export const metadata: Metadata = {
  ...baseMetadata,
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const previewCourseSlugs = [
  'intensive-german',
  'evening-german',
  'special-courses',
  'german-for-groups',
  'medical-german',
  'in-company',
] as const;

const previewCourseTitles: Record<
  (typeof previewCourseSlugs)[number],
  { en: string; de: string }
> = {
  'intensive-german': {
    en: 'Intensive German',
    de: 'Intensiv Deutsch',
  },
  'evening-german': {
    en: 'Evening Course',
    de: 'Abendkurs',
  },
  'special-courses': {
    en: 'Special Courses',
    de: 'Spezialkurse',
  },
  'german-for-groups': {
    en: 'German for Groups',
    de: 'Deutsch für Gruppen',
  },
  'medical-german': {
    en: 'German for Medical',
    de: 'Deutsch für Medizin',
  },
  'in-company': {
    en: 'Firmenunterricht',
    de: 'Firmenunterricht',
  },
};

function buildPreviewCourseItems(locale: 'en' | 'de', pageConfig: ReturnType<typeof getPublicPageConfig>) {
  const localizedNarratives = courseNarrativesByLocale[locale] ?? courseNarrativesByLocale.en;
  const fallbackNarratives = courseNarrativesByLocale.en;
  const photos = [
    pageConfig.photos.courseA,
    pageConfig.photos.courseB,
    pageConfig.photos.courseC,
    pageConfig.photos.courseD,
    pageConfig.photos.courseE,
    pageConfig.photos.courseF,
  ];

  return previewCourseSlugs.map((slug, index) => {
    const narrative =
      localizedNarratives.find((item) => item.slug === slug) ??
      fallbackNarratives.find((item) => item.slug === slug);
    const photo = photos[index % photos.length];

    return {
      title: previewCourseTitles[slug][locale],
      description:
        narrative?.promise ||
        (locale === 'de'
          ? 'Praxisnahe Lernziele mit klarer Struktur.'
          : 'Practical language outcomes with clear structure.'),
      bestFor:
        narrative?.audience ||
        (locale === 'de'
          ? 'Best for: internationale Lernende'
          : 'Best for: international learners'),
      href: getCoursePath(slug),
      ctaLabel: locale === 'de' ? 'Kursplan ansehen' : 'View course plan',
      media: {
        src: photo.src,
        alt: photo.alt,
      },
    };
  }) satisfies GuidedPickerItem[];
}

export default async function CourseFormatVariantsPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('home', locale);
  const finderData = await getCourseFinderData(locale);
  const coursePhotos = [
    pageConfig.photos.courseA,
    pageConfig.photos.courseB,
    pageConfig.photos.courseC,
    pageConfig.photos.courseD,
    pageConfig.photos.courseE,
    pageConfig.photos.courseF,
  ];

  const coursesBySlug = new Map(finderData.courses.map((course) => [course.slug, course]));
  const liveCourseItems = previewCourseSlugs.reduce<GuidedPickerItem[]>((items, slug, index) => {
    const course = coursesBySlug.get(slug);

    if (!course) {
      return items;
    }

    const nextStart = finderData.nextStartByCourseId[course.id];

    items.push({
      title: previewCourseTitles[slug][locale],
      description:
        course.narrative?.promise ||
        (locale === 'de'
          ? 'Praxisnahe Lernziele mit klarer Struktur.'
          : 'Practical language outcomes with clear structure.'),
      bestFor:
        course.narrative?.audience ||
        (locale === 'de'
          ? 'Best for: internationale Lernende'
          : 'Best for: international learners'),
      href: getCoursePath(course.slug),
      ctaLabel: locale === 'de' ? 'Kursplan ansehen' : 'View course plan',
      meta: nextStart
        ? `${locale === 'de' ? 'Nächster Start' : 'Next start'}: ${formatDate(nextStart, locale)}`
        : undefined,
      media: {
        src: coursePhotos[index % coursePhotos.length].src,
        alt: previewCourseTitles[slug][locale],
      },
    });

    return items;
  }, []);

  const isUsingPreviewSet = liveCourseItems.length < 6;
  const courseItems = isUsingPreviewSet
    ? buildPreviewCourseItems(locale, pageConfig)
    : liveCourseItems;

  const commonDescription =
    locale === 'de'
      ? 'Diese Varianten nutzen dieselben Kursdaten, damit Layout, Hierarchie und CTA-Dichte direkt vergleichbar bleiben.'
      : 'These variants use the same course data so layout, hierarchy, and CTA density are easy to compare.';

  return (
    <main className="bg-[var(--casa-canvas)] py-12 text-[var(--casa-ink)] md:py-16">
      <Container className="space-y-12">
        <header className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--casa-accent-text)]">
            Internal design review
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
            Course-format section variants
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
            {commonDescription}
          </p>
          {isUsingPreviewSet ? (
            <p className="mt-4 rounded-lg border border-[color:var(--casa-sand)] bg-white px-4 py-3 text-sm font-semibold text-[var(--casa-muted)]">
              {locale === 'de'
                ? 'Lokale Vorschau: Diese Seite nutzt sechs repräsentative Kurskarten, weil die lokale Umgebung weniger Kursdaten liefert als Vercel.'
                : 'Local preview: this page uses six representative course cards because the local environment has fewer course records than Vercel.'}
            </p>
          ) : null}
        </header>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--casa-muted)]">
            Variant A - Atlas
          </p>
          <GuidedPicker
            eyebrow={locale === 'de' ? 'Kursformate' : 'Course formats'}
            title={
              locale === 'de'
                ? 'Wählen Sie das passende Kursformat'
                : 'Choose the course format that fits'
            }
            description={
              locale === 'de'
                ? 'Ein ruhiger Überblick mit Bildanker und kompakter Kursmatrix.'
                : 'A calm overview with an image anchor and compact course matrix.'
            }
            items={courseItems}
            locale={locale}
            presentation="courseAtlas"
            showAccentRule={false}
            showBestFor={false}
          />
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--casa-muted)]">
            Variant B - Mosaic
          </p>
          <GuidedPicker
            eyebrow={locale === 'de' ? 'Kurswege' : 'Course routes'}
            title={
              locale === 'de'
                ? 'Ein starker Startpunkt, weitere Wege daneben'
                : 'One strong starting point, more routes beside it'
            }
            description={
              locale === 'de'
                ? 'Eine visuellere Auswahl mit großem Fokusformat und kompakten Alternativen.'
                : 'A more visual selection with one focused feature and compact alternatives.'
            }
            items={courseItems}
            locale={locale}
            presentation="courseMosaic"
            showAccentRule={false}
            showBestFor={false}
          />
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--casa-muted)]">
            Variant C - Signal Cards
          </p>
          <GuidedPicker
            eyebrow={locale === 'de' ? 'Kurskarten' : 'Course cards'}
            title={
              locale === 'de'
                ? 'Moderne Karten für jedes Format'
                : 'Modern cards for every format'
            }
            description={
              locale === 'de'
                ? 'Eine visuellere Kartenansicht mit Bild, Nummerierung und klarer Aktion je Kursformat.'
                : 'A more visual card grid with imagery, numbering, and a clear action for each format.'
            }
            items={courseItems}
            locale={locale}
            presentation="courseSignalCards"
            showAccentRule={false}
            showBestFor={false}
          />
        </section>
      </Container>
    </main>
  );
}
