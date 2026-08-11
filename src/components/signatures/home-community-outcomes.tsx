'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

type StoryItem = {
  id: string;
  quote: string;
  person: string;
  context: string;
  photo: {
    src: string;
    alt: string;
    caption?: string;
  };
};

type HomeCommunityOutcomesProps = {
  title: string;
  description: string;
  stories: StoryItem[];
  outcomes: string[];
};

export function HomeCommunityOutcomes({ title, description, stories, outcomes }: HomeCommunityOutcomesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeStories = useMemo(() => stories.slice(0, 4), [stories]);
  const active = safeStories[activeIndex] ?? safeStories[0];

  if (!active) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:p-7">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">Signature</p>
      <h2 className="mt-2 text-3xl font-black text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)] md:text-base">{description}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-xl bg-[var(--casa-bg)] p-3">
          <figure className="overflow-hidden rounded-xl">
            <div
              role="img"
              aria-label={active.photo.alt}
              className="h-56 rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url('${active.photo.src}')` }}
            />
          </figure>

          <p className="mt-3 text-sm leading-relaxed text-[var(--casa-ink)]">&quot;{active.quote}&quot;</p>
          <p className="mt-2 text-xs font-semibold text-[var(--casa-muted)]">
            {active.person} - {active.context}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {safeStories.map((story, index) => (
              <Button
                key={story.id}
                type="button"
                variant={index === activeIndex ? 'default' : 'outline'}
                onClick={() => setActiveIndex(index)}
                className={
                  index === activeIndex
                    ? 'h-7 bg-[var(--casa-ink-deep)] px-3 text-xs text-white hover:bg-[var(--casa-ink-deep-hover)]'
                    : 'h-7 border-[color:var(--casa-sand)] px-3 text-xs text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]'
                }
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </article>

        <aside className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/36 p-5">
          <h3 className="text-xl font-black text-[var(--casa-ink)]">Outcomes learners mention most</h3>
          <ul className="mt-4 space-y-2">
            {outcomes.slice(0, 5).map((outcome) => (
              <li key={outcome} className="flex gap-2 text-sm text-[var(--casa-ink)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
