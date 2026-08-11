import type { ContentLocale, TeamSpotlight } from '@/lib/content/types';

import { StickyInfoCard, type StickyInfoItem } from './sticky-info-card';
import { DeadlineBadge } from './deadline-badge';
import { TeacherSpotlightCard } from './teacher-spotlight-card';

type DecisionRailProps = {
  locale: ContentLocale;
  infoTitle: string;
  infoItems: StickyInfoItem[];
  notes?: string;
  ctas: Array<{
    label: string;
    href: string;
    kind: 'primary' | 'secondary';
  }>;
  deadlineIso?: string | null;
  teacher?: TeamSpotlight | null;
};

export function DecisionRail({
  locale,
  infoTitle,
  infoItems,
  notes,
  ctas,
  deadlineIso,
  teacher,
}: DecisionRailProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <StickyInfoCard title={infoTitle} items={infoItems} notes={notes} ctas={ctas} className="lg:static" />

      <div className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
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
