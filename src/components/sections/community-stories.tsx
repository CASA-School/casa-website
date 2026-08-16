import { cn } from '@/lib/utils';

export type CommunityStory = {
  id: string;
  quote: string;
  person: string;
  context: string;
  photo: {
    src: string;
    alt: string;
    caption: string;
  };
  href?: string;
};

type CommunityStoriesProps = {
  eyebrow: string;
  title: string;
  description: string;
  stories: CommunityStory[];
  className?: string;
};

export function CommunityStories({ eyebrow, title, description, stories, className }: CommunityStoriesProps) {
  return (
    <section className={cn('space-y-5', className)}>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
      <p className="max-w-measure text-sm leading-relaxed text-[var(--casa-muted)] md:text-base">{description}</p>

      <ul className="grid gap-5 md:grid-cols-3">
        {stories.slice(0, 3).map((story) => (
          <li key={story.id}>
            <article className="h-full overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70">
              <figure>
                <div
                  role="img"
                  aria-label={story.photo.alt}
                  className="h-44 bg-cover bg-center"
                  style={{ backgroundImage: `url('${story.photo.src}')` }}
                />
              </figure>
              <div className="space-y-3 p-5">
                <p className="text-sm leading-relaxed text-[var(--casa-ink)]">&quot;{story.quote}&quot;</p>
                <p className="text-xs font-semibold text-[var(--casa-muted)]">
                  {story.person} - {story.context}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
