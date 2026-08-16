import { Timeline, type TimelineItem } from '@/components/patterns/timeline';

type AboutMilestonesProps = {
  title: string;
  description: string;
  milestones: TimelineItem[];
};

export function AboutMilestones({ title, description, milestones }: AboutMilestonesProps) {
  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7">
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">Signature</p>
      <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--casa-muted)] md:text-base">{description}</p>
      <Timeline items={milestones} className="mt-5" />
    </section>
  );
}
