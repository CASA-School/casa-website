import type { ContentLocale, TeamSpotlight } from '@/lib/content/types';

import { StickyInfoCard, type StickyInfoItem } from './sticky-info-card';
import { DeadlineBadge } from './deadline-badge';
import { TeacherSpotlightCard } from './teacher-spotlight-card';

type DecisionRailProps = {
  locale: ContentLocale;
  infoTitle: string;
  infoItems: StickyInfoItem[];
  notes?: string;
  deadlineIso?: string | null;
  teacher?: TeamSpotlight | null;
};

export function DecisionRail({
  locale,
  infoTitle,
  infoItems,
  notes,
  deadlineIso,
  teacher,
}: DecisionRailProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      {/*
        No `ctas` here — deliberately.

        StickyInfoCard is mounted twice on /courses/[slug], /exams/[code] and
        /accommodation/[type]: once by HeroCUtilityRail in the hero and again by
        this rail in the body. Both were passed the same `ctas` array, so the
        identical primary and secondary buttons rendered two and sometimes three
        times per page — the single largest source of the site's button count.

        The hero mount keeps them, because that is where the decision is offered.
        This mount is a reference card the reader scrolls back to for dates and
        prices; it does not need to re-ask. `ctas` stays in the props so the
        prop shape is unchanged for any future non-hero consumer.
      */}
      <StickyInfoCard title={infoTitle} items={infoItems} notes={notes} className="lg:static" />

      <div className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {locale === 'de' ? 'Anmeldefrist' : 'Registration window'}
        </p>
        <div className="mt-2">
          <DeadlineBadge deadlineIso={deadlineIso} locale={locale} />
        </div>
      </div>

      {teacher ? (
        <TeacherSpotlightCard
          teacher={teacher}
          ctaLabel={locale === 'de' ? 'Mehr zum Team' : 'Meet the team'}
        />
      ) : null}
    </aside>
  );
}
