import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { iconMap, type IconKey } from '@/config/icon-map';
import { cn } from '@/lib/utils';
import type { ContentLocale } from '@/lib/content/types';

type PersonaKey =
  | 'new-learners'
  | 'working-professionals'
  | 'exam-candidates'
  | 'housing-onboarding';

type PersonaPathway = {
  key: PersonaKey;
  icon: IconKey;
  title: string;
  description: string;
  primaryAction: {
    href: string;
  };
};

type PersonaPathwaysProps = {
  locale: ContentLocale;
  /**
   * `default` draws its own header above a 4-up row — the standalone form.
   *
   * `rail` drops the header (the page supplies one in a heading rail beside it)
   * and halves the grid to 2-up. The halving is not cosmetic: `xl:` is a
   * VIEWPORT query, so inside a ~936px rail column on a 1728px screen the 4-up
   * grid still renders four 219px cards whose 163px interior sits under the
   * 288px description clamp — every description would wrap to a hard column.
   */
  presentation?: 'default' | 'rail';
  className?: string;
};

function getPersonaData(locale: ContentLocale): PersonaPathway[] {
  return locale === 'de'
    ? [
        {
          key: 'new-learners',
          icon: 'courses',
          title: 'Niveau finden',
          description: 'Starten Sie bei A1 oder steigen Sie mit klarer Einstufung ins passende Niveau ein.',
          primaryAction: { href: '/placement-test' },
        },
        {
          key: 'working-professionals',
          icon: 'inCompany',
          title: 'Deutsch neben der Arbeit',
          description: 'Wählen Sie Abend-, Berufs- oder Firmenformate, die zu Ihrer Woche passen.',
          primaryAction: { href: '#course-evening-german' },
        },
        {
          key: 'exam-candidates',
          icon: 'exams',
          title: 'Zertifikat vorbereiten',
          description: 'Verbinden Sie Ihren Kursweg mit telc B2 oder C1 Hochschule Vorbereitung.',
          primaryAction: { href: '#exam-preparation' },
        },
        {
          key: 'housing-onboarding',
          icon: 'accommodation',
          title: 'In Bremen ankommen',
          description: 'Planen Sie Kursstart, Unterkunft und die ersten praktischen Schritte zusammen.',
          primaryAction: { href: '#accommodation-support' },
        },
      ]
    : [
        {
          key: 'new-learners',
          icon: 'courses',
          title: 'Find your level',
          description: 'Start at A1 or continue from your current level with clear placement guidance.',
          primaryAction: { href: '/placement-test' },
        },
        {
          key: 'working-professionals',
          icon: 'inCompany',
          title: 'Learn around work',
          description: 'Choose evening, professional, or company formats that fit your working week.',
          primaryAction: { href: '#course-evening-german' },
        },
        {
          key: 'exam-candidates',
          icon: 'exams',
          title: 'Prepare for a certificate',
          description: 'Connect your course plan with telc B2 or C1 Hochschule preparation.',
          primaryAction: { href: '#exam-preparation' },
        },
        {
          key: 'housing-onboarding',
          icon: 'accommodation',
          title: 'Arrive in Bremen',
          description: 'Plan your course start together with housing and practical arrival support.',
          primaryAction: { href: '#accommodation-support' },
        },
      ];
}

const personaAccentClasses: Record<PersonaKey, { bar: string; icon: string }> = {
  'new-learners': {
    bar: 'bg-[var(--casa-blue)]',
    icon: 'text-[var(--casa-accent-text)]',
  },
  'working-professionals': {
    bar: 'bg-[var(--casa-sun)]',
    icon: 'text-[var(--casa-ink)]',
  },
  'exam-candidates': {
    bar: 'bg-[var(--casa-red)]',
    icon: 'text-[var(--casa-red)]',
  },
  'housing-onboarding': {
    bar: 'bg-[var(--casa-ink-deep)]',
    icon: 'text-[var(--casa-ink-deep)]',
  },
};

function withPersonaContext(href: string, persona: PersonaKey) {
  if (href.startsWith('#')) {
    return href;
  }

  const [pathAndQuery, hashFragment] = href.split('#');
  const [path, query] = pathAndQuery.split('?');
  const params = new URLSearchParams(query ?? '');
  params.set('persona', persona);
  const nextHref = `${path}?${params.toString()}`;
  return hashFragment ? `${nextHref}#${hashFragment}` : nextHref;
}

export function PersonaPathways({ locale, presentation = 'default', className }: PersonaPathwaysProps) {
  const pathways = getPersonaData(locale);
  const actionLabel = locale === 'de' ? 'Diesen Weg wählen' : 'Choose this path';
  const isRail = presentation === 'rail';

  return (
    <div className={cn(!isRail && 'space-y-8 md:space-y-10', className)}>
      {isRail ? null : (
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Startpunkt wählen' : 'Start here'}
            </p>
            <h2 className="max-w-2xl text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">
              {locale === 'de' ? 'Wo starten Sie?' : "Choose where you're starting from"}
            </h2>
          </div>
          <span className="casa-tricolor-rule block h-1 w-28 rounded-full md:w-36" aria-hidden />
        </div>
      )}

      <div className={cn('grid gap-5', isRail ? 'sm:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4')}>
        {pathways.map((pathway) => {
          const Icon = iconMap[pathway.icon];
          const primaryHref = withPersonaContext(pathway.primaryAction.href, pathway.key);
          const accentClassName = personaAccentClasses[pathway.key];

          return (
            <article
              key={pathway.title}
              className="group relative flex min-h-[18.5rem] flex-col justify-between overflow-hidden rounded-xl bg-[var(--casa-warm-soft)]/35 p-6 shadow-[var(--shadow-modal)] ring-1 ring-[color:var(--casa-sand)] transition duration-300 hover:-translate-y-1 hover:ring-[color:var(--casa-blue)]/35 hover:shadow-[var(--shadow-hero)] md:p-7"
              data-casa-persona={pathway.key}
            >
              <span
                className={cn('absolute inset-x-0 top-0 h-1', accentClassName.bar)}
                aria-hidden
              />

              <div>
                <div
                  className={cn(
                    'inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]',
                    accentClassName.icon
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-7 text-2xl font-bold leading-tight text-[var(--casa-ink)]">
                  {pathway.title}
                </h3>
                {/*
                  The 18rem clamp is tuned to the 4-up card (289px interior). In
                  rail mode the card is ~465px wide, so the same clamp would
                  strand ~120px of empty card to the right of every description.
                */}
                <p className={cn('mt-3 text-base leading-relaxed text-[var(--casa-muted)]', isRail ? 'max-w-measure' : 'max-w-[18rem]')}>
                  {pathway.description}
                </p>
              </div>

              {/*
                Four identical full-width dark buttons used to sit here, one per
                pathway card, all reading "Choose this path". Four solid buttons
                in a row is not four calls to action — it is a row of grey-blue
                rectangles, and it made a chooser look like a pricing table.

                The card is the target now: the link's ::after covers it, so the
                whole tile is clickable, while the visible affordance is a text
                link. `relative` already sits on the <article>, and the icon and
                accent bar are unpositioned, so the overlay lands above the card
                background and below nothing that needs clicking.
              */}
              <div className="mt-8">
                {primaryHref.startsWith('#') ? (
                  <a
                    href={primaryHref}
                    aria-label={`${actionLabel}: ${pathway.title}`}
                    data-casa-track="true"
                    className="casa-cta-link group/cta inline-flex items-center gap-2.5 text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-[var(--casa-accent-text-hover)] hover:underline"
                  >
                    <span>{actionLabel}</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                      aria-hidden
                    />
                  </a>
                ) : (
                  <Link
                    href={primaryHref}
                    aria-label={`${actionLabel}: ${pathway.title}`}
                    data-casa-track="true"
                    className="casa-cta-link group/cta inline-flex items-center gap-2.5 text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-[var(--casa-accent-text-hover)] hover:underline"
                  >
                    <span>{actionLabel}</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                      aria-hidden
                    />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
