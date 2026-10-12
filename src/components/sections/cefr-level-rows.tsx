import { levelTokens } from '@/config/brand/tokens';
import { CEFR_BANDS, CEFR_LEVELS } from '@/config/content/cefr-levels';
import { getCoursePath } from '@/lib/content/course-routes';
import type { ContentLocale } from '@/lib/content/types';
import { pick, say } from '@/lib/cms/copy';
import { cn } from '@/lib/utils';
import { MediaFrame } from '@/components/ui/media-frame';
import { TextCta } from '@/components/ui/text-cta';

/**
 * Each level in full, on the levels page: the old casa-bremen.de page's picture
 * and text, with what CASA adds — the textbook, the time a level takes in the
 * intensive course, and the courses that teach it. Photograph and text
 * alternate sides from `lg`; stacked, the text comes first and the picture
 * follows, the same on every level (see CourseFormatRows).
 */
export function CefrLevelRows({ locale }: { locale: ContentLocale }) {
  return (
    <div className="space-y-16 md:space-y-24">
      {CEFR_LEVELS.map((level, index) => {
        const band = pick(locale, CEFR_BANDS[level.band]);
        const textbook = level.textbook === 'netzwerk' ? 'Netzwerk neu' : 'Kontext';
        return (
          <article
            key={level.id}
            id={level.anchor}
            aria-labelledby={`level-${level.anchor}`}
            className="grid scroll-mt-28 gap-8 md:scroll-mt-32 lg:grid-cols-2 lg:items-center lg:gap-14"
          >
            <div className={cn('min-w-0', index % 2 === 1 && 'lg:order-2')}>
              <h2 id={`level-${level.anchor}`} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  className="inline-flex h-12 min-w-14 items-center justify-center rounded-xl px-3 font-sans text-xl font-bold leading-none"
                  style={{ background: levelTokens[level.id].surface, color: levelTokens[level.id].ink }}
                >
                  {level.label}
                </span>
                <span className="text-2xl font-bold leading-tight text-[var(--casa-ink)] md:text-3xl">{band}</span>
              </h2>
              {level.isBridge ? (
                <p className="mt-3 text-sm font-semibold text-[var(--casa-accent-text)]">
                  {say(locale, 'Zwischenstufe im Intensivkurs, zwischen B1 und B2', 'An in-between step of the intensive course, between B1 and B2')}
                </p>
              ) : null}
              <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{pick(locale, level.description)}</p>

              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-[color:var(--casa-sand)] pt-5 text-sm">
                <div>
                  <dt className="text-[var(--casa-muted)]">{say(locale, 'Lehrwerk', 'Textbook')}</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--casa-ink)]">{textbook}</dd>
                </div>
                <div>
                  <dt className="text-[var(--casa-muted)]">{say(locale, 'Im Intensivkurs', 'On the intensive course')}</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--casa-ink)]">{say(locale, '{weeks} Wochen', '{weeks} weeks', { weeks: level.weeks })}</dd>
                </div>
              </dl>

              <div className="mt-6">
                {level.isBridge ? (
                  <TextCta href={getCoursePath('intensive-german')}>{say(locale, 'Zum Intensivkurs', 'See the intensive course')}</TextCta>
                ) : (
                  <TextCta href={`/courses?level=${encodeURIComponent(level.label)}#formats`}>
                    {say(locale, 'Kurse für {step} ansehen', 'See courses for {step}', { step: level.label })}
                  </TextCta>
                )}
              </div>
            </div>

            <figure className={cn('aspect-[3/2] min-w-0', index % 2 === 1 && 'lg:order-1')}>
              <MediaFrame
                src={level.photo.src}
                alt={pick(locale, level.photo.alt)}
                sizes="(min-width: 1440px) 640px, (min-width: 1024px) 46vw, calc(100vw - 40px)"
                className="h-full w-full"
              />
            </figure>
          </article>
        );
      })}
    </div>
  );
}
