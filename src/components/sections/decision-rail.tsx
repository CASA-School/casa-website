import type { ContentLocale } from '@/lib/content/types';

import { StickyInfoCard, type StickyInfoItem } from './sticky-info-card';
import { DeadlineBadge } from './deadline-badge';
import { TeachingStaffCard } from './teaching-staff-card';

type DecisionRailProps = {
  locale: ContentLocale;
  infoTitle: string;
  infoItems: StickyInfoItem[];
  notes?: string;
  deadlineIso?: string | null;
  /**
   * The collective statement about CASA's teachers. This used to be a
   * `TeamSpotlight` rendering one named person with a portrait — invented, and on
   * every course page. See components/sections/teaching-staff-card.
   */
  teachingStaff?: { title: string; body: string } | null;
};

export function DecisionRail({
  locale,
  infoTitle,
  infoItems,
  notes,
  deadlineIso,
  teachingStaff,
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
      {/*
        ONE card, divided — not three stacked ones.

        The rail rendered three separate elevated boxes (facts, registration
        window, teaching staff) at three different radii and two different
        shadows, and then several hundred pixels of empty gutter beneath them,
        because the body column is much taller. Three small boxes in a column
        read as three unrelated widgets; they are one reference card the reader
        scrolls back to. Divided rows hold the same structure with one edge
        instead of three.
      */}
      <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70">
        <StickyInfoCard title={infoTitle} items={infoItems} notes={notes} unstyled />

        <div className="border-t border-[color:var(--casa-sand)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            {locale === 'de' ? 'Anmeldefrist' : 'Registration window'}
          </p>
          <div className="mt-2">
            <DeadlineBadge deadlineIso={deadlineIso} locale={locale} />
          </div>
        </div>

        {teachingStaff ? (
          <div className="border-t border-[color:var(--casa-sand)] px-6 py-5">
            <TeachingStaffCard
              title={teachingStaff.title}
              body={teachingStaff.body}
              ctaLabel={locale === 'de' ? 'Mehr zum Team' : 'Meet the team'}
              unstyled
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
