import { Timeline, type TimelineItem } from '@/components/patterns/timeline';

type ExamDayTimelineSignatureProps = {
  title: string;
  description: string;
  timeline: TimelineItem[];
  bringItems: string[];
  /** Heading of the checklist. The page passes it per locale; it was English on every page. */
  bringTitle?: string;
};

export function ExamDayTimelineSignature({
  title,
  description,
  timeline,
  bringItems,
  bringTitle = 'What to bring',
}: ExamDayTimelineSignatureProps) {
  return (
    <section className="@container rounded-3xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6 md:p-7" data-testid="exam-timeline">
      <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
      <p className="mt-2 text-base text-[var(--casa-muted)] md:text-lg">{description}</p>

      {/* Side by side only where the card is wide; the checklist keeps its own height. */}
      <div className="mt-5 grid gap-5 @[44rem]:grid-cols-[1.08fr_0.92fr] @[44rem]:items-start">
        <Timeline items={timeline} />
        <aside className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-panel)] p-4" data-testid="exam-what-to-bring">
          <h3 className="text-base font-bold text-[var(--casa-ink)]">{bringTitle}</h3>
          <ul className="mt-3 space-y-2">
            {bringItems.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[var(--casa-accent-surface)]" aria-hidden />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
