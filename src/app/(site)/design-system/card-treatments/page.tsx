import type { Metadata } from 'next';
import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Container } from '@/components/ui/container';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { ARCHITECTURES, type PreviewCourse } from './architectures';

const baseMetadata = createPublicMetadata({
  title: 'Card Treatments',
  description: 'Internal CASA design review page comparing premium card treatments side by side.',
  path: '/design-system/card-treatments',
});

export const metadata: Metadata = {
  ...baseMetadata,
  robots: { index: false, follow: false },
};

/**
 * Live comparison surface for the course-card treatment.
 *
 * Every variant below is a restraint move on the CURRENT design system — no new
 * colour, no new shape, no new type. Each one is pinned to a finding in
 * docs/PREMIUM_UI_REVIEW_2026-08-16.md, which is also the document that asks for
 * exactly this page: §4.5 says the border-removal decision "cannot be determined
 * statically. Do this per component, on the canvas cases first, and check each
 * rendered."
 *
 * The shipping card is src/components/sections/guided-picker.tsx (the
 * `courseSignalCards` branch, ~line 283). The markup is duplicated here on
 * purpose: this page is a decision surface, and nothing ships until a treatment
 * is chosen and ported back into the component.
 */

type Treatment = {
  key: string;
  label: string;
  basis: string;
  /** What actually changed relative to the row above it. */
  delta: string;
  shell: string;
  hover: string;
  /** Tailwind height/aspect for the photo well. Ignored when mediaMode is 'none'. */
  media: string;
  mediaMode: 'photo' | 'none';
  /** Tricolour hairline across the top, the vocabulary the persona cards already use. */
  accentBar: boolean;
  body: string;
  showIndexBadge: boolean;
};

/**
 * CASA's tricolour, in the order the persona cards on the homepage already use
 * it. Reused rather than reinvented so a colour-led course card reads as the
 * same family as the band above it.
 */
const ACCENT_BARS = ['bg-[var(--casa-blue)]', 'bg-[var(--casa-sun)]', 'bg-[var(--casa-red)]'];

const TREATMENTS: Treatment[] = [
  {
    key: 'a-baseline',
    label: 'A · Baseline (ships today)',
    basis: 'Current homepage card, unchanged.',
    delta: 'Reference row. Compare everything below against this.',
    shell:
      'bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 md:min-h-[25rem]',
    hover: 'md:hover:-translate-y-1 md:hover:ring-[var(--casa-blue)]/35',
    media: 'h-44',
    body: 'p-5',
    mediaMode: 'photo',
    accentBar: false,
    showIndexBadge: true,
  },
  {
    key: 'b-no-outline',
    label: 'B · Outline removed',
    basis: 'Review §4.5 — “border + shadow on the same white card is a classic non-premium tell”.',
    delta: 'Drops ring-1. On the canvas tint the shadow already separates the card.',
    shell: 'bg-white shadow-[var(--shadow-card)] md:min-h-[25rem]',
    hover: 'md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-modal)]',
    media: 'h-44',
    body: 'p-5',
    mediaMode: 'photo',
    accentBar: false,
    showIndexBadge: true,
  },
  {
    key: 'c-quiet-elevation',
    label: 'C · Quiet at rest, responds on hover',
    basis: 'Restraint. The card stops shouting until it is addressed.',
    delta: 'Rest elevation drops shadow-card → shadow-soft; hover lifts to shadow-card.',
    shell: 'bg-white shadow-[var(--shadow-soft)] md:min-h-[25rem]',
    hover: 'md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-card)]',
    media: 'h-44',
    body: 'p-5',
    mediaMode: 'photo',
    accentBar: false,
    showIndexBadge: true,
  },
  {
    key: 'd-honest-media',
    label: 'D · Honest photo ratio, no dead space',
    basis: 'Measured defects: h-44 on a ~450px card is 2.97:1; min-h-[25rem] leaves ~80-100px of hole above the CTA.',
    delta: 'h-44 → aspect-[3/2], and the min-height floor is gone so the card fits its content.',
    shell: 'bg-white shadow-[var(--shadow-soft)]',
    hover: 'md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-card)]',
    media: 'aspect-[3/2]',
    body: 'p-5',
    mediaMode: 'photo',
    accentBar: false,
    showIndexBadge: true,
  },
  {
    key: 'e-restraint',
    label: 'E · Full restraint',
    basis: 'Review §4.1 — remove the ornament. “Immediately calmer and more confident.”',
    delta: 'Drops the 01/02/03 badge floating on the photograph. Type carries the hierarchy alone.',
    shell: 'bg-white shadow-[var(--shadow-soft)]',
    hover: 'md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-card)]',
    media: 'aspect-[3/2]',
    body: 'p-6',
    mediaMode: 'photo',
    accentBar: false,
    showIndexBadge: false,
  },
  {
    key: 'f-smaller-photo',
    label: 'F · Photograph reduced to 16:9',
    basis: 'D and E make the photo BIGGER (349px tall on a 523px card). That is the opposite of "fewer images".',
    delta: 'aspect-[3/2] -> aspect-[16/9]. Still an honest ratio, but the photo stops dominating the card.',
    shell: 'bg-white shadow-[var(--shadow-soft)]',
    hover: 'md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-card)]',
    media: 'aspect-[16/9]',
    mediaMode: 'photo',
    accentBar: false,
    body: 'p-6',
    showIndexBadge: false,
  },
  {
    key: 'g-no-photo',
    label: 'G · No photograph, CASA tricolour accent',
    basis: 'Not a new look — this is the persona-card vocabulary that already ships one band above on the homepage.',
    delta: 'Photo removed entirely. Warm gradient plus a tricolour hairline carry the card. Fewer images, more colour, zero new tokens.',
    shell:
      'bg-[linear-gradient(180deg,#fff_0%,color-mix(in_srgb,var(--casa-warm-soft)_22%,#fff)_100%)] shadow-[var(--shadow-soft)]',
    hover: 'md:hover:-translate-y-1 md:hover:shadow-[var(--shadow-card)]',
    media: '',
    mediaMode: 'none',
    accentBar: true,
    body: 'p-6 md:p-7',
    showIndexBadge: false,
  },
];

function TreatmentRow({ treatment, courses }: { treatment: Treatment; courses: PreviewCourse[] }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {treatment.label}
        </p>
        <p className="mt-2 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
          {treatment.basis}
        </p>
        <p className="mt-1 max-w-measure text-sm leading-relaxed text-[var(--casa-ink)]">
          {treatment.delta}
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {courses.map((course, index) => (
          <li key={`${treatment.key}-${course.href}`}>
            <article
              className={cn(
                'group relative flex h-full flex-col overflow-hidden rounded-xl transition-all',
                treatment.shell,
                treatment.hover
              )}
            >
              {treatment.accentBar ? (
                <span
                  className={cn('absolute inset-x-0 top-0 h-1', ACCENT_BARS[index % ACCENT_BARS.length])}
                  aria-hidden
                />
              ) : null}

              {treatment.mediaMode === 'photo' ? (
              <div className={cn('casa-media-overlay relative shrink-0 overflow-hidden', treatment.media)}>
                <Image
                  src={course.media.src}
                  alt={course.media.alt}
                  fill
                  sizes="(max-width: 768px) 85vw, 30vw"
                  className="object-cover transition-transform duration-500 md:group-hover:scale-[1.03]"
                />
                {treatment.showIndexBadge ? (
                  <span className="absolute left-4 top-4 inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-white/92 px-2 text-xs font-bold tabular-nums text-[var(--casa-ink)] shadow-[var(--shadow-soft)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ) : null}
              </div>
              ) : null}

              <div className={cn('flex flex-1 flex-col', treatment.body)}>
                <h3 className="text-xl font-bold text-[var(--casa-ink)]">{course.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">
                  {course.description}
                </p>
                <Link
                  href={course.href}
                  className="casa-cta-link group/cta mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-[var(--casa-ink)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text)] hover:underline"
                >
                  {course.ctaLabel}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CardTreatmentsPage() {
  const locale = await getContentLocale();
  const pageConfig = getPublicPageConfig('home', locale);

  const courses: PreviewCourse[] = [
    {
      title: locale === 'de' ? 'Intensiv Deutsch' : 'Intensive German',
      description:
        locale === 'de'
          ? 'Klarer Wochenrhythmus mit täglichem Sprechanteil.'
          : 'High-structure weekly rhythm with daily speaking momentum.',
      href: '/courses/intensive-german',
      ctaLabel: locale === 'de' ? 'Kursplan erkunden' : 'Explore course plan',
      media: pageConfig.photos.courseA,
    },
    {
      title: locale === 'de' ? 'Abendkurs' : 'Evening Course',
      description:
        locale === 'de'
          ? 'Stetiger Fortschritt nach Feierabend, ohne Struktur zu verlieren.'
          : 'Steady progress after work hours without losing structure.',
      href: '/courses/evening-german',
      ctaLabel: locale === 'de' ? 'Kursplan erkunden' : 'Explore course plan',
      media: pageConfig.photos.courseB,
    },
    {
      title: locale === 'de' ? 'Spezialkurse' : 'Special Courses',
      description:
        locale === 'de'
          ? 'Kurze, fokussierte Module für Grammatik, Schreiben oder Konversation.'
          : 'Short focused modules for grammar, writing, or conversation breakthroughs.',
      href: '/courses/special-courses',
      ctaLabel: locale === 'de' ? 'Kursplan erkunden' : 'Explore course plan',
      media: pageConfig.photos.courseC,
    },
    {
      title: locale === 'de' ? 'Deutsch für Gruppen' : 'German for Groups',
      description:
        locale === 'de'
          ? 'Geschlossene Gruppen mit gemeinsamem Ziel und Zeitplan.'
          : 'Closed groups with a shared goal and a shared schedule.',
      href: '/courses/german-for-groups',
      ctaLabel: locale === 'de' ? 'Kursplan erkunden' : 'Explore course plan',
      media: pageConfig.photos.courseD,
    },
    {
      title: locale === 'de' ? 'Deutsch für Medizin' : 'Medical German',
      description:
        locale === 'de'
          ? 'Klinischer Wortschatz für Gesundheitsberufe.'
          : 'Clinical vocabulary for healthcare professionals.',
      href: '/courses/medical-german',
      ctaLabel: locale === 'de' ? 'Kursplan erkunden' : 'Explore course plan',
      media: pageConfig.photos.courseE,
    },
    {
      title: locale === 'de' ? 'Firmenunterricht' : 'In-company courses',
      description:
        locale === 'de'
          ? 'Unterricht direkt an Ihrem Arbeitsplatz.'
          : 'Training delivered at your own workplace.',
      href: '/courses/in-company',
      ctaLabel: locale === 'de' ? 'Kursplan erkunden' : 'Explore course plan',
      media: pageConfig.photos.courseF,
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--casa-canvas)] py-12 md:py-16">
      <Container className="space-y-12 md:space-y-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            Internal · design review
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[var(--casa-ink)]">Card treatments</h1>
          <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
            Two groups. <strong className="font-semibold text-[var(--casa-ink)]">Refinements</strong>{' '}
            keep today&rsquo;s card anatomy and change one property at a time, so each row isolates a
            single decision. <strong className="font-semibold text-[var(--casa-ink)]">Architectures</strong>{' '}
            change the composition itself — different anatomy, not a different shadow. Same brand
            tokens throughout, rendered on the canvas tint where these cards actually sit.
          </p>
          <p className="mt-3 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
            Nothing here ships until a row is chosen and ported back into
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">guided-picker.tsx</code>.
          </p>
        </header>

        <div className="border-t border-[color:var(--casa-sand)] pt-8">
          <h2 className="text-2xl font-bold text-[var(--casa-ink)]">Refinements</h2>
          <p className="mt-2 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
            Same anatomy as production — photo well on top, body below. One property changes per row.
          </p>
        </div>

        {TREATMENTS.map((treatment) => (
          <TreatmentRow key={treatment.key} treatment={treatment} courses={courses.slice(0, 3)} />
        ))}

        <div className="border-t border-[color:var(--casa-sand)] pt-8">
          <h2 className="text-2xl font-bold text-[var(--casa-ink)]">Architectures</h2>
          <p className="mt-2 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
            Different compositions, not different styling. All six courses, so the asymmetric and
            rail layouts have something real to arrange.
          </p>
        </div>

        {ARCHITECTURES.map((architecture) => (
          <section key={architecture.key} className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {architecture.label}
              </p>
              <p className="mt-2 max-w-measure text-sm leading-relaxed text-[var(--casa-ink)]">
                {architecture.concept}
              </p>
              <p className="mt-1 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
                Trade-off: {architecture.risk}
              </p>
            </div>
            {architecture.render(courses)}
          </section>
        ))}
      </Container>
    </main>
  );
}
