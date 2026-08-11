import { Timeline, type TimelineItem } from '@/components/patterns/timeline';

type ExamDayTimelineSignatureProps = {
  title: string;
  description: string;
  timeline: TimelineItem[];
  bringItems: string[];
};

export function ExamDayTimelineSignature({
  title,
  description,
  timeline,
  bringItems,
}: ExamDayTimelineSignatureProps) {
  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7" data-testid="exam-timeline">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">Signature</p>
      <h2 className="mt-2 text-3xl font-black text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-base text-[var(--casa-muted)] md:text-lg">{description}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <Timeline items={timeline} />
        <aside className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/34 p-4" data-testid="exam-what-to-bring">
          <h3 className="text-base font-bold text-[var(--casa-ink)]">What to bring</h3>
          <ul className="mt-2 space-y-2">
            {bringItems.map((item) => (
              <li key={item} className="text-base text-[var(--casa-ink)]">
                - {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
