import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';

export type ExamOption = {
  /** `b2` or `c1`: the old /exams#b2 and #c1 links land on the card. */
  anchorId: string;
  level: string;
  name: string;
  summary: string;
  href: string;
  facts: Array<{ label: string; value: string; note?: string }>;
};

type ExamOptionCardsProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: ExamOption[];
  linkLabel: string;
};

/*
 * THE EXAMS, SIDE BY SIDE (2026-10-07). Each card answers what a candidate
 * compares: what the exam is for, what it and its preparation cost, and when
 * the next sitting is. The photo cards before it gave half their height to a
 * picture and put the fees in a chip on top of it, and the C1 card carried
 * the old site's whole description and ran far taller than the B2 one. A card
 * holds the short `summary`; the exam's own page says the rest.
 */
export function ExamOptionCards({ eyebrow, title, description, items, linkLabel }: ExamOptionCardsProps) {
  return (
    <div>
      <div className="max-w-[46rem]">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
        <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
        <h2 className="mt-2 text-balance text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
      </div>

      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {items.map((item) => {
          const level = levelKeyFromLabel(item.level);

          return (
            <li key={item.anchorId} id={item.anchorId} className="scroll-mt-28">
              {/* One link, stretched over the card, so the card reads as one item. */}
              <article className="group relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] transition-shadow hover:shadow-[var(--shadow-card)] md:p-8">
                <div className="flex items-center gap-4">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-bold"
                    style={level ? { background: levelTokens[level].surface, color: levelTokens[level].ink } : undefined}
                    aria-hidden
                  >
                    {item.level}
                  </span>
                  <h3 className="min-w-0 text-xl font-bold leading-snug text-[var(--casa-ink)] md:text-2xl">
                    <Link href={item.href} className="after:absolute after:inset-0 after:rounded-2xl">
                      {item.name}
                    </Link>
                  </h3>
                </div>
                <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)]">{item.summary}</p>

                <dl className="mt-6 border-t border-[color:var(--casa-sand)]">
                  {item.facts.map((fact) => (
                    <div key={fact.label} className="flex items-baseline justify-between gap-6 border-b border-[color:var(--casa-sand)] py-3">
                      <dt className="text-sm text-[var(--casa-muted)]">{fact.label}</dt>
                      <dd className="text-right text-sm font-semibold text-[var(--casa-ink)]">
                        {fact.value}
                        {fact.note ? <span className="block text-xs font-normal text-[var(--casa-muted)]">{fact.note}</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-[var(--casa-accent-text)]" aria-hidden>
                  {linkLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
